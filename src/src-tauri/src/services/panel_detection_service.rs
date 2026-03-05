use image::{imageops::FilterType, GenericImageView, Pixel};
use ndarray::{ArrayView, Axis};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};
use tracing::info;

#[cfg(feature = "ai")]
use candle_core::{Device, Tensor};
#[cfg(feature = "ai")]
use candle_onnx::onnx::ModelProto;

const FRAME_CLASS_INDEX: usize = 2;
const CONFIDENCE_THRESHOLD: f32 = 0.45;
const NMS_THRESHOLD: f32 = 0.60;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PanelRect {
    pub x: u32,
    pub y: u32,
    pub w: u32,
    pub h: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
pub enum ReadingDirection {
    LTR,
    RTL,
}

#[cfg(feature = "ai")]
struct ComputeModel {
    proto: ModelProto,

    initializers: HashMap<String, Tensor>,
    device: Device,
}

#[cfg(feature = "ai")]
static MODEL: OnceLock<Mutex<ComputeModel>> = OnceLock::new();

lazy_static::lazy_static! {
    static ref PANEL_CACHE: Mutex<HashMap<String, Vec<PanelRect>>> = Mutex::new(HashMap::new());
}

#[cfg(feature = "ai")]
fn eval_graph(
    model: &ComputeModel,
    initial_inputs: std::collections::HashMap<String, Tensor>,
) -> candle_core::Result<std::collections::HashMap<String, Tensor>> {
    use candle_onnx::onnx::NodeProto;

    let graph = model
        .proto
        .graph
        .as_ref()
        .ok_or_else(|| candle_core::Error::Msg("model has no graph".to_string()))?;
    let device = &model.device;

    let mut values: std::collections::HashMap<String, Tensor> = model.initializers.clone();
    values.extend(initial_inputs);

    fn run_one(
        node: &NodeProto,
        values: &mut std::collections::HashMap<String, Tensor>,
        device: &candle_core::Device,
    ) -> candle_core::Result<()> {
        use candle_onnx::onnx::{GraphProto, ValueInfoProto};

        let mut node_inputs: std::collections::HashMap<String, Tensor> =
            std::collections::HashMap::new();
        for input_name in &node.input {
            if input_name.is_empty() {
                continue;
            }
            if let Some(t) = values.get(input_name) {
                node_inputs.insert(input_name.clone(), t.clone());
            }
        }

        let outputs: Vec<ValueInfoProto> = node
            .output
            .iter()
            .filter(|s| !s.is_empty())
            .map(|s| ValueInfoProto {
                name: s.clone(),
                ..ValueInfoProto::default()
            })
            .collect();

        let sub_model = ModelProto {
            graph: Some(GraphProto {
                node: vec![node.clone()],
                initializer: vec![],
                input: vec![],
                output: outputs,
                ..GraphProto::default()
            }),
            ..ModelProto::default()
        };

        let result = candle_onnx::simple_eval(&sub_model, node_inputs).map_err(|e| {
            let shapes: Vec<String> = node
                .input
                .iter()
                .filter(|n| !n.is_empty())
                .map(|n| match values.get(n) {
                    Some(t) => format!("{}:{:?}", n, t.dims()),
                    None => format!("{}:MISSING", n),
                })
                .collect();
            candle_core::Error::Msg(format!(
                "{} (op={}, name={}, inputs=[{}])",
                e,
                node.op_type,
                node.name,
                shapes.join(", ")
            ))
        })?;

        for (name, tensor) in result {
            let tensor = tensor.to_device(device)?;
            values.insert(name, tensor);
        }
        Ok(())
    }

    for node in &graph.node {
        match node.op_type.as_str() {
            "ConstantOfShape" => {
                let shape_tensor = values
                    .get(&node.input[0])
                    .ok_or_else(|| {
                        candle_core::Error::Msg(format!(
                            "ConstantOfShape: shape input '{}' not in values",
                            node.input[0]
                        ))
                    })?
                    .clone();

                let dims: Vec<usize> = shape_tensor
                    .to_device(&candle_core::Device::Cpu)?
                    .to_dtype(candle_core::DType::I64)?
                    .to_vec1::<i64>()?
                    .into_iter()
                    .map(|v| v as usize)
                    .collect();

                let fill_value_attr = node.attribute.iter().find(|a| a.name == "value");
                let output = if let Some(attr) = fill_value_attr {
                    if let Some(t) = &attr.t {
                        let fill = candle_onnx::eval::get_tensor(t, "value")?;
                        let scalar = fill.flatten_all()?.get(0)?;
                        candle_core::Tensor::full(
                            scalar.to_scalar::<f32>()?,
                            dims.as_slice(),
                            device,
                        )?
                    } else {
                        candle_core::Tensor::zeros(
                            dims.as_slice(),
                            candle_core::DType::F32,
                            device,
                        )?
                    }
                } else {
                    candle_core::Tensor::zeros(dims.as_slice(), candle_core::DType::F32, device)?
                };

                let output_name = node.output.first().ok_or_else(|| {
                    candle_core::Error::Msg("ConstantOfShape has no output".to_string())
                })?;
                values.insert(output_name.clone(), output.to_device(device)?);
            }

            "MaxPool" => {
                let pads_attr = node.attribute.iter().find(|a| a.name == "pads");
                let pads: Option<Vec<i64>> = pads_attr.map(|a| a.ints.clone());
                let needs_pad = pads
                    .as_ref()
                    .map(|p| p.iter().any(|&v| v != 0))
                    .unwrap_or(false);

                if needs_pad {
                    let pads = pads.unwrap();
                    let input_name = &node.input[0];
                    let base = values
                        .get(input_name)
                        .ok_or_else(|| {
                            candle_core::Error::Msg(format!(
                                "MaxPool input '{}' not in values",
                                input_name
                            ))
                        })?
                        .clone();

                    let padded = base
                        .pad_with_zeros(2, pads[0] as usize, pads[2] as usize)?
                        .pad_with_zeros(3, pads[1] as usize, pads[3] as usize)?;

                    let padded_name = format!("__padded_{}", input_name);
                    values.insert(padded_name.clone(), padded);

                    let mut stripped = node.clone();
                    stripped.input[0] = padded_name;
                    stripped.attribute.retain(|a| a.name != "pads");
                    run_one(&stripped, &mut values, device)?;
                } else {
                    run_one(node, &mut values, device)?
                }
            }

            "Resize" => {
                let data_name = &node.input[0];
                let data = values
                    .get(data_name)
                    .ok_or_else(|| {
                        candle_core::Error::Msg(format!(
                            "Resize input '{}' not in values",
                            data_name
                        ))
                    })?
                    .clone();

                let scale_or_size_name = node.input.iter().skip(1).find(|s| !s.is_empty());

                let (out_h, out_w) = if let Some(name) = scale_or_size_name {
                    let t = values
                        .get(name.as_str())
                        .ok_or_else(|| {
                            candle_core::Error::Msg(format!(
                                "Resize scales/sizes tensor '{}' not in values",
                                name
                            ))
                        })?
                        .clone();

                    match t.dtype() {
                        candle_core::DType::I64 => {
                            let s = t.to_device(&candle_core::Device::Cpu)?.to_vec1::<i64>()?;
                            (s[2] as usize, s[3] as usize)
                        }
                        _ => {
                            let s = t
                                .to_device(&candle_core::Device::Cpu)?
                                .to_dtype(candle_core::DType::F32)?
                                .to_vec1::<f32>()?;
                            let (_, _, in_h, in_w) = data.dims4()?;
                            (
                                (in_h as f32 * s[2]).round() as usize,
                                (in_w as f32 * s[3]).round() as usize,
                            )
                        }
                    }
                } else {
                    return Err(candle_core::Error::Msg(
                        "Resize node has no scale/size input".to_string(),
                    ));
                };

                let output_name = node.output.first().ok_or_else(|| {
                    candle_core::Error::Msg("Resize node has no output".to_string())
                })?;
                let upsampled = data.upsample_nearest2d(out_h, out_w)?;
                values.insert(output_name.clone(), upsampled.to_device(device)?);
            }

            _ => {
                run_one(node, &mut values, device)?;
            }
        }
    }

    graph
        .output
        .iter()
        .map(|o| {
            values
                .remove(&o.name)
                .map(|t| (o.name.clone(), t))
                .ok_or_else(|| {
                    candle_core::Error::Msg(format!("graph output '{}' not produced", o.name))
                })
        })
        .collect()
}

#[cfg(feature = "ai")]
pub fn init_model(model_path: &str) -> Result<(), Box<dyn std::error::Error>> {
    let proto = candle_onnx::read_file(model_path)?;

    #[cfg(target_os = "macos")]
    let device = Device::new_metal(0).unwrap_or_else(|_| {
        info!("Metal unavailable, falling back to CPU.");
        Device::Cpu
    });

    #[cfg(all(not(target_os = "macos"), feature = "cuda"))]
    let device = if candle_core::utils::cuda_is_available() {
        Device::new_cuda(0).unwrap_or_else(|_| {
            info!("CUDA device init failed, falling back to CPU.");
            Device::Cpu
        })
    } else {
        info!("CUDA not available, falling back to CPU.");
        Device::Cpu
    };

    #[cfg(all(not(target_os = "macos"), not(feature = "cuda")))]
    let device = Device::Cpu;

    info!("Candle device: {:?}", device);

    let mut initializers: HashMap<String, Tensor> = HashMap::new();
    if let Some(graph) = &proto.graph {
        for init in &graph.initializer {
            match candle_onnx::eval::get_tensor(init, &init.name) {
                Ok(t) => {
                    let t = t.to_device(&device).unwrap_or(t);
                    initializers.insert(init.name.clone(), t);
                }
                Err(e) => {
                    info!("Warning: could not load initializer '{}': {}", init.name, e);
                }
            }
        }
    }
    info!("Loaded {} initializer tensors.", initializers.len());

    MODEL
        .set(Mutex::new(ComputeModel {
            proto,
            initializers,
            device,
        }))
        .map_err(|_| "Model already initialized")?;

    info!("YOLO Comic Model initialized successfully (Candle backend).");
    Ok(())
}

#[cfg(not(feature = "ai"))]
pub fn init_model(_model_path: &str) -> Result<(), Box<dyn std::error::Error>> {
    Err("AI support disabled at compile time (feature \"ai\").".into())
}

#[cfg(feature = "ai")]
pub fn detect_panels(
    image_bytes: &[u8],
    reading_direction: ReadingDirection,
) -> Result<Vec<PanelRect>, String> {
    let mutex = MODEL
        .get()
        .ok_or("Model not initialized. Call init_model first.")?;

    let m = mutex.lock().map_err(|e| e.to_string())?;

    let img =
        image::load_from_memory(image_bytes).map_err(|e| format!("Image load error: {}", e))?;
    let (orig_w, orig_h) = img.dimensions();

    let model_w: u32 = 640;
    let model_h: u32 = 640;
    let resized = img.resize_exact(model_w, model_h, FilterType::CatmullRom);

    let hw = (model_h * model_w) as usize;
    let mut data = vec![0f32; 3 * hw];
    for (x, y, pixel) in resized.pixels() {
        let idx = y as usize * model_w as usize + x as usize;
        let rgb = pixel.to_rgb();
        data[idx] = rgb[0] as f32 * (1.0 / 255.0);
        data[hw + idx] = rgb[1] as f32 * (1.0 / 255.0);
        data[2 * hw + idx] = rgb[2] as f32 * (1.0 / 255.0);
    }

    let input_tensor = Tensor::from_vec(
        data,
        &[1usize, 3, model_h as usize, model_w as usize],
        &m.device,
    )
    .map_err(|e| format!("Failed to create input tensor: {}", e))?;

    let graph = m.proto.graph.as_ref().ok_or("ONNX model has no graph")?;
    let input_name = graph
        .input
        .first()
        .ok_or("ONNX model has no input nodes")?
        .name
        .clone();

    let mut inputs = std::collections::HashMap::new();
    inputs.insert(input_name, input_tensor);

    let outputs = eval_graph(&m, inputs).map_err(|e| format!("Inference failed: {}", e))?;

    let output_name = graph
        .output
        .first()
        .ok_or("ONNX model has no output nodes")?
        .name
        .clone();

    let output_tensor = outputs
        .get(&output_name)
        .ok_or_else(|| format!("Output '{}' not found in model results", output_name))?;

    let output_tensor = output_tensor
        .to_device(&Device::Cpu)
        .map_err(|e| format!("Failed to move output to CPU: {}", e))?;
    let output_shape: Vec<usize> = output_tensor.dims().to_vec();
    let output_data = output_tensor
        .flatten_all()
        .map_err(|e| format!("Failed to flatten output: {}", e))?
        .to_vec1::<f32>()
        .map_err(|e| format!("Failed to extract output data: {}", e))?;

    let output_view = ArrayView::from_shape(output_shape.as_slice(), output_data.as_slice())
        .map_err(|e| format!("Failed to create output view: {}", e))?;

    let mut panels = post_process_yolo(output_view.into_dyn(), orig_w, orig_h, model_w, model_h);

    sort_panels(&mut panels, reading_direction);

    Ok(panels)
}

#[cfg(not(feature = "ai"))]
pub fn detect_panels(
    _image_bytes: &[u8],
    _reading_direction: ReadingDirection,
) -> Result<Vec<PanelRect>, String> {
    Err("AI support disabled at compile time (feature \"ai\").".to_string())
}

struct Detection {
    x: f32,
    y: f32,
    w: f32,
    h: f32,
    score: f32,
}

fn post_process_yolo(
    output: ndarray::ArrayViewD<f32>,
    orig_w: u32,
    orig_h: u32,
    model_w: u32,
    model_h: u32,
) -> Vec<PanelRect> {
    let predictions = output.index_axis(Axis(0), 0);
    let rows = predictions.shape()[1];

    let mut candidates: Vec<Detection> = Vec::with_capacity(rows);

    for i in 0..rows {
        let score = predictions[[4 + FRAME_CLASS_INDEX, i]];

        if score >= CONFIDENCE_THRESHOLD && score.is_finite() {
            let cx = predictions[[0, i]];
            let cy = predictions[[1, i]];
            let w = predictions[[2, i]];
            let h = predictions[[3, i]];

            let x = cx - (w / 2.0);
            let y = cy - (h / 2.0);

            if x.is_finite() && y.is_finite() && w.is_finite() && h.is_finite() {
                candidates.push(Detection { x, y, w, h, score });
            }
        }
    }

    let final_detections = nms(candidates, NMS_THRESHOLD);

    let scale_x = orig_w as f32 / model_w as f32;
    let scale_y = orig_h as f32 / model_h as f32;

    final_detections
        .into_iter()
        .filter_map(|d| {
            let fx = d.x * scale_x;
            let fy = d.y * scale_y;
            let fw = d.w * scale_x;
            let fh = d.h * scale_y;

            if !fx.is_finite() || !fy.is_finite() || !fw.is_finite() || !fh.is_finite() {
                return None;
            }

            let final_x = fx.clamp(0.0, orig_w as f32);
            let final_y = fy.clamp(0.0, orig_h as f32);
            let final_w = fw.clamp(0.0, (orig_w as f32) - final_x);
            let final_h = fh.clamp(0.0, (orig_h as f32) - final_y);

            if final_w < 10.0 || final_h < 10.0 {
                return None;
            }

            Some(PanelRect {
                x: final_x as u32,
                y: final_y as u32,
                w: final_w as u32,
                h: final_h as u32,
            })
        })
        .collect()
}

fn nms(mut detections: Vec<Detection>, iou_thresh: f32) -> Vec<Detection> {
    if detections.is_empty() {
        return Vec::new();
    }

    detections.sort_by_key(|d| std::cmp::Reverse(d.score.to_bits()));

    let mut kept: Vec<Detection> = Vec::new();
    let mut is_suppressed = vec![false; detections.len()];

    for i in 0..detections.len() {
        if is_suppressed[i] {
            continue;
        }

        let current = &detections[i];

        kept.push(Detection {
            x: current.x,
            y: current.y,
            w: current.w,
            h: current.h,
            score: current.score,
        });

        for j in (i + 1)..detections.len() {
            if is_suppressed[j] {
                continue;
            }

            let other = &detections[j];
            if iou(current, other) > iou_thresh {
                is_suppressed[j] = true;
            }
        }
    }

    kept
}

fn iou(a: &Detection, b: &Detection) -> f32 {
    let x1 = a.x.max(b.x);
    let y1 = a.y.max(b.y);
    let x2 = (a.x + a.w).min(b.x + b.w);
    let y2 = (a.y + a.h).min(b.y + b.h);

    let w = (x2 - x1).max(0.0);
    let h = (y2 - y1).max(0.0);
    let intersection = w * h;

    let area_a = a.w * a.h;
    let area_b = b.w * b.h;
    let union = area_a + area_b - intersection;

    if union == 0.0 {
        0.0
    } else {
        intersection / union
    }
}

fn sort_panels(panels: &mut Vec<PanelRect>, direction: ReadingDirection) {
    panels.sort_by(|a, b| {
        let center_a = a.y + a.h / 2;
        let center_b = b.y + b.h / 2;
        let tolerance = (a.h.max(b.h) as f32 * 0.3) as u32;

        if (center_a as i64 - center_b as i64).abs() < tolerance as i64 {
            match direction {
                ReadingDirection::LTR => a.x.cmp(&b.x),
                ReadingDirection::RTL => b.x.cmp(&a.x),
            }
        } else {
            a.y.cmp(&b.y)
        }
    });
}

pub fn get_cached(key: &str) -> Option<Vec<PanelRect>> {
    PANEL_CACHE.lock().ok()?.get(key).cloned()
}

pub fn set_cached(key: &str, panels: &[PanelRect]) {
    if let Ok(mut cache) = PANEL_CACHE.lock() {
        cache.insert(key.to_string(), panels.to_vec());
    }
}

pub fn clear_cache() {
    if let Ok(mut cache) = PANEL_CACHE.lock() {
        cache.clear();
    }
}
