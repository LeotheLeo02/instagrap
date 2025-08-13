// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// FIX: Update Playwright imports and usage as per the patch
use playwright::api::{BrowserChannel, Playwright};
use google_cloud_storage::client::{Client, ClientConfig};
// use std::path::Path; // This is only needed if using the `executable` path below
use dirs;
use google_cloud_storage::http::objects::upload::{Media, UploadObjectRequest, UploadType};
// REMINDER: Add `reqwest = { version = "0.12", features = ["json"] }` to your Cargo.toml
use reqwest;
use serde_json::json;
use std::fs;
use std::process::Command;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use tauri::State;


const API_BASE: &str = "https://instagram-api-672383441505.europe-west1.run.app";
const CLASSIFY_API_BASE: &str = "https://bio-classifier-672383441505.us-central1.run.app";

// Structure to store scraping operation data
#[derive(Serialize, Deserialize, Clone)]
struct ScrapingOperation {
    operation_id: String,
    target_account: String,
    target_count: u32,
    started_at: String,
    status: String, // "running", "completed", "failed"
    results: Option<Vec<serde_json::Value>>,
    error_message: Option<String>,
    exec_id: Option<String>,
}

// Structure to store app state
#[derive(Serialize, Deserialize, Clone)]
struct AppState {
    scraping_operations: Vec<ScrapingOperation>,
    last_login_gcs_uri: Option<String>,
    todos: Vec<Todo>,
    // Saved criteria presets for classifier prompt
    saved_criteria: Vec<SavedCriteriaPreset>,
    active_criteria_id: Option<String>, // if None, use default from API
}

impl AppState {
    fn new() -> Self {
        Self {
            scraping_operations: Vec::new(),
            last_login_gcs_uri: None,
            todos: Vec::new(),
            saved_criteria: Vec::new(),
            active_criteria_id: None,
        }
    }

    fn save(&self) -> Result<(), String> {
        let config_dir = dirs::config_dir().ok_or("Could not find config directory")?;
        let state_path = config_dir.join("instagram_scraper_state.json");
        
        let state_json = serde_json::to_string_pretty(self)
            .map_err(|e| format!("Failed to serialize state: {}", e))?;
        
        fs::write(&state_path, state_json)
            .map_err(|e| format!("Failed to write state file: {}", e))?;
        
        println!("✅ App state saved to {}", state_path.display());
        Ok(())
    }

    fn load() -> Result<Self, String> {
        let config_dir = dirs::config_dir().ok_or("Could not find config directory")?;
        let state_path = config_dir.join("instagram_scraper_state.json");
        
        if !state_path.exists() {
            println!("ℹ️ No existing state file found, creating new state");
            return Ok(Self::new());
        }
        
        let state_json = fs::read_to_string(&state_path)
            .map_err(|e| format!("Failed to read state file: {}", e))?;
        
        let state: AppState = serde_json::from_str(&state_json)
            .map_err(|e| format!("Failed to parse state file: {}", e))?;
        
        println!("✅ App state loaded from {}", state_path.display());
        Ok(state)
    }

    fn add_operation(&mut self, operation: ScrapingOperation) -> Result<(), String> {
        // Remove any existing operations for the same target account
        self.scraping_operations.retain(|op| op.target_account != operation.target_account);
        
        self.scraping_operations.push(operation);
        self.save()
    }

    fn update_operation(&mut self, operation_id: &str, status: &str, results: Option<Vec<serde_json::Value>>, error_message: Option<String>) -> Result<(), String> {
        if let Some(operation) = self.scraping_operations.iter_mut().find(|op| op.operation_id == operation_id) {
            operation.status = status.to_string();
            operation.results = results;
            operation.error_message = error_message;
            self.save()?;
        }
        Ok(())
    }

    fn get_operation(&self, operation_id: &str) -> Option<&ScrapingOperation> {
        self.scraping_operations.iter().find(|op| op.operation_id == operation_id)
    }

    #[allow(dead_code)]
    fn get_running_operations(&self) -> Vec<&ScrapingOperation> {
        self.scraping_operations.iter().filter(|op| op.status == "running").collect()
    }

    fn clear_completed_operations(&mut self) -> Result<(), String> {
        self.scraping_operations.retain(|op| op.status == "running");
        self.save()
    }

    // Todo methods
    fn add_todo(&mut self, todo: Todo) -> Result<(), String> {
        self.todos.push(todo);
        self.save()
    }

    fn update_todo(&mut self, todo_id: &str, status: &str, operation_id: Option<String>, results: Option<Vec<serde_json::Value>>, error_message: Option<String>) -> Result<(), String> {
        if let Some(todo) = self.todos.iter_mut().find(|t| t.id == todo_id) {
            todo.status = status.to_string();
            todo.operation_id = operation_id;
            todo.results = results;
            todo.error_message = error_message;
            
            if status == "running" && todo.started_at.is_none() {
                todo.started_at = Some(Utc::now().to_rfc3339());
            } else if (status == "completed" || status == "failed") && todo.completed_at.is_none() {
                todo.completed_at = Some(Utc::now().to_rfc3339());
            }
            
            self.save()?;
        }
        Ok(())
    }

    fn set_todo_preset(&mut self, todo_id: &str, preset_id: Option<String>) -> Result<(), String> {
        if let Some(todo) = self.todos.iter_mut().find(|t| t.id == todo_id) {
            todo.criteria_preset_id = preset_id;
            self.save()?;
        }
        Ok(())
    }

    fn toggle_todo_manual_complete(&mut self, todo_id: &str) -> Result<(), String> {
        if let Some(todo) = self.todos.iter_mut().find(|t| t.id == todo_id) {
            todo.manually_completed = !todo.manually_completed;
            if todo.manually_completed {
                todo.status = "completed".to_string();
                todo.completed_at = Some(Utc::now().to_rfc3339());
            } else {
                todo.status = "pending".to_string();
                todo.completed_at = None;
            }
            self.save()?;
        }
        Ok(())
    }

    fn delete_todo(&mut self, todo_id: &str) -> Result<(), String> {
        self.todos.retain(|t| t.id != todo_id);
        self.save()
    }

    fn get_todos(&self) -> Vec<Todo> {
        self.todos.clone()
    }

    // ===== Saved Criteria Management =====
    fn add_criteria_preset(&mut self, name: String, criteria: String) -> Result<String, String> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        let preset = SavedCriteriaPreset { id: id.clone(), name, criteria, created_at: now.clone(), updated_at: now };
        self.saved_criteria.push(preset);
        self.save()?;
        Ok(id)
    }

    fn rename_criteria_preset(&mut self, id: &str, new_name: String) -> Result<(), String> {
        if let Some(p) = self.saved_criteria.iter_mut().find(|p| p.id == id) {
            p.name = new_name;
            p.updated_at = Utc::now().to_rfc3339();
            self.save()?;
        }
        Ok(())
    }

    fn update_criteria_preset(&mut self, id: &str, new_criteria: String) -> Result<(), String> {
        if let Some(p) = self.saved_criteria.iter_mut().find(|p| p.id == id) {
            p.criteria = new_criteria;
            p.updated_at = Utc::now().to_rfc3339();
            self.save()?;
        }
        Ok(())
    }

    fn delete_criteria_preset(&mut self, id: &str) -> Result<(), String> {
        self.saved_criteria.retain(|p| p.id != id);
        if let Some(active_id) = &self.active_criteria_id {
            if active_id == id {
                self.active_criteria_id = None; // fall back to default
            }
        }
        self.save()
    }

    fn set_active_criteria(&mut self, id: Option<String>) -> Result<(), String> {
        // Validate id if provided
        if let Some(ref some_id) = id {
            if !self.saved_criteria.iter().any(|p| &p.id == some_id) {
                return Err("Criteria preset not found".to_string());
            }
        }
        self.active_criteria_id = id;
        self.save()
    }
}

// Use Tauri's managed state instead of unsafe global state
use std::sync::Mutex;

struct AppStateManager(Mutex<AppState>);

impl AppStateManager {
    fn new() -> Self {
        Self(Mutex::new(AppState::load().unwrap_or_else(|_| AppState::new())))
    }
}

#[tauri::command]
async fn login_and_upload(bucket_url: String) -> Result<String, String> {
    match login_and_upload_inner(bucket_url).await {
        Ok(uri) => {
            println!("🚀 DONE – state uploaded to {}", uri);
            Ok(uri)
        }
        Err(e) => {
            eprintln!("❌ ERROR: {e}");
            Err(e)
        }
    }
}

#[tauri::command]
async fn login_and_upload_inner(bucket_url: String) -> Result<String, String> {
    // Avoid bundled browser downloads on unsupported mac15-arm64; we’ll launch system Chrome.
    std::env::set_var("PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD", "1");
    std::env::set_var("PLAYWRIGHT_SKIP_BROWSER_VALIDATION", "1");

    let pw = Playwright::initialize().await.map_err(|e| e.to_string())?;
    // `prepare` is a synchronous method, so `.await` is removed.
    pw.prepare().map_err(|e| e.to_string())?;

    // Launch system Chrome (change to .executable(...) if you prefer an explicit path).
    
    let profile_dir = dirs::config_dir().unwrap().join("insta_profile");
    let context = pw.chromium()
    .persistent_context_launcher(&profile_dir)
    .args(&[
        "--disable-extensions".to_string(),
        "--mute-audio".to_string(),
        "--window-size=1280,900".to_string()
    ])
    .headless(false)
    .channel(BrowserChannel::Chrome)
    .timeout(120_000.0)
    .launch()
    .await
    .map_err(|e| e.to_string())?;

    let page = context.new_page().await.map_err(|e| e.to_string())?;


    // FIX: Use `add_init_script` BEFORE navigating. This is more robust and ensures
    // the script is injected on any page load, preventing race conditions.
    page.add_init_script(
        r#"
        {
            const createButton = () => {
                if (document.getElementById('pw-done-btn')) return;
                const btn = document.createElement('button');
                btn.id = 'pw-done-btn';
                btn.textContent = '✓ DONE – send cookies';
                btn.style = 'position:fixed;top:1rem;right:1rem;z-index:999999;padding:.6rem 1.2rem;background:#38bdf8;color:#fff;border:none;border-radius:.5rem;cursor:pointer;';
                btn.onclick = () => {
                    btn.setAttribute('data-clicked','1');
                    btn.textContent = '✓ Sending…';
                    window.__pw_done = true;
                };
                document.body.appendChild(btn);
            };

            if (document.readyState === 'loading') {
                window.addEventListener('DOMContentLoaded', createButton);
            } else {
                createButton();
            }
        }
        "#,
    )
    .await
    .map_err(|e| e.to_string())?;

    page.goto_builder("https://www.instagram.com/")
    .timeout(300000.0)
    .goto()
    .await
    .map_err(|e| e.to_string())?;
        
    // Wait until the user clicks the button (flag becomes true in page context).
    page
    .wait_for_selector_builder("#pw-done-btn[data-clicked='1']")
    .timeout(300000.0)
    .wait_for_selector()
    .await
    .map_err(|e| format!("wait cancelled or timed-out: {e}"))?;
    println!("✅ User clicked DONE");

    // --- proceed to capture storage state & upload ---
    let config_dir = dirs::config_dir().ok_or("Could not find config directory")?;
    // Ensure the directory exists
    fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
    let state_path = config_dir.join("insta_state.json");

    let state = context
        .storage_state()
        .await
        .map_err(|e| e.to_string())?;
    let state_json = serde_json::to_string(&state).map_err(|e| e.to_string())?;
    fs::write(&state_path, state_json).map_err(|e| e.to_string())?;

    let browser_opt = context.browser().map_err(|e| e.to_string())?;
    if let Some(browser) = browser_opt {
        browser.close().await.ok();
    }
    println!("✅ State file written to {}", state_path.display());

    let mut config = ClientConfig::default();
    config.project_id = Some("newera-93301".to_string());
    let config = config
    .with_auth()
    .await
    .map_err(|e| e.to_string())?;

    println!("🔍 [DEBUG] Google Cloud authentication configured successfully");

    let client = Client::new(config);
    
    let trimmed_url = bucket_url
        .strip_prefix("gs://")
        .ok_or_else(|| "Invalid GCS URL: must start with gs://".to_string())?;

    let (bucket, object) = match trimmed_url.split_once('/') {
            Some((b, o)) if !o.is_empty() => (b.to_string(), o.to_string()),
            Some((b, _)) => {
                let default_name = format!(
                    "insta_state_{}.json",
                    Utc::now().format("%Y%m%dT%H%M%SZ")
                );
                (b.to_string(), default_name)
            }
            None => {
                let default_name = format!(
                    "insta_state_{}.json",
                    Utc::now().format("%Y%m%dT%H%M%SZ")
                );
                (trimmed_url.to_string(), default_name)
            }
    };
    
    let data = fs::read(&state_path).map_err(|e| e.to_string())?;

    let upload_request = UploadObjectRequest {
        bucket: bucket.to_string(),
        ..Default::default()
    };
    let media = Media {
        name: object.to_string().into(),
        content_type: "application/json".into(),
        content_length: Some(data.len() as u64),
    };

    let upload_type = UploadType::Simple(media);

    client
        .upload_object(&upload_request, data, &upload_type)
        .await
        .map_err(|e| e.to_string())?;
    
    // Construct the full GCS URI with the object name
    let full_gcs_uri = format!("gs://{}/{}", bucket, object);
    println!("✅ Upload successful to {}", full_gcs_uri);
    fs::remove_file(state_path).ok();
    Ok(full_gcs_uri)
}

// FIX: Add proxy commands to bypass CORS issues from the frontend

#[tauri::command]
async fn proxy_register_state(gcs_uri: String) -> Result<(), String> {
    println!("🔍 [DEBUG] Attempting to register state with URI: {}", gcs_uri);
    
    // Validate the GCS URI format
    if !gcs_uri.starts_with("gs://") {
        return Err("Invalid GCS URI: must start with gs://".to_string());
    }
    
    // Create a client with timeout and proper configuration
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    let body = json!({ "gcs_uri": gcs_uri });
    let url = format!("{}/register-state", API_BASE);
    
    println!("🔍 [DEBUG] Sending POST request to: {}", url);
    println!("🔍 [DEBUG] Request body: {}", serde_json::to_string(&body).unwrap_or_default());
    
    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .header("User-Agent", "InstaGrap/1.0")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;
    
    let status = response.status();
    println!("🔍 [DEBUG] Response status: {}", status);
    
    // Check if the request was successful
    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("HTTP error {}: {}", status, error_text));
    }
    
    // Try to parse the response
    match response.json::<serde_json::Value>().await {
        Ok(json_response) => {
            println!("✅ [DEBUG] Registration successful: {:?}", json_response);
            Ok(())
        }
        Err(e) => {
            println!("⚠️ [DEBUG] Response received but couldn't parse JSON: {}", e);
            // Still return Ok since the server responded with success status
            Ok(())
        }
    }
}

#[tauri::command]
async fn proxy_login_status() -> Result<serde_json::Value, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let url = format!("{}/login-status", API_BASE);
    println!("DBG proxy_login_status URL={}", url);

    // Send with rich error diagnostics
    let resp = match client.get(&url).send().await {
        Ok(r) => r,
        Err(e) => {
            use std::error::Error as StdError;
            let mut chain = String::new();
            let mut src = e.source();
            while let Some(s) = src {
                chain.push_str(&format!("; caused_by: {}", s));
                src = s.source();
            }
            let detail = format!(
                "network error: {} | is_timeout={} is_connect={} url={:?} debug={:?}{}",
                e,
                e.is_timeout(),
                e.is_connect(),
                e.url(),
                e,
                chain
            );
            println!("DBG proxy_login_status error: {}", detail);
            if e.is_timeout() {
                // Treat timeout as no login state so UI can proceed
                return Ok(json!({"status":"none","ok":false,"message":"timeout"}));
            }
            return Err(detail);
        }
    };

    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_else(|_| "".into());
        println!("DBG login-status http_status={} body={}", status, body);
        return Err(format!("HTTP {}: {}", status, body));
    }

    // Read body text first so we can include it on JSON errors
    let body = resp.text().await.map_err(|e| e.to_string())?;
    match serde_json::from_str::<serde_json::Value>(&body) {
        Ok(json) => Ok(json),
        Err(e) => {
            let preview = if body.len() > 500 { &body[..500] } else { &body };
            Err(format!("JSON parse error: {} | body_preview={}", e, preview))
        }
    }
}

#[tauri::command]
async fn proxy_scrape_status(exec_id: String, target: String, legacy_operation: Option<String>) -> Result<serde_json::Value, String> {
    // Try GCS-based status first if exec_id looks valid
    if !exec_id.is_empty() {
        let url = format!("{}/scrape-status?target={}&exec_id={}", API_BASE, target, exec_id);
        let resp = reqwest::get(&url).await.map_err(|e| e.to_string())?;
        let status = resp.status();
        if status.is_success() {
            return resp.json::<serde_json::Value>().await.map_err(|e| e.to_string());
        }
        // On 404, fall through to legacy if available
    }

    if let Some(op) = legacy_operation {
        let legacy_url = format!("{}/legacy-scrape-status?operation={}", API_BASE, op);
        let legacy_resp = reqwest::get(&legacy_url).await.map_err(|e| e.to_string())?;
        let legacy_status = legacy_resp.status();
        if !legacy_status.is_success() {
            let legacy_text = legacy_resp.text().await.unwrap_or_else(|_| "".into());
            return Err(format!("HTTP {} (legacy): {}", legacy_status, legacy_text));
        }
        return legacy_resp.json::<serde_json::Value>().await.map_err(|e| e.to_string());
    }

    Err("No valid identifier to check status".to_string())
}

#[tauri::command]
async fn proxy_remote_scrape(
    target: String,
    target_yes: u32,
    batch_size: u32,
    num_bio_pages: u32,
    // Optional: allow overriding criteria per job via preset id or raw criteria
    criteria_preset_id: Option<String>,
    criteria_text: Option<String>,
    state: State<'_, AppStateManager>,
) -> Result<serde_json::Value, String> {
    println!("🔍 [DEBUG] Proxy remote scrape called with: criteria_preset_id={:?} criteria_text={:?}", criteria_preset_id, criteria_text);
    println!("🔍 [DEBUG] Proxy remote scrape called with: target={}, target_yes={}, batch_size={}", target, target_yes, batch_size);
    // Do NOT mutate backend-global criteria. Gather per-job selection only.
    let (active_preset_for_job, criteria_text_for_job) = {
        println!("🔧 [DEBUG] Per-job criteria selection: preset_id={:?} text_present={}", criteria_preset_id, criteria_text.as_ref().map(|s| !s.is_empty()).unwrap_or(false));
        if let Some(ref text) = criteria_text {
            // If raw text is provided, use it regardless of preset id
            (criteria_preset_id.clone(), Some(text.clone()))
        } else if let Some(ref provided_id) = criteria_preset_id {
            // Resolve provided preset id to criteria text; if not found, fall back to default
            let app_state_snapshot = state
                .0
                .lock()
                .map_err(|e| format!("Failed to lock state: {}", e))?;
            if let Some(preset) = app_state_snapshot.saved_criteria.iter().find(|p| &p.id == provided_id) {
                println!("🔧 [DEBUG] Using provided preset id: id={} name={} ({} chars)", preset.id, preset.name, preset.criteria.len());
                (Some(preset.id.clone()), Some(preset.criteria.clone()))
            } else {
                println!("⚠️ [DEBUG] Provided preset id not found; proceeding with backend default criteria");
                (None, None)
            }
        } else {
            // No preset id (null) -> use backend default (no custom criteria)
            println!("ℹ️ [DEBUG] No preset id provided; proceeding with backend default criteria");
            (None, None)
        }
    };

    let client = reqwest::Client::new();
    let body = json!({
        "target": target,
        "target_yes": target_yes,
        "batch_size": batch_size,
        "num_bio_pages": num_bio_pages,
        // pass through per-job criteria selection
        "criteria_preset_id": active_preset_for_job,
        "criteria_text": criteria_text_for_job
    });
    println!("🛰️ [DEBUG] proxy_remote_scrape -> backend body keys: preset_id_present={} text_present={}",
        body.get("criteria_preset_id").and_then(|v| v.as_str()).is_some(),
        body.get("criteria_text").and_then(|v| v.as_str()).map(|s| !s.is_empty()).unwrap_or(false)
    );
    
    println!("🔍 [DEBUG] Making request to backend with body: {}", serde_json::to_string(&body).unwrap_or_default());
    
    let response = client
        .post(format!("{}/remote-scrape", API_BASE))
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    println!("🔍 [DEBUG] Backend response status: {}", response.status());
    
    let result = response
        .json::<serde_json::Value>()
        .await
        .map_err(|e| e.to_string())?;
    
    println!("🔍 [DEBUG] Backend response: {:?}", result);
    
    // If the operation was queued, save it to persistent storage
    if let Some(status) = result.get("status") {
        if status == "queued" {
            if let Some(operation_id) = result.get("operation").and_then(|op| op.as_str()) {
                let mut app_state = state.0.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
                let operation = ScrapingOperation {
                    operation_id: operation_id.to_string(),
                    target_account: target.clone(),
                    target_count: target_yes,
                    started_at: Utc::now().to_rfc3339(),
                    status: "running".to_string(),
                    results: None,
                    error_message: None,
                    exec_id: result.get("exec_id").and_then(|e| e.as_str()).map(|s| s.to_string()),
                };
                app_state.add_operation(operation)?;
                println!("✅ Operation saved to persistent storage: {}", operation_id);
            }
        } else if status == "completed" {
            // If completed immediately, save the results
            if let Some(results) = result.get("results").and_then(|r| r.as_array()) {
                let mut app_state = state.0.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
                let operation = ScrapingOperation {
                    operation_id: format!("completed_{}", Utc::now().timestamp()),
                    target_account: target.clone(),
                    target_count: target_yes,
                    started_at: Utc::now().to_rfc3339(),
                    status: "completed".to_string(),
                    results: Some(results.clone()),
                    error_message: None,
                    exec_id: None,
                };
                app_state.add_operation(operation)?;
                println!("✅ Completed operation saved to persistent storage");
            }
        }
    }
    
    Ok(result)
}

// ===== Classification Criteria Presets (Saved) =====

#[derive(Serialize, Deserialize, Clone)]
struct SavedCriteriaPreset {
    id: String,
    name: String,
    criteria: String,
    created_at: String,
    updated_at: String,
}

#[tauri::command]
async fn get_saved_criteria(state: State<'_, AppStateManager>) -> Result<serde_json::Value, String> {
    let app_state = state.0.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
    let presets: Vec<serde_json::Value> = app_state.saved_criteria.iter().map(|p| json!({
        "id": p.id,
        "name": p.name,
        "criteria": p.criteria,
        "created_at": p.created_at,
        "updated_at": p.updated_at,
    })).collect();
    Ok(json!({
        "presets": presets,
        "active_id": app_state.active_criteria_id,
    }))
}

#[tauri::command]
async fn create_criteria_preset(name: String, criteria: String, state: State<'_, AppStateManager>) -> Result<String, String> {
    let mut app_state = state.0.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
    app_state.add_criteria_preset(name, criteria)
}

#[tauri::command]
async fn rename_criteria_preset(id: String, name: String, state: State<'_, AppStateManager>) -> Result<(), String> {
    let mut app_state = state.0.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
    app_state.rename_criteria_preset(&id, name)
}

#[tauri::command]
async fn update_criteria_preset_content(id: String, criteria: String, state: State<'_, AppStateManager>) -> Result<(), String> {
    let mut app_state = state.0.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
    app_state.update_criteria_preset(&id, criteria)
}

#[tauri::command]
async fn delete_criteria_preset(id: String, state: State<'_, AppStateManager>) -> Result<(), String> {
    let mut app_state = state.0.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
    app_state.delete_criteria_preset(&id)
}

#[tauri::command]
async fn set_active_criteria(id: Option<String>, state: State<'_, AppStateManager>) -> Result<(), String> {
    let mut app_state = state.0.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
    app_state.set_active_criteria(id)
}


#[tauri::command]
async fn set_todo_criteria_preset(todo_id: String, preset_id: Option<String>, state: State<'_, AppStateManager>) -> Result<(), String> {
    let mut app_state = state.0.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
    // cache human-friendly name
    let name = if let Some(ref pid) = preset_id {
        app_state.saved_criteria.iter().find(|p| &p.id == pid).map(|p| p.name.clone())
    } else { None };
    app_state.set_todo_preset(&todo_id, preset_id.clone())?;
    if let Some(todo) = app_state.todos.iter_mut().find(|t| t.id == todo_id) {
        todo.criteria_preset_name = name;
        app_state.save()?;
    }
    println!("set_todo_criteria_preset: todo_id={} preset_id={:?}", todo_id, preset_id);
    Ok(())
}

#[tauri::command]
async fn proxy_delete_scrape_artifacts(target: String, exec_id: String) -> Result<(), String> {
    // call backend API to delete artifacts
    let client = reqwest::Client::new();
    let url = format!("{}/scrape-artifacts?target={}&exec_id={}", API_BASE, target, exec_id);
    let response = client
        .delete(url)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let status = response.status();
    if !status.is_success() {
        let text = response.text().await.unwrap_or_else(|_| "".into());
        return Err(format!("HTTP {}: {}", status, text));
    }
    Ok(())
}

#[tauri::command]
async fn get_persistent_operations(state: State<'_, AppStateManager>) -> Result<serde_json::Value, String> {
    let app_state = state.0.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
    let operations: Vec<serde_json::Value> = app_state.scraping_operations.iter().map(|op| {
        json!({
            "operation_id": op.operation_id,
            "target_account": op.target_account,
            "target_count": op.target_count,
            "started_at": op.started_at,
            "status": op.status,
            "results": op.results,
            "error_message": op.error_message,
            "exec_id": op.exec_id
        })
    }).collect();
    
    Ok(json!({ "operations": operations }))
}

#[tauri::command]
async fn check_persistent_operation_status(
    operation_id: String,
    state: State<'_, AppStateManager>,
) -> Result<serde_json::Value, String> {
    // First, check if the operation exists and get its current status
    let operation_status = {
        let app_state = state.0.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
        if let Some(operation) = app_state.get_operation(&operation_id) {
            Some(operation.clone())
        } else {
            None
        }
    };
    
    if let Some(operation) = operation_status {
        if operation.status == "running" {
            // Check the actual status from the backend
            // Prefer GCS exec_id if available; fallback to legacy operation id
            let exec_id = operation.exec_id.clone().unwrap_or_default();
            match proxy_scrape_status(exec_id, operation.target_account.clone(), Some(operation.operation_id.clone())).await {
                Ok(status_result) => {
                    if let Some(status) = status_result.get("status").and_then(|s| s.as_str()) {
                        // Update the state based on the backend response
                        let mut app_state = state.0.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
                        
                        if status == "completed" {
                            if let Some(results) = status_result.get("results").and_then(|r| r.as_array()) {
                                app_state.update_operation(&operation_id, "completed", Some(results.clone()), None)?;
                            }
                        } else if status == "failed" {
                            let error_message = status_result.get("message").and_then(|m| m.as_str()).unwrap_or("Unknown error").to_string();
                            app_state.update_operation(&operation_id, "failed", None, Some(error_message))?;
                        }
                        
                        return Ok(status_result);
                    }
                }
                Err(_e) => {
                    // Return the cached status if we can't reach the backend
                    return Ok(json!({
                        "status": operation.status,
                        "results": operation.results,
                        "error_message": operation.error_message
                    }));
                }
            }
        } else {
            // Return cached status for completed/failed operations
            return Ok(json!({
                "status": operation.status,
                "results": operation.results,
                "error_message": operation.error_message
            }));
        }
    }
    
    Err("Operation not found".to_string())
}

#[tauri::command]
async fn clear_completed_operations(state: State<'_, AppStateManager>) -> Result<(), String> {
    let mut app_state = state.0.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
    app_state.clear_completed_operations()
}

#[tauri::command]
async fn remove_persistent_operation(operation_id: String, state: State<'_, AppStateManager>) -> Result<(), String> {
    let mut app_state = state.0.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
    let before = app_state.scraping_operations.len();
    app_state.scraping_operations.retain(|op| op.operation_id != operation_id);
    let after = app_state.scraping_operations.len();
    app_state.save()?;
    println!("✅ Removed operation {} ({} -> {} operations)", operation_id, before, after);
    Ok(())
}

#[tauri::command]
async fn save_file_dialog(content: String, filename: String, _file_type: String) -> Result<(), String> {
    // Get the temp directory
    let dir = dirs::download_dir().unwrap_or_else(|| std::env::temp_dir());
    // Fallback safe: ensure directory exists
    let _ = fs::create_dir_all(&dir);
    let file_path = dir.join(&filename);
    
    // Write the file to temp directory
    fs::write(&file_path, content)
        .map_err(|e| format!("Failed to write file: {}", e))?;
    
    println!("✅ File saved to: {}", file_path.display());
    
    // Open the file with the default application (cross-platform)
    #[cfg(target_os = "macos")]
    {
        let _ = Command::new("open")
            .arg(&file_path)
            .spawn();
    }

    #[cfg(target_os = "windows")]
    {
        if let Some(path_str) = file_path.to_str() {
            // Use cmd's built-in 'start' to open with default app
            let _ = Command::new("cmd")
                .args(["/C", "start", "", path_str])
                .spawn();
        }
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let _ = Command::new("xdg-open")
            .arg(&file_path)
            .spawn();
    }
    
    Ok(())
}

#[tauri::command]
async fn get_classification_criteria() -> Result<serde_json::Value, String> {
    println!("🔍 [DEBUG] Getting classification criteria from: {}", CLASSIFY_API_BASE);
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let url = format!("{}/criteria", CLASSIFY_API_BASE);
    let response = client
        .get(&url)
        .header("User-Agent", "InstaGrap/1.0")
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    let status = response.status();
    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("HTTP error {}: {}", status, error_text));
    }

    let result = response
        .json::<serde_json::Value>()
        .await
        .map_err(|e| format!("Failed to parse JSON response: {}", e))?;
    Ok(result)
}

#[tauri::command]
async fn update_classification_prompt(criteria: String) -> Result<serde_json::Value, String> {
    println!("🔍 [DEBUG] Updating classification criteria...");
    
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    let url = format!("{}/prompt", CLASSIFY_API_BASE);
    // Send only criteria; backend composes header/footer
    let body = json!({ "criteria": criteria });
    
    println!("🔍 [DEBUG] Sending PUT request to: {}", url);
    
    let response = client
        .put(&url)
        .header("Content-Type", "application/json")
        .header("User-Agent", "InstaGrap/1.0")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;
    
    let status = response.status();
    println!("🔍 [DEBUG] Response status: {}", status);
    
    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("HTTP error {}: {}", status, error_text));
    }
    
    let result = response
        .json::<serde_json::Value>()
        .await
        .map_err(|e| format!("Failed to parse JSON response: {}", e))?;
    
    println!("✅ [DEBUG] Classification criteria updated successfully");
    Ok(result)
}

#[tauri::command]
async fn reset_classification_prompt() -> Result<serde_json::Value, String> {
    println!("🔍 [DEBUG] Resetting classification prompt to default...");
    
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    let url = format!("{}/prompt/reset", CLASSIFY_API_BASE);
    let body = json!({}); // Empty JSON body to satisfy Content-Length requirement
    
    println!("🔍 [DEBUG] Sending POST request to: {}", url);
    
    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .header("User-Agent", "InstaGrap/1.0")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;
    
    let status = response.status();
    println!("🔍 [DEBUG] Response status: {}", status);
    
    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("HTTP error {}: {}", status, error_text));
    }
    
    let result = response
        .json::<serde_json::Value>()
        .await
        .map_err(|e| format!("Failed to parse JSON response: {}", e))?;
    
    println!("✅ [DEBUG] Classification prompt reset successfully");
    Ok(result)
}

// Todo System Commands

#[derive(Serialize, Deserialize, Clone)]
struct Todo {
    id: String,
    target_account: String,
    target_count: u32,
    bio_agents: u32,
    batch_size: u32,
    status: String, // "pending", "running", "completed", "failed"
    created_at: String,
    started_at: Option<String>,
    completed_at: Option<String>,
    operation_id: Option<String>,
    exec_id: Option<String>,
    results: Option<Vec<serde_json::Value>>,
    error_message: Option<String>,
    manually_completed: bool,
    // Optional: which preset this todo intends to use
    criteria_preset_id: Option<String>,
    // Cached human-readable name at the moment of selection
    criteria_preset_name: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct CreateTodoRequest {
    target_account: String,
    target_count: u32,
    bio_agents: u32,
    batch_size: u32,
    criteria_preset_id: Option<String>,
}

#[tauri::command]
async fn create_todo(req: CreateTodoRequest, state: State<'_, AppStateManager>) -> Result<(), String> {
    let mut app_state = state.0.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
    // Resolve preset name if id provided
    let criteria_preset_name = if let Some(ref pid) = req.criteria_preset_id {
        app_state.saved_criteria.iter().find(|p| &p.id == pid).map(|p| p.name.clone())
    } else { None };
    let todo = Todo {
        id: Uuid::new_v4().to_string(),
        target_account: req.target_account,
        target_count: req.target_count,
        bio_agents: req.bio_agents,
        batch_size: req.batch_size,
        status: "pending".to_string(),
        created_at: Utc::now().to_rfc3339(),
        started_at: None,
        completed_at: None,
        operation_id: None,
        exec_id: None,
        results: None,
        error_message: None,
        manually_completed: false,
        criteria_preset_id: req.criteria_preset_id,
        criteria_preset_name,
    };
    let todo_id = todo.id.clone();
    app_state.add_todo(todo)?;
    println!("✅ Todo created: {}", todo_id);
    Ok(())
}

#[tauri::command]
async fn get_todos(state: State<'_, AppStateManager>) -> Result<serde_json::Value, String> {
    let app_state = state.0.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
    let todos: Vec<serde_json::Value> = app_state.get_todos().iter().map(|t| {
        json!({
            "id": t.id,
            "target_account": t.target_account,
            "target_count": t.target_count,
            "bio_agents": t.bio_agents,
            "batch_size": t.batch_size,
            "status": t.status,
            "created_at": t.created_at,
            "started_at": t.started_at,
            "completed_at": t.completed_at,
            "operation_id": t.operation_id,
            "exec_id": t.exec_id,
            "results": t.results,
            "error_message": t.error_message,
            "manually_completed": t.manually_completed,
            "criteria_preset_id": t.criteria_preset_id,
            "criteria_preset_name": t.criteria_preset_name,
        })
    }).collect();
    Ok(json!({ "todos": todos }))
}

#[tauri::command]
async fn update_todo_status(
    todo_id: String,
    status: String,
    operation_id: Option<String>,
    exec_id: Option<String>,
    results: Option<Vec<serde_json::Value>>,
    error_message: Option<String>,
    state: State<'_, AppStateManager>,
) -> Result<(), String> {
    let mut app_state = state.0.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
    // First update
    app_state.update_todo(&todo_id, &status, operation_id, results, error_message)?;
    // Optionally persist exec_id on the todo if provided
    if let Some(eid) = exec_id {
        if let Some(todo) = app_state.todos.iter_mut().find(|t| t.id == todo_id) {
            todo.exec_id = Some(eid);
            app_state.save()?;
        }
    }
    println!("✅ Todo {} status updated to {}", todo_id, status);
    Ok(())
}

#[tauri::command]
async fn toggle_todo_manual_complete(todo_id: String, state: State<'_, AppStateManager>) -> Result<(), String> {
    let mut app_state = state.0.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
    app_state.toggle_todo_manual_complete(&todo_id)?;
    println!("✅ Todo {} manually completed toggled", todo_id);
    Ok(())
}

#[tauri::command]
async fn delete_todo(todo_id: String, state: State<'_, AppStateManager>) -> Result<(), String> {
    let mut app_state = state.0.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
    app_state.delete_todo(&todo_id)?;
    println!("✅ Todo {} deleted", todo_id);
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppStateManager::new())
        .invoke_handler(tauri::generate_handler![
            login_and_upload,
            proxy_register_state,
            proxy_login_status,
            proxy_scrape_status,
            proxy_remote_scrape,
            get_persistent_operations,
            check_persistent_operation_status,
            clear_completed_operations,
            save_file_dialog,
            remove_persistent_operation,
            get_classification_criteria,
            update_classification_prompt,
            reset_classification_prompt,
            create_todo,
            get_todos,
            update_todo_status,
            toggle_todo_manual_complete,
            delete_todo,
            proxy_delete_scrape_artifacts,
            // Criteria preset management
            get_saved_criteria,
            create_criteria_preset,
            rename_criteria_preset,
            update_criteria_preset_content,
            delete_criteria_preset,
            set_active_criteria,
            set_todo_criteria_preset
        ])
        .run(tauri::generate_context!())
        .expect("error running tauri");
}
