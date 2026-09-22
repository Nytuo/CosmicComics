//! Tauri side of device sync: the HTTP endpoint other devices talk to, mDNS
//! announcement and discovery, and the commands behind the sync dialog.
//! Everything runs only while the dialog is open (`sync_start` / `sync_stop`).

use crate::commands::state::AppState;
use crate::repositories::surreal_repo::SurrealRepo;
use crate::services::sync_service::{
    self as sync, FrameReader, Key, Manifest, MergeReport, Peer, RemoteBook, SyncStore, API_PREFIX,
    FILE_CHUNK, PAIR_IDENTITY, SERVICE_TYPE,
};
use axum::body::{Body, Bytes};
use axum::extract::{Path as AxPath, State as AxState};
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use base64::engine::general_purpose::STANDARD as B64;
use base64::Engine;
use futures::StreamExt;
use mdns_sd::{ServiceDaemon, ServiceEvent, ServiceInfo};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use spake2::{Ed25519Group, Identity, Password, Spake2};
use std::collections::HashMap;
use std::net::{IpAddr, SocketAddr};
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::io::AsyncReadExt;
use tokio::io::AsyncWriteExt;
use tokio::sync::{oneshot, Mutex};
use tracing::{info, warn};

const MAX_PAIR_FAILURES_PER_PIN: u32 = 5;
const MAX_PAIR_FAILURES: u32 = 20;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DeviceInfo {
    pub id: String,
    pub name: String,
    pub platform: String,
    pub version: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct SyncStatus {
    pub device: DeviceInfo,
    pub pin: String,
    pub port: u16,
    pub addresses: Vec<String>,
    /// The device is announced on the network (mDNS may be unavailable, for
    /// instance on iOS, where the address must be typed on the other device).
    pub discoverable: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct PeerView {
    pub id: String,
    pub name: String,
    pub platform: String,
    pub paired: bool,
    pub online: bool,
    pub addresses: Vec<String>,
    pub last_sync: Option<i64>,
}

#[derive(Debug, Clone)]
struct Discovered {
    info: DeviceInfo,
    fullname: Option<String>,
    addresses: Vec<String>,
}

type RepoFuture = futures::future::BoxFuture<'static, Result<SurrealRepo, String>>;

/// What the HTTP endpoint needs from the app, so it can also run in tests.
#[derive(Clone)]
struct Hooks {
    repo: Arc<dyn Fn() -> RepoFuture + Send + Sync>,
    emit: Arc<dyn Fn(&str, serde_json::Value) + Send + Sync>,
    credentials_changed: Arc<dyn Fn() -> futures::future::BoxFuture<'static, ()> + Send + Sync>,
}

impl Hooks {
    fn for_app(app: &AppHandle) -> Self {
        let (repo_app, emit_app, creds_app) = (app.clone(), app.clone(), app.clone());
        Self {
            repo: Arc::new(move || {
                let app = repo_app.clone();
                Box::pin(async move { repo_of(&app).await })
            }),
            emit: Arc::new(move |event, payload| {
                let _ = emit_app.emit(event, payload);
            }),
            credentials_changed: Arc::new(move || {
                let app = creds_app.clone();
                Box::pin(async move {
                    let state = app.state::<AppState>();
                    let _ = crate::commands::settings::load_credentials_into_state(&state).await;
                })
            }),
        }
    }
}

struct ServerCtx {
    hooks: Hooks,
    base_path: String,
    device: DeviceInfo,
    pin: std::sync::Mutex<String>,
    pending: std::sync::Mutex<HashMap<String, (DeviceInfo, Key)>>,
    failures: std::sync::Mutex<(u32, u32)>,
}

struct Runtime {
    ctx: Arc<ServerCtx>,
    port: u16,
    shutdown: Option<oneshot::Sender<()>>,
    mdns: Option<(ServiceDaemon, String)>,
    browsing: Arc<AtomicBool>,
    discoverable: bool,
}

static RUNTIME: Lazy<Mutex<Option<Runtime>>> = Lazy::new(|| Mutex::new(None));
static DISCOVERED: Lazy<std::sync::Mutex<HashMap<String, Discovered>>> =
    Lazy::new(|| std::sync::Mutex::new(HashMap::new()));
/// Last manifest received from each peer, used to copy its books.
static MANIFESTS: Lazy<Mutex<HashMap<String, Manifest>>> = Lazy::new(|| Mutex::new(HashMap::new()));

fn new_pin() -> String {
    format!("{:06}", rand::random::<u32>() % 1_000_000)
}

async fn base_path(state: &State<'_, AppState>) -> String {
    state.config.lock().await.base_path.clone()
}

async fn repo_of(app: &AppHandle) -> Result<SurrealRepo, String> {
    let state = app.state::<AppState>();
    let base = state.config.lock().await.base_path.clone();
    let global = state.global_vars.lock().await;
    global
        .get_surreal_db(&base)
        .await
        .map_err(|e| e.to_string())
}

fn this_device(base: &str) -> Result<DeviceInfo, String> {
    let (id, name) = SyncStore::new(base).identity()?;
    Ok(DeviceInfo {
        id,
        name,
        platform: sync::platform_name().into(),
        version: env!("CARGO_PKG_VERSION").into(),
    })
}

fn local_addresses() -> Vec<IpAddr> {
    let mut ips: Vec<IpAddr> = if_addrs::get_if_addrs()
        .unwrap_or_default()
        .into_iter()
        .filter(|i| !i.is_loopback())
        .map(|i| i.ip())
        .filter(|ip| match ip {
            IpAddr::V4(v4) => !v4.is_link_local(),
            IpAddr::V6(_) => false,
        })
        .collect();
    ips.sort_by_key(|ip| match ip {
        IpAddr::V4(v4) if v4.is_private() => 0,
        _ => 1,
    });
    ips.dedup();
    ips
}

fn emit_peers(app: &AppHandle) {
    let _ = app.emit("sync-peers-changed", ());
}

// ---------------------------------------------------------------------------
// HTTP endpoint
// ---------------------------------------------------------------------------

#[derive(Serialize, Deserialize)]
struct PairStart {
    id: String,
    name: String,
    platform: String,
    #[serde(default)]
    version: String,
    msg: String,
}

#[derive(Serialize, Deserialize)]
struct PairProof {
    id: String,
    proof: String,
}

fn status(code: StatusCode, message: &str) -> Response {
    (code, message.to_string()).into_response()
}

fn peer_key(ctx: &ServerCtx, headers: &HeaderMap, path: &str) -> Result<(Peer, Key), Response> {
    let peer_id = headers
        .get("x-cc-peer")
        .and_then(|v| v.to_str().ok())
        .unwrap_or_default();
    let token = headers
        .get("x-cc-auth")
        .and_then(|v| v.to_str().ok())
        .unwrap_or_default();
    let peer = SyncStore::new(&ctx.base_path)
        .peer(peer_id)
        .ok_or_else(|| status(StatusCode::UNAUTHORIZED, "not paired"))?;
    let key = peer
        .key()
        .ok_or_else(|| status(StatusCode::UNAUTHORIZED, "not paired"))?;
    if !sync::check_auth_token(&key, path, token) {
        return Err(status(StatusCode::UNAUTHORIZED, "bad token"));
    }
    Ok((peer, key))
}

async fn info_handler(AxState(ctx): AxState<Arc<ServerCtx>>) -> Json<DeviceInfo> {
    Json(ctx.device.clone())
}

fn record_failure(ctx: &ServerCtx) {
    let mut failures = ctx.failures.lock().unwrap();
    failures.0 += 1;
    failures.1 += 1;
    if failures.0 >= MAX_PAIR_FAILURES_PER_PIN {
        failures.0 = 0;
        *ctx.pin.lock().unwrap() = new_pin();
        (ctx.hooks.emit)("sync-pin-changed", serde_json::Value::Null);
        warn!("[sync] too many wrong PINs, a new PIN was drawn");
    }
}

async fn pair_start(AxState(ctx): AxState<Arc<ServerCtx>>, Json(req): Json<PairStart>) -> Response {
    if ctx.failures.lock().unwrap().1 >= MAX_PAIR_FAILURES {
        return status(StatusCode::TOO_MANY_REQUESTS, "pairing locked");
    }
    let Ok(msg_a) = B64.decode(&req.msg) else {
        return status(StatusCode::BAD_REQUEST, "bad message");
    };
    let pin = ctx.pin.lock().unwrap().clone();
    let (spake, msg_b) = Spake2::<Ed25519Group>::start_symmetric(
        &Password::new(pin.as_bytes()),
        &Identity::new(PAIR_IDENTITY),
    );
    let Ok(shared) = spake.finish(&msg_a) else {
        record_failure(&ctx);
        return status(StatusCode::BAD_REQUEST, "bad message");
    };
    let info = DeviceInfo {
        id: req.id.chars().take(64).collect(),
        name: req.name.chars().take(60).collect(),
        platform: req.platform.chars().take(20).collect(),
        version: req.version.chars().take(20).collect(),
    };
    ctx.pending
        .lock()
        .unwrap()
        .insert(info.id.clone(), (info, sync::derive_key(&shared)));
    Json(PairStart {
        id: ctx.device.id.clone(),
        name: ctx.device.name.clone(),
        platform: ctx.device.platform.clone(),
        version: ctx.device.version.clone(),
        msg: B64.encode(msg_b),
    })
    .into_response()
}

async fn pair_confirm(
    AxState(ctx): AxState<Arc<ServerCtx>>,
    Json(req): Json<PairProof>,
) -> Response {
    let Some((info, key)) = ctx.pending.lock().unwrap().remove(&req.id) else {
        return status(StatusCode::BAD_REQUEST, "no pairing in progress");
    };
    let proof_ok = B64
        .decode(&req.proof)
        .ok()
        .and_then(|p| sync::open(&key, &p, &format!("pair:{}", info.id)).ok())
        .is_some_and(|p| p == b"client-confirm");
    if !proof_ok {
        record_failure(&ctx);
        return status(StatusCode::FORBIDDEN, "wrong PIN");
    }
    if let Err(e) = SyncStore::new(&ctx.base_path).save_peer(Peer::new(
        &info.id,
        &info.name,
        &info.platform,
        &key,
    )) {
        return status(StatusCode::INTERNAL_SERVER_ERROR, &e);
    }
    *ctx.failures.lock().unwrap() = (0, 0);
    *ctx.pin.lock().unwrap() = new_pin();
    info!("[sync] paired with '{}'", info.name);
    (ctx.hooks.emit)("sync-paired", serde_json::json!(info));
    (ctx.hooks.emit)("sync-pin-changed", serde_json::Value::Null);
    (ctx.hooks.emit)("sync-peers-changed", serde_json::Value::Null);
    Json(PairProof {
        id: ctx.device.id.clone(),
        proof: B64.encode(sync::seal(
            &key,
            b"server-confirm",
            &format!("pair:{}", ctx.device.id),
        )),
    })
    .into_response()
}

async fn manifest_handler(AxState(ctx): AxState<Arc<ServerCtx>>, headers: HeaderMap) -> Response {
    let (_, key) = match peer_key(&ctx, &headers, "manifest") {
        Ok(found) => found,
        Err(r) => return r,
    };
    let repo = match (ctx.hooks.repo)().await {
        Ok(repo) => repo,
        Err(e) => return status(StatusCode::SERVICE_UNAVAILABLE, &e),
    };
    match sync::build_manifest(&repo, &ctx.base_path, &ctx.device.id, &ctx.device.name).await {
        Ok(manifest) => match sync::seal_json(&key, &manifest, "manifest") {
            Ok(body) => body.into_response(),
            Err(e) => status(StatusCode::INTERNAL_SERVER_ERROR, &e),
        },
        Err(e) => status(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
    }
}

async fn push_handler(
    AxState(ctx): AxState<Arc<ServerCtx>>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let (peer, key) = match peer_key(&ctx, &headers, "push") {
        Ok(found) => found,
        Err(r) => return r,
    };
    let manifest: Manifest = match sync::open_json(&key, &body, "push") {
        Ok(m) => m,
        Err(e) => return status(StatusCode::BAD_REQUEST, &e),
    };
    let repo = match (ctx.hooks.repo)().await {
        Ok(repo) => repo,
        Err(e) => return status(StatusCode::SERVICE_UNAVAILABLE, &e),
    };
    let report = match sync::merge(&repo, &ctx.base_path, &manifest).await {
        Ok(report) => report,
        Err(e) => return status(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
    };
    if report.credentials_added > 0 {
        (ctx.hooks.credentials_changed)().await;
    }
    if report.jellyfin_servers_added > 0 {
        let base = ctx.base_path.clone();
        tokio::spawn(
            async move { crate::services::jellyfin_service::rebind_borrowed(&base).await },
        );
    }
    MANIFESTS.lock().await.insert(peer.id.clone(), manifest);
    (ctx.hooks.emit)(
        "sync-merged",
        serde_json::json!({ "peer": peer.name, "report": report }),
    );
    match sync::seal_json(&key, &report, "push-report") {
        Ok(body) => body.into_response(),
        Err(e) => status(StatusCode::INTERNAL_SERVER_ERROR, &e),
    }
}

async fn file_handler(
    AxState(ctx): AxState<Arc<ServerCtx>>,
    AxPath(id): AxPath<String>,
    headers: HeaderMap,
) -> Response {
    let (_, key) = match peer_key(&ctx, &headers, &format!("file:{id}")) {
        Ok(found) => found,
        Err(r) => return r,
    };
    let Ok(repo) = (ctx.hooks.repo)().await else {
        return status(StatusCode::SERVICE_UNAVAILABLE, "database unavailable");
    };
    let Some(path) = sync::book_file(&repo, &id).await else {
        return status(StatusCode::NOT_FOUND, "no file");
    };
    let Ok(file) = tokio::fs::File::open(&path).await else {
        return status(StatusCode::NOT_FOUND, "no file");
    };
    let stream = futures::stream::unfold((file, 0u64, false), move |(mut file, index, done)| {
        let id = id.clone();
        async move {
            if done {
                return None;
            }
            let mut chunk = vec![0u8; FILE_CHUNK];
            let mut filled = 0;
            while filled < FILE_CHUNK {
                match file.read(&mut chunk[filled..]).await {
                    Ok(0) => break,
                    Ok(n) => filled += n,
                    Err(e) => return Some((Err(e), (file, index, true))),
                }
            }
            chunk.truncate(filled);
            let last = filled < FILE_CHUNK;
            let frame = sync::file_frame(&key, &id, index, last, &chunk);
            Some((
                Ok::<_, std::io::Error>(Bytes::from(frame)),
                (file, index + 1, last),
            ))
        }
    });
    Response::builder()
        .header("content-type", "application/octet-stream")
        .body(Body::from_stream(stream))
        .unwrap_or_else(|_| status(StatusCode::INTERNAL_SERVER_ERROR, "stream"))
}

async fn cover_handler(
    AxState(ctx): AxState<Arc<ServerCtx>>,
    AxPath((kind, id)): AxPath<(String, String)>,
    headers: HeaderMap,
) -> Response {
    let aad = format!("cover:{kind}:{id}");
    let (_, key) = match peer_key(&ctx, &headers, &aad) {
        Ok(found) => found,
        Err(r) => return r,
    };
    let Ok(repo) = (ctx.hooks.repo)().await else {
        return status(StatusCode::SERVICE_UNAVAILABLE, "database unavailable");
    };
    let Some(path) = sync::cover_file(&repo, &kind, &id).await else {
        return status(StatusCode::NOT_FOUND, "no cover");
    };
    match tokio::fs::read(&path).await {
        Ok(bytes) => sync::seal(&key, &bytes, &aad).into_response(),
        Err(_) => status(StatusCode::NOT_FOUND, "no cover"),
    }
}

fn router(ctx: Arc<ServerCtx>) -> Router {
    Router::new()
        .route(&format!("{API_PREFIX}/info"), get(info_handler))
        .route(&format!("{API_PREFIX}/pair/start"), post(pair_start))
        .route(&format!("{API_PREFIX}/pair/confirm"), post(pair_confirm))
        .route(&format!("{API_PREFIX}/manifest"), get(manifest_handler))
        .route(&format!("{API_PREFIX}/push"), post(push_handler))
        .route(&format!("{API_PREFIX}/file/{{id}}"), get(file_handler))
        .route(
            &format!("{API_PREFIX}/cover/{{kind}}/{{id}}"),
            get(cover_handler),
        )
        .layer(axum::extract::DefaultBodyLimit::max(256 * 1024 * 1024))
        .with_state(ctx)
}

// ---------------------------------------------------------------------------
// mDNS
// ---------------------------------------------------------------------------

fn announce(device: &DeviceInfo, port: u16) -> Result<(ServiceDaemon, String), String> {
    let daemon = ServiceDaemon::new().map_err(|e| e.to_string())?;
    let host = format!("cc-{}.local.", &device.id[..12.min(device.id.len())]);
    let props = [
        ("id", device.id.as_str()),
        ("name", device.name.as_str()),
        ("platform", device.platform.as_str()),
        ("version", device.version.as_str()),
    ];
    let service = ServiceInfo::new(SERVICE_TYPE, &device.id, &host, "", port, &props[..])
        .map_err(|e| e.to_string())?
        .enable_addr_auto();
    let fullname = service.get_fullname().to_string();
    daemon.register(service).map_err(|e| e.to_string())?;
    Ok((daemon, fullname))
}

fn browse(daemon: &ServiceDaemon, own_id: String, app: AppHandle, running: Arc<AtomicBool>) {
    let receiver = match daemon.browse(SERVICE_TYPE) {
        Ok(r) => r,
        Err(e) => {
            warn!("[sync] cannot browse the network: {}", e);
            return;
        }
    };
    std::thread::spawn(move || {
        while running.load(Ordering::Relaxed) {
            let Ok(event) = receiver.recv_timeout(Duration::from_millis(500)) else {
                continue;
            };
            match event {
                ServiceEvent::ServiceResolved(service) => {
                    let props = &service.txt_properties;
                    let Some(id) = props.get_property_val_str("id").map(str::to_string) else {
                        continue;
                    };
                    if id == own_id {
                        continue;
                    }
                    let mut addresses: Vec<String> = service
                        .addresses
                        .iter()
                        .map(|a| a.to_ip_addr())
                        .filter(|ip| ip.is_ipv4())
                        .map(|ip| SocketAddr::new(ip, service.port).to_string())
                        .collect();
                    addresses.sort();
                    let found = Discovered {
                        info: DeviceInfo {
                            id: id.clone(),
                            name: props.get_property_val_str("name").unwrap_or("?").into(),
                            platform: props.get_property_val_str("platform").unwrap_or("").into(),
                            version: props.get_property_val_str("version").unwrap_or("").into(),
                        },
                        fullname: Some(service.fullname.clone()),
                        addresses,
                    };
                    DISCOVERED.lock().unwrap().insert(id, found);
                    emit_peers(&app);
                }
                ServiceEvent::ServiceRemoved(_, fullname) => {
                    DISCOVERED
                        .lock()
                        .unwrap()
                        .retain(|_, d| d.fullname.as_deref() != Some(fullname.as_str()));
                    emit_peers(&app);
                }
                _ => {}
            }
        }
    });
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

fn http() -> reqwest::Client {
    reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(5))
        .build()
        .unwrap_or_default()
}

fn url(address: &str, path: &str) -> String {
    format!("http://{address}{API_PREFIX}{path}")
}

fn normalize_address(input: &str) -> Result<String, String> {
    let trimmed = input
        .trim()
        .trim_start_matches("http://")
        .trim_end_matches('/');
    let addr: SocketAddr = trimmed.parse().map_err(|_| {
        "Enter the address shown on the other device, like 192.168.1.20:52345".to_string()
    })?;
    Ok(addr.to_string())
}

async fn fetch_info(address: &str) -> Result<DeviceInfo, String> {
    http()
        .get(url(address, "/info"))
        .timeout(Duration::from_secs(5))
        .send()
        .await
        .map_err(|e| format!("The device did not answer ({})", e.without_url()))?
        .error_for_status()
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())
}

/// First address of a peer that answers, among the last used and the
/// announced ones.
async fn reach(peer_id: &str, hint: Option<String>, base: &str) -> Result<String, String> {
    let mut candidates: Vec<String> = hint.into_iter().collect();
    if let Some(found) = DISCOVERED.lock().unwrap().get(peer_id) {
        candidates.extend(found.addresses.clone());
    }
    if let Some(last) = SyncStore::new(base)
        .peer(peer_id)
        .and_then(|p| p.last_address)
    {
        candidates.push(last);
    }
    candidates.dedup();
    for address in candidates {
        if let Ok(info) = fetch_info(&address).await {
            if info.id == peer_id {
                return Ok(address);
            }
        }
    }
    Err("The device cannot be reached. Open the sync window on it too.".into())
}

async fn send_checked(request: reqwest::RequestBuilder) -> Result<reqwest::Response, String> {
    let response = request
        .send()
        .await
        .map_err(|e| format!("The device did not answer ({})", e.without_url()))?;
    match response.status() {
        s if s.is_success() => Ok(response),
        StatusCode::UNAUTHORIZED => {
            Err("The other device does not know this one anymore. Pair them again.".into())
        }
        s => Err(format!(
            "The other device refused ({}): {}",
            s.as_u16(),
            response.text().await.unwrap_or_default()
        )),
    }
}

fn authed(
    request: reqwest::RequestBuilder,
    own_id: &str,
    key: &Key,
    purpose: &str,
) -> reqwest::RequestBuilder {
    request
        .header("x-cc-peer", own_id)
        .header("x-cc-auth", sync::auth_token(key, purpose))
}

fn paired(base: &str, peer_id: &str) -> Result<(Peer, Key), String> {
    let peer = SyncStore::new(base)
        .peer(peer_id)
        .ok_or("This device is not paired")?;
    let key = peer.key().ok_or("This device is not paired")?;
    Ok((peer, key))
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async fn current_status(rt: &Runtime) -> SyncStatus {
    SyncStatus {
        device: rt.ctx.device.clone(),
        pin: rt.ctx.pin.lock().unwrap().clone(),
        port: rt.port,
        addresses: local_addresses()
            .into_iter()
            .map(|ip| SocketAddr::new(ip, rt.port).to_string())
            .collect(),
        discoverable: rt.discoverable,
    }
}

/// Starts the HTTP endpoint on a free port.
async fn serve(ctx: Arc<ServerCtx>) -> Result<(u16, oneshot::Sender<()>), String> {
    let listener = tokio::net::TcpListener::bind(("0.0.0.0", 0))
        .await
        .map_err(|e| format!("Cannot open the sync port: {e}"))?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    let (tx, rx) = oneshot::channel::<()>();
    let service = router(ctx);
    tokio::spawn(async move {
        let served = axum::serve(listener, service)
            .with_graceful_shutdown(async {
                let _ = rx.await;
            })
            .await;
        if let Err(e) = served {
            warn!("[sync] server stopped: {}", e);
        }
    });
    Ok((port, tx))
}

fn server_ctx(hooks: Hooks, base: String, device: DeviceInfo) -> Arc<ServerCtx> {
    Arc::new(ServerCtx {
        hooks,
        base_path: base,
        device,
        pin: std::sync::Mutex::new(new_pin()),
        pending: std::sync::Mutex::new(HashMap::new()),
        failures: std::sync::Mutex::new((0, 0)),
    })
}

#[tauri::command]
pub async fn sync_start(state: State<'_, AppState>, app: AppHandle) -> Result<SyncStatus, String> {
    let mut runtime = RUNTIME.lock().await;
    if let Some(rt) = runtime.as_ref() {
        return Ok(current_status(rt).await);
    }
    let base = base_path(&state).await;
    let device = this_device(&base)?;
    let ctx = server_ctx(Hooks::for_app(&app), base, device.clone());
    let (port, shutdown) = serve(ctx.clone()).await?;

    let browsing = Arc::new(AtomicBool::new(true));
    let mdns = match announce(&device, port) {
        Ok((daemon, fullname)) => {
            browse(&daemon, device.id.clone(), app.clone(), browsing.clone());
            Some((daemon, fullname))
        }
        Err(e) => {
            warn!("[sync] mDNS unavailable: {}", e);
            None
        }
    };
    info!(
        "[sync] listening on port {} (mDNS: {})",
        port,
        mdns.is_some()
    );
    let rt = Runtime {
        ctx,
        port,
        shutdown: Some(shutdown),
        discoverable: mdns.is_some(),
        mdns,
        browsing,
    };
    let status = current_status(&rt).await;
    *runtime = Some(rt);
    Ok(status)
}

#[tauri::command]
pub async fn sync_stop() -> Result<(), String> {
    if let Some(mut rt) = RUNTIME.lock().await.take() {
        rt.browsing.store(false, Ordering::Relaxed);
        if let Some((daemon, fullname)) = rt.mdns.take() {
            let _ = daemon.unregister(&fullname);
            let _ = daemon.shutdown();
        }
        if let Some(tx) = rt.shutdown.take() {
            let _ = tx.send(());
        }
        DISCOVERED.lock().unwrap().clear();
        info!("[sync] stopped");
    }
    Ok(())
}

#[tauri::command]
pub async fn sync_status() -> Result<Option<SyncStatus>, String> {
    Ok(match RUNTIME.lock().await.as_ref() {
        Some(rt) => Some(current_status(rt).await),
        None => None,
    })
}

#[tauri::command]
pub async fn sync_set_device_name(
    state: State<'_, AppState>,
    app: AppHandle,
    name: String,
) -> Result<(), String> {
    let base = base_path(&state).await;
    SyncStore::new(&base).set_device_name(&name)?;
    let restart = RUNTIME.lock().await.is_some();
    if restart {
        sync_stop().await?;
        sync_start(state, app).await?;
    }
    Ok(())
}

#[tauri::command]
pub async fn sync_peers(state: State<'_, AppState>) -> Result<Vec<PeerView>, String> {
    let base = base_path(&state).await;
    let discovered = DISCOVERED.lock().unwrap().clone();
    let mut out: Vec<PeerView> = SyncStore::new(&base)
        .peers()
        .into_iter()
        .map(|p| {
            let found = discovered.get(&p.id);
            PeerView {
                online: found.is_some(),
                addresses: found
                    .map(|d| d.addresses.clone())
                    .or_else(|| p.last_address.clone().map(|a| vec![a]))
                    .unwrap_or_default(),
                name: found.map(|d| d.info.name.clone()).unwrap_or(p.name),
                platform: p.platform,
                last_sync: p.last_sync,
                paired: true,
                id: p.id,
            }
        })
        .collect();
    for (id, found) in discovered {
        if !out.iter().any(|p| p.id == id) {
            out.push(PeerView {
                id,
                name: found.info.name,
                platform: found.info.platform,
                paired: false,
                online: true,
                addresses: found.addresses,
                last_sync: None,
            });
        }
    }
    out.sort_by(|a, b| (!a.online, &a.name).cmp(&(!b.online, &b.name)));
    Ok(out)
}

/// Looks up a device by its address, for networks where it is not announced.
#[tauri::command]
pub async fn sync_probe(app: AppHandle, address: String) -> Result<PeerView, String> {
    let address = normalize_address(&address)?;
    let info = fetch_info(&address).await?;
    let found = Discovered {
        info: info.clone(),
        fullname: None,
        addresses: vec![address.clone()],
    };
    DISCOVERED.lock().unwrap().insert(info.id.clone(), found);
    emit_peers(&app);
    Ok(PeerView {
        id: info.id,
        name: info.name,
        platform: info.platform,
        paired: false,
        online: true,
        addresses: vec![address],
        last_sync: None,
    })
}

/// Pairs with the device at `address` using the PIN it shows, and keeps the
/// shared key.
async fn pair_at(base: &str, address: &str, peer_id: &str, pin: &str) -> Result<Peer, String> {
    let me = this_device(base)?;
    let pin: String = pin.chars().filter(char::is_ascii_digit).collect();
    if pin.len() != 6 {
        return Err("The PIN has 6 digits".into());
    }
    let (spake, msg_a) = Spake2::<Ed25519Group>::start_symmetric(
        &Password::new(pin.as_bytes()),
        &Identity::new(PAIR_IDENTITY),
    );
    let started: PairStart =
        send_checked(http().post(url(address, "/pair/start")).json(&PairStart {
            id: me.id.clone(),
            name: me.name.clone(),
            platform: me.platform.clone(),
            version: me.version.clone(),
            msg: B64.encode(msg_a),
        }))
        .await?
        .json()
        .await
        .map_err(|e| e.to_string())?;
    if started.id != peer_id {
        return Err("Another device answered at this address".into());
    }
    let msg_b = B64.decode(&started.msg).map_err(|e| e.to_string())?;
    let key = sync::derive_key(&spake.finish(&msg_b).map_err(|_| "Pairing failed")?);

    let response = http()
        .post(url(address, "/pair/confirm"))
        .json(&PairProof {
            id: me.id.clone(),
            proof: B64.encode(sync::seal(
                &key,
                b"client-confirm",
                &format!("pair:{}", me.id),
            )),
        })
        .send()
        .await
        .map_err(|e| e.to_string())?;
    match response.status() {
        StatusCode::FORBIDDEN => return Err("Wrong PIN".into()),
        StatusCode::TOO_MANY_REQUESTS => {
            return Err(
                "Too many wrong PINs. Close and reopen the sync window on the other device.".into(),
            )
        }
        s if !s.is_success() => return Err(response.text().await.unwrap_or_default()),
        _ => {}
    }
    let confirm: PairProof = response.json().await.map_err(|e| e.to_string())?;
    let server_ok = B64
        .decode(&confirm.proof)
        .ok()
        .and_then(|p| sync::open(&key, &p, &format!("pair:{peer_id}")).ok())
        .is_some_and(|p| p == b"server-confirm");
    if !server_ok {
        return Err("The other device could not prove it knows the PIN".into());
    }
    let mut peer = Peer::new(&started.id, &started.name, &started.platform, &key);
    peer.last_address = Some(address.to_string());
    SyncStore::new(base).save_peer(peer.clone())?;
    info!("[sync] paired with '{}'", started.name);
    Ok(peer)
}

#[tauri::command]
pub async fn sync_pair(
    state: State<'_, AppState>,
    app: AppHandle,
    peer_id: String,
    pin: String,
) -> Result<PeerView, String> {
    let base = base_path(&state).await;
    let address = reach(&peer_id, None, &base).await?;
    let peer = pair_at(&base, &address, &peer_id, &pin).await?;
    emit_peers(&app);
    Ok(PeerView {
        id: peer.id,
        name: peer.name,
        platform: peer.platform,
        paired: true,
        online: true,
        addresses: vec![address],
        last_sync: None,
    })
}

#[tauri::command]
pub async fn sync_forget(
    state: State<'_, AppState>,
    app: AppHandle,
    peer_id: String,
) -> Result<(), String> {
    let base = base_path(&state).await;
    SyncStore::new(&base).remove_peer(&peer_id)?;
    MANIFESTS.lock().await.remove(&peer_id);
    emit_peers(&app);
    Ok(())
}

#[derive(Debug, Clone, Serialize)]
pub struct SyncResult {
    /// What this device took from the other one.
    pub pulled: MergeReport,
    /// What the other device took from this one.
    pub pushed: MergeReport,
    /// Books of the other device this one does not have.
    pub remote_books: Vec<RemoteBook>,
}

/// This device takes the other's changes, then sends its own so both end up
/// with the same reading state. Returns the other device's manifest too.
async fn sync_at(
    base: &str,
    repo: &SurrealRepo,
    peer_id: &str,
    address: &str,
) -> Result<(SyncResult, Manifest), String> {
    let me = this_device(base)?;
    let (_, key) = paired(base, peer_id)?;
    let sealed = send_checked(authed(
        http().get(url(address, "/manifest")),
        &me.id,
        &key,
        "manifest",
    ))
    .await?
    .bytes()
    .await
    .map_err(|e| e.to_string())?;
    let remote: Manifest = sync::open_json(&key, &sealed, "manifest")?;

    let pulled = sync::merge(repo, base, &remote)
        .await
        .map_err(|e| e.to_string())?;

    let local = sync::build_manifest(repo, base, &me.id, &me.name)
        .await
        .map_err(|e| e.to_string())?;
    let body = sync::seal_json(&key, &local, "push")?;
    let sealed =
        send_checked(authed(http().post(url(address, "/push")), &me.id, &key, "push").body(body))
            .await?
            .bytes()
            .await
            .map_err(|e| e.to_string())?;
    let pushed: MergeReport = sync::open_json(&key, &sealed, "push-report")?;

    let matches = sync::match_records(repo, &remote)
        .await
        .map_err(|e| e.to_string())?;
    let remote_books = sync::missing_books(&remote, &matches);
    SyncStore::new(base).touch_peer(peer_id, address)?;
    Ok((
        SyncResult {
            pulled,
            pushed,
            remote_books,
        },
        remote,
    ))
}

#[tauri::command]
pub async fn sync_run(
    state: State<'_, AppState>,
    app: AppHandle,
    peer_id: String,
) -> Result<SyncResult, String> {
    let base = base_path(&state).await;
    let (peer, _) = paired(&base, &peer_id)?;
    let address = reach(&peer.id, None, &base).await?;
    let repo = repo_of(&app).await?;
    let (result, remote) = sync_at(&base, &repo, &peer.id, &address).await?;
    if result.pulled.credentials_added > 0 {
        let _ = crate::commands::settings::load_credentials_into_state(&state).await;
    }
    if result.pulled.jellyfin_servers_added > 0 {
        let base = base.clone();
        tokio::spawn(
            async move { crate::services::jellyfin_service::rebind_borrowed(&base).await },
        );
    }
    MANIFESTS.lock().await.insert(peer.id.clone(), remote);
    emit_peers(&app);
    Ok(result)
}

#[derive(Debug, Clone, Serialize)]
struct TransferProgress {
    book_id: String,
    title: String,
    index: usize,
    count: usize,
    written: u64,
    total: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct TransferFailure {
    pub title: String,
    pub error: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct TransferResult {
    pub copied: usize,
    pub failed: Vec<TransferFailure>,
}

/// Connection to a paired device.
struct Link<'a> {
    address: &'a str,
    own_id: &'a str,
    key: Key,
}

impl Link<'_> {
    async fn cover(
        &self,
        kind: &str,
        remote_id: &str,
        covers_dir: &str,
        local_key: &str,
    ) -> Option<String> {
        let aad = format!("cover:{kind}:{remote_id}");
        let sealed = send_checked(authed(
            http().get(url(self.address, &format!("/cover/{kind}/{remote_id}"))),
            self.own_id,
            &self.key,
            &aad,
        ))
        .await
        .ok()?
        .bytes()
        .await
        .ok()?;
        let bytes = sync::open(&self.key, &sealed, &aad).ok()?;
        let path = Path::new(covers_dir).join(format!(
            "sync_{kind}_{local_key}.{}",
            sync::image_extension(&bytes)
        ));
        std::fs::write(&path, bytes).ok()?;
        Some(path.to_string_lossy().to_string())
    }

    async fn file(
        &self,
        book: &RemoteBook,
        dest: &Path,
        on_progress: &(dyn Fn(u64) + Send + Sync),
    ) -> Result<(), String> {
        let response = send_checked(authed(
            http().get(url(self.address, &format!("/file/{}", book.id))),
            self.own_id,
            &self.key,
            &format!("file:{}", book.id),
        ))
        .await?;
        let part = dest.with_extension("part");
        let mut file = tokio::fs::File::create(&part)
            .await
            .map_err(|e| e.to_string())?;
        let mut reader = FrameReader::new(self.key, &book.id);
        let mut stream = response.bytes_stream();
        let mut written = 0u64;
        let mut reported = 0u64;
        let result: Result<(), String> = async {
            while let Some(chunk) = stream.next().await {
                let chunk = chunk.map_err(|e| e.to_string())?;
                for plain in reader.push(&chunk)? {
                    file.write_all(&plain).await.map_err(|e| e.to_string())?;
                    written += plain.len() as u64;
                }
                if written - reported >= 512 * 1024 {
                    reported = written;
                    on_progress(written);
                }
            }
            if !reader.finished {
                return Err("The transfer was interrupted".into());
            }
            file.flush().await.map_err(|e| e.to_string())
        }
        .await;
        drop(file);
        match result {
            Ok(()) => tokio::fs::rename(&part, dest)
                .await
                .map_err(|e| e.to_string()),
            Err(e) => {
                let _ = tokio::fs::remove_file(&part).await;
                Err(e)
            }
        }
    }
}

/// Copies books of the other device (file, cover, metadata and series) into
/// this device's library.
async fn transfer_from(
    base: &str,
    repo: &SurrealRepo,
    peer_id: &str,
    address: &str,
    remote: &Manifest,
    book_ids: &[String],
    on_progress: &(dyn Fn(TransferProgress) + Send + Sync),
) -> Result<TransferResult, String> {
    let me = this_device(base)?;
    let (_, key) = paired(base, peer_id)?;
    let link = Link {
        address,
        own_id: &me.id,
        key,
    };
    let root = sync::library_root(repo, base)
        .await
        .map_err(|e| e.to_string())?;
    let mut matches = sync::match_records(repo, remote)
        .await
        .map_err(|e| e.to_string())?;
    let wanted: Vec<RemoteBook> = sync::missing_books(remote, &matches)
        .into_iter()
        .filter(|b| book_ids.contains(&b.id))
        .collect();
    let find = |list: &[serde_json::Value], id: &str| {
        list.iter()
            .find(|v| sync::record_key(v.get("id").and_then(|i| i.as_str()).unwrap_or("")) == id)
            .cloned()
    };

    let mut result = TransferResult {
        copied: 0,
        failed: Vec::new(),
    };
    let count = wanted.len();
    for (index, book) in wanted.iter().enumerate() {
        let outcome: Result<(), String> = async {
            let remote_book = find(&remote.books, &book.id).ok_or("unknown book")?;
            let series_dir_name =
                sync::sanitize_file_name(book.series_title.as_deref().unwrap_or(&book.title));
            let series_key = match &book.series_id {
                Some(remote_series) => match matches.series.get(remote_series) {
                    Some(local) => Some(local.clone()),
                    None => {
                        let remote_series_value =
                            find(&remote.series, remote_series).ok_or("unknown series")?;
                        let dir = root.join(&series_dir_name);
                        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
                        let cover = if remote.covers.contains(&format!("series:{remote_series}")) {
                            link.cover("series", remote_series, &repo.covers_dir, remote_series)
                                .await
                        } else {
                            None
                        };
                        sync::upsert_record(
                            repo,
                            "series",
                            remote_series,
                            sync::copied_series(&remote_series_value, &dir, cover),
                        )
                        .await
                        .map_err(|e| e.to_string())?;
                        matches
                            .series
                            .insert(remote_series.clone(), remote_series.clone());
                        Some(remote_series.clone())
                    }
                },
                None => None,
            };
            let dir = match &series_key {
                Some(key) => repo
                    .get_series_by_id(key)
                    .await
                    .ok()
                    .flatten()
                    .map(|s| s.path)
                    .filter(|p| Path::new(p).is_dir())
                    .map(std::path::PathBuf::from)
                    .unwrap_or_else(|| root.join(&series_dir_name)),
                None => root.join(&series_dir_name),
            };
            std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
            let dest = sync::unique_destination(&dir, &book.file_name);
            let progress = |written| {
                on_progress(TransferProgress {
                    book_id: book.id.clone(),
                    title: book.title.clone(),
                    index,
                    count,
                    written,
                    total: book.size,
                })
            };
            progress(0);
            link.file(book, &dest, &progress).await?;
            let cover = if remote.covers.contains(&format!("book:{}", book.id)) {
                link.cover("book", &book.id, &repo.covers_dir, &book.id)
                    .await
            } else {
                None
            };
            sync::upsert_record(
                repo,
                "book",
                &book.id,
                sync::copied_book(&remote_book, &dest, series_key.as_deref(), cover),
            )
            .await
            .map_err(|e| e.to_string())
        }
        .await;
        match outcome {
            Ok(()) => result.copied += 1,
            Err(error) => {
                sync::log_warn(&book.title, &error);
                result.failed.push(TransferFailure {
                    title: book.title.clone(),
                    error,
                });
            }
        }
    }
    Ok(result)
}

#[tauri::command]
pub async fn sync_transfer(
    state: State<'_, AppState>,
    app: AppHandle,
    peer_id: String,
    book_ids: Vec<String>,
) -> Result<TransferResult, String> {
    let base = base_path(&state).await;
    let (peer, _) = paired(&base, &peer_id)?;
    let remote = MANIFESTS
        .lock()
        .await
        .get(&peer.id)
        .cloned()
        .ok_or("Sync with this device first")?;
    let address = reach(&peer.id, None, &base).await?;
    let repo = repo_of(&app).await?;
    let emitter = app.clone();
    let result = transfer_from(
        &base,
        &repo,
        &peer.id,
        &address,
        &remote,
        &book_ids,
        &move |p| {
            let _ = emitter.emit("sync-transfer-progress", p);
        },
    )
    .await?;
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    struct Device {
        dir: tempfile::TempDir,
        repo: SurrealRepo,
    }

    impl Device {
        async fn new() -> Self {
            let dir = tempfile::tempdir().unwrap();
            let repo = SurrealRepo::open(dir.path().to_str().unwrap())
                .await
                .unwrap();
            Self { dir, repo }
        }

        fn base(&self) -> &str {
            self.dir.path().to_str().unwrap()
        }

        async fn serve(&self) -> (Arc<ServerCtx>, String, oneshot::Sender<()>) {
            let repo = self.repo.clone();
            let hooks = Hooks {
                repo: Arc::new(move || {
                    let repo = repo.clone();
                    Box::pin(async move { Ok(repo) })
                }),
                emit: Arc::new(|_, _| {}),
                credentials_changed: Arc::new(|| Box::pin(async {})),
            };
            let ctx = server_ctx(
                hooks,
                self.base().to_string(),
                this_device(self.base()).unwrap(),
            );
            let (port, stop) = serve(ctx.clone()).await.unwrap();
            (ctx, format!("127.0.0.1:{port}"), stop)
        }
    }

    #[tokio::test]
    async fn two_devices_pair_sync_and_copy_a_book() {
        let (phone, desktop) = (Device::new().await, Device::new().await);
        let (ctx, address, stop) = desktop.serve().await;
        let desktop_id = ctx.device.id.clone();

        let info = fetch_info(&address).await.unwrap();
        assert_eq!(info.id, desktop_id);

        let pin = ctx.pin.lock().unwrap().clone();
        let wrong = if pin == "000000" { "111111" } else { "000000" };
        assert_eq!(
            pair_at(phone.base(), &address, &desktop_id, wrong)
                .await
                .unwrap_err(),
            "Wrong PIN"
        );
        pair_at(phone.base(), &address, &desktop_id, &pin)
            .await
            .unwrap();
        let phone_id = this_device(phone.base()).unwrap().id;
        assert!(
            SyncStore::new(desktop.base()).peer(&phone_id).is_some(),
            "both devices keep the pairing"
        );

        // A series with one book on the desktop, a secret on the phone.
        let series_dir = desktop.dir.path().join("Saga");
        std::fs::create_dir_all(&series_dir).unwrap();
        let file = series_dir.join("Saga 01.cbz");
        let content: Vec<u8> = (0..(FILE_CHUNK * 2 + 123))
            .map(|i| (i % 251) as u8)
            .collect();
        std::fs::write(&file, &content).unwrap();
        let cover = series_dir.join("cover.png");
        std::fs::write(&cover, b"\x89PNG fake").unwrap();
        let series = desktop
            .repo
            .create_series(crate::models::SeriesRecord {
                title: "Saga".into(),
                path: series_dir.to_string_lossy().to_string(),
                external_id: "manual_s".into(),
                ..Default::default()
            })
            .await
            .unwrap();
        let book = desktop
            .repo
            .create_book(crate::models::BookRecord {
                title: "Saga 01".into(),
                path: file.to_string_lossy().to_string(),
                cover_url: Some(cover.to_string_lossy().to_string()),
                series_id: Some(series.id.unwrap().to_string()),
                external_id: "manual_b".into(),
                last_page: 4,
                ..Default::default()
            })
            .await
            .unwrap();
        phone
            .repo
            .upsert_api_credential("google_books_api_key", "g-key")
            .await
            .unwrap();

        let (result, remote) = sync_at(phone.base(), &phone.repo, &desktop_id, &address)
            .await
            .unwrap();
        assert_eq!(
            result.pushed.credentials_added, 1,
            "the desktop got the key"
        );
        assert_eq!(result.remote_books.len(), 1);
        let wanted = result.remote_books[0].clone();
        assert_eq!(wanted.series_title.as_deref(), Some("Saga"));

        let copied = transfer_from(
            phone.base(),
            &phone.repo,
            &desktop_id,
            &address,
            &remote,
            &[wanted.id.clone()],
            &|_| {},
        )
        .await
        .unwrap();
        assert_eq!(copied.copied, 1, "{:?}", copied.failed);

        let local = phone
            .repo
            .get_book_by_id(&wanted.id)
            .await
            .unwrap()
            .expect("the copied book keeps its id");
        assert_eq!(std::fs::read(&local.path).unwrap(), content);
        assert_eq!(local.last_page, 4);
        assert!(local
            .cover_url
            .is_some_and(|c| std::fs::read(c).unwrap() == b"\x89PNG fake"));
        let local_series = phone
            .repo
            .get_series_by_id(local.series_id.as_deref().unwrap())
            .await
            .unwrap()
            .expect("the series came along");
        assert_eq!(local_series.title, "Saga");

        let (again, _) = sync_at(phone.base(), &phone.repo, &desktop_id, &address)
            .await
            .unwrap();
        assert!(again.remote_books.is_empty(), "nothing left to copy");
        assert_eq!(book.title, "Saga 01");

        SyncStore::new(desktop.base())
            .remove_peer(&phone_id)
            .unwrap();
        let err = sync_at(phone.base(), &phone.repo, &desktop_id, &address)
            .await
            .unwrap_err();
        assert!(err.contains("Pair them again"), "{err}");
        let _ = stop.send(());
    }
}
