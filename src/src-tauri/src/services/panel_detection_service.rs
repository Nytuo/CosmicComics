use image::{imageops::FilterType, GenericImageView, Pixel};
use ndarray::{Array, ArrayView, Axis};
use ort::session::{builder::GraphOptimizationLevel, Session};
use ort::value::Tensor;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};
use tracing::info;

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

static MODEL_SESSION: OnceLock<Mutex<Session>> = OnceLock::new();

lazy_static::lazy_static! {
    static ref PANEL_CACHE: Mutex<HashMap<String, Vec<PanelRect>>> = Mutex::new(HashMap::new());
}

pub fn init_model(model_path: &str) -> Result<(), Box<dyn std::error::Error>> {
    let model = Session::builder()?
        .with_optimization_level(GraphOptimizationLevel::Level3)?
        .with_intra_threads(4)?
        .commit_from_file(model_path)?;

    MODEL_SESSION
        .set(Mutex::new(model))
        .map_err(|_| "Model already initialized")?;

    info!("YOLO Comic Model initialized successfully.");
    Ok(())
}

pub fn detect_panels(
    image_bytes: &[u8],
    reading_direction: ReadingDirection,
) -> Result<Vec<PanelRect>, String> {
    let mutex = MODEL_SESSION
        .get()
        .ok_or("Model not initialized. Call init_model first.")?;

    let mut session = mutex.lock().map_err(|e| e.to_string())?;

    let img =
        image::load_from_memory(image_bytes).map_err(|e| format!("Image load error: {}", e))?;
    let (orig_w, orig_h) = img.dimensions();

    let model_w = 640;
    let model_h = 640;
    let resized = img.resize_exact(model_w, model_h, FilterType::CatmullRom);

    let mut input_tensor = Array::zeros((1, 3, model_h as usize, model_w as usize));
    for (x, y, pixel) in resized.pixels() {
        let rgb = pixel.to_rgb();
        input_tensor[[0, 0, y as usize, x as usize]] = rgb[0] as f32 / 255.0;
        input_tensor[[0, 1, y as usize, x as usize]] = rgb[1] as f32 / 255.0;
        input_tensor[[0, 2, y as usize, x as usize]] = rgb[2] as f32 / 255.0;
    }

    let shape = vec![1, 3, model_h as i64, model_w as i64];
    let data = input_tensor.into_raw_vec();

    let input_value = Tensor::from_array((shape, data))
        .map_err(|e| format!("Failed to create input tensor: {}", e))?;

    let inputs = ort::inputs!["images" => input_value];
    let outputs = session
        .run(inputs)
        .map_err(|e| format!("Inference failed: {}", e))?;

    let (output_shape, output_data) = outputs["output0"]
        .try_extract_tensor::<f32>()
        .map_err(|e| format!("Extraction failed: {}", e))?;

    let shape: Vec<usize> = output_shape.iter().map(|&x| x as usize).collect();
    let output_view = ArrayView::from_shape(shape, output_data)
        .map_err(|e| format!("Failed to create output view: {}", e))?;

    let mut panels = post_process_yolo(output_view.into_dyn(), orig_w, orig_h, model_w, model_h);

    sort_panels(&mut panels, reading_direction);

    Ok(panels)
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
