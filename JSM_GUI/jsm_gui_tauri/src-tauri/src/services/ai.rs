use std::{fs, path::PathBuf, time::Duration};

use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::{AppHandle, Manager};

const AI_SETTINGS_FILE_NAME: &str = "ai-settings.json";
const DEFAULT_TEMPERATURE: f32 = 0.2;
const API_TIMEOUT_SECS: u64 = 45;
const MAX_CONFIG_CHARS: usize = 16_000;
// Keep the model reference synced with the shipped JSM documentation instead of
// maintaining a partial handwritten summary that will drift over time.
const QUICK_REFERENCE: &str = concat!(
  "JoyShockMapper full documentation reference. Treat this as the authoritative feature and command guide when generating configs.\n\n",
  include_str!("../../../src/assets/docs/JSM-docs.md")
);
const SYSTEM_PROMPT: &str = r#"You write JoyShockMapper (JSM) profile text for controller mappings.

Return a json object with exactly these top-level keys:
- summary: short natural-language summary
- configText: plain JSM profile text, no markdown fences
- assumptions: array of short strings
- warnings: array of short strings

Rules:
- This must be valid json.
- configText must contain only JSM profile lines and optional # comments.
- Do not wrap configText in markdown fences.
- Do not include the fixed startup header lines RESET_MAPPINGS, AUTOCONNECT, TELEMETRY_ENABLED, or TELEMETRY_PORT. The app adds them automatically.
- Prefer simple, explicit mappings and conservative settings.
- Only use JSM commands and settings you are reasonably confident exist.
- If the user request is ambiguous, make conservative choices and list them in assumptions.
- If a current profile is supplied, preserve unrelated working lines whenever practical and return the full resulting profile text.
- Never output placeholders like TODO, <fill>, or angle-bracket templates.
"#;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiSettings {
    pub api_key: String,
    pub model: String,
    pub base_url: String,
    pub temperature: f32,
}

impl Default for AiSettings {
    fn default() -> Self {
        Self {
            api_key: String::new(),
            model: String::new(),
            base_url: String::new(),
            temperature: DEFAULT_TEMPERATURE,
        }
    }
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiSettingsInput {
    pub api_key: String,
    pub model: Option<String>,
    pub base_url: Option<String>,
    pub temperature: Option<f32>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateMappingRequest {
    pub user_prompt: String,
    pub current_config: Option<String>,
    pub current_profile_name: Option<String>,
    pub include_current_config: Option<bool>,
    pub conversation_history: Option<Vec<ConversationMessage>>,
    pub locale: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversationMessage {
    pub role: String,
    pub content: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateMappingResponse {
    pub summary: String,
    pub config_text: String,
    pub assumptions: Vec<String>,
    pub warnings: Vec<String>,
    pub model: String,
}

#[derive(Debug, Deserialize)]
struct ChatCompletionResponse {
    choices: Vec<ChatChoice>,
}

#[derive(Debug, Deserialize)]
struct ChatChoice {
    message: ChatMessage,
}

#[derive(Debug, Deserialize)]
struct ChatMessage {
    content: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ApiErrorEnvelope {
    error: Option<ApiErrorBody>,
}

#[derive(Debug, Deserialize)]
struct ApiErrorBody {
    message: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ModelResponse {
    #[serde(default)]
    summary: String,
    #[serde(default, alias = "config_text")]
    config_text: String,
    #[serde(default)]
    assumptions: Vec<String>,
    #[serde(default)]
    warnings: Vec<String>,
}

pub fn load_settings(app: &AppHandle) -> Result<AiSettings, String> {
    let path = settings_file(app)?;
    let raw = match fs::read_to_string(path) {
        Ok(value) => value,
        Err(_) => return Ok(AiSettings::default()),
    };

    let stored = serde_json::from_str::<AiSettings>(&raw)
        .map_err(|error| format!("Failed to parse AI settings: {error}"))?;
    Ok(normalize_settings(stored))
}

pub fn save_settings(app: &AppHandle, input: AiSettingsInput) -> Result<AiSettings, String> {
    let settings = normalize_settings(AiSettings {
        api_key: input.api_key.trim().to_string(),
        model: input.model.unwrap_or_default(),
        base_url: input.base_url.unwrap_or_default(),
        temperature: input.temperature.unwrap_or(DEFAULT_TEMPERATURE),
    });

    let path = settings_file(app)?;
    ensure_parent_dir(&path)?;
    let content = serde_json::to_string_pretty(&settings)
        .map_err(|error| format!("Failed to serialize AI settings: {error}"))?;
    fs::write(path, content).map_err(|error| format!("Failed to save AI settings: {error}"))?;
    Ok(settings)
}

pub async fn generate_mapping(
    app: &AppHandle,
    request: GenerateMappingRequest,
) -> Result<GenerateMappingResponse, String> {
    let settings = load_settings(app)?;
    if settings.api_key.is_empty() {
        return Err("AI API key is empty. Save your AI settings first.".to_string());
    }
    if settings.model.is_empty() {
        return Err("AI model is empty. Save your AI settings first.".to_string());
    }
    if settings.base_url.is_empty() {
        return Err("AI API base URL is empty. Save your AI settings first.".to_string());
    }

    let user_prompt = request.user_prompt.trim();
    if user_prompt.is_empty() {
        return Err("Describe the mapping you want before generating.".to_string());
    }

    let client = Client::builder()
        .timeout(Duration::from_secs(API_TIMEOUT_SECS))
        .build()
        .map_err(|error| format!("Failed to initialize HTTP client: {error}"))?;

    let endpoint = format!(
        "{}/chat/completions",
        settings.base_url.trim_end_matches('/')
    );
    let payload = json!({
      "model": settings.model,
      "temperature": settings.temperature,
      "max_tokens": 1800,
      "messages": build_messages(&request)
    });

    let response = client
        .post(endpoint)
        .bearer_auth(&settings.api_key)
        .json(&payload)
        .send()
        .await
        .map_err(|error| format!("Failed to call AI API: {error}"))?;

    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|error| format!("Failed to read AI API response: {error}"))?;

    if !status.is_success() {
        return Err(format!(
            "AI API request failed ({}): {}",
            status.as_u16(),
            extract_api_error(&body)
        ));
    }

    let parsed = serde_json::from_str::<ChatCompletionResponse>(&body)
        .map_err(|error| format!("Failed to parse AI API response: {error}"))?;
    let raw_content = parsed
        .choices
        .into_iter()
        .next()
        .and_then(|choice| choice.message.content)
        .ok_or_else(|| "AI API returned no message content.".to_string())?;

    let model_response = parse_model_response(&raw_content)?;
    let config_text = model_response.config_text.trim().to_string();
    if config_text.is_empty() {
        return Err("AI model returned an empty configText field.".to_string());
    }

    Ok(GenerateMappingResponse {
        summary: model_response.summary.trim().to_string(),
        config_text,
        assumptions: trim_list(model_response.assumptions),
        warnings: trim_list(model_response.warnings),
        model: settings.model,
    })
}

fn build_user_prompt(request: &GenerateMappingRequest) -> String {
    let explanation_language = match request.locale.as_deref() {
        Some(locale) if locale.to_ascii_lowercase().starts_with("zh") => "Simplified Chinese",
        _ => "English",
    };
    let include_current = request.include_current_config.unwrap_or(true);
    let profile_name = request
        .current_profile_name
        .as_deref()
        .unwrap_or("Unsaved profile");
    let current_config = if include_current {
        normalize_current_config(request.current_config.as_deref())
    } else {
        None
    };

    let current_config_block = match current_config {
    Some(config) => format!(
      "Current profile name: {profile_name}\nCurrent profile text (full profile, preserve unrelated lines when practical):\n```txt\n{config}\n```"
    ),
    None => "Current profile text: none supplied. Start from scratch.".to_string(),
  };

    format!(
        "Generate a json object for the latest turn of a JoyShockMapper mapping conversation.\n\
Explain summary, assumptions, and warnings in {explanation_language}.\n\
Use conservative defaults when the request is underspecified.\n\
{current_config_block}\n\n\
{QUICK_REFERENCE}\n\
Latest user request:\n{}\n",
        request.user_prompt.trim()
    )
}

fn build_messages(request: &GenerateMappingRequest) -> Vec<Value> {
    let mut messages = vec![json!({
      "role": "system",
      "content": SYSTEM_PROMPT,
    })];

    if let Some(history) = &request.conversation_history {
        for entry in history {
            let role = entry.role.trim().to_ascii_lowercase();
            let content = entry.content.trim();
            if content.is_empty() || !matches!(role.as_str(), "user" | "assistant") {
                continue;
            }
            messages.push(json!({
              "role": role,
              "content": content,
            }));
        }
    }

    messages.push(json!({
      "role": "user",
      "content": build_user_prompt(request),
    }));

    messages
}

fn normalize_current_config(value: Option<&str>) -> Option<String> {
    let trimmed = value?.trim();
    if trimmed.is_empty() {
        return None;
    }

    let normalized = if trimmed.chars().count() > MAX_CONFIG_CHARS {
        let truncated = trimmed.chars().take(MAX_CONFIG_CHARS).collect::<String>();
        format!("{truncated}\n# ... truncated by the app before sending to the model")
    } else {
        trimmed.to_string()
    };

    Some(normalized)
}

fn parse_model_response(raw_content: &str) -> Result<ModelResponse, String> {
    let payload = extract_json_payload(raw_content);
    serde_json::from_str::<ModelResponse>(&payload).map_err(|error| {
        format!(
            "Failed to parse model json output: {error}. Raw content: {}",
            raw_content.trim()
        )
    })
}

fn extract_json_payload(raw_content: &str) -> String {
    let trimmed = raw_content.trim();
    let without_fences = trimmed
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();

    match (without_fences.find('{'), without_fences.rfind('}')) {
        (Some(start), Some(end)) if end >= start => without_fences[start..=end].to_string(),
        _ => without_fences.to_string(),
    }
}

fn trim_list(items: Vec<String>) -> Vec<String> {
    items
        .into_iter()
        .map(|item| item.trim().to_string())
        .filter(|item| !item.is_empty())
        .collect()
}

fn extract_api_error(body: &str) -> String {
    serde_json::from_str::<ApiErrorEnvelope>(body)
        .ok()
        .and_then(|value| value.error)
        .and_then(|error| error.message)
        .unwrap_or_else(|| body.trim().to_string())
}

fn normalize_settings(settings: AiSettings) -> AiSettings {
    let model = settings.model.trim();
    let base_url = settings.base_url.trim();
    AiSettings {
        api_key: settings.api_key.trim().to_string(),
        model: model.to_string(),
        base_url: base_url.trim_end_matches('/').to_string(),
        temperature: settings.temperature.clamp(0.0, 2.0),
    }
}

fn settings_file(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Failed to resolve app data directory: {error}"))?
        .join(AI_SETTINGS_FILE_NAME))
}

fn ensure_parent_dir(path: &PathBuf) -> Result<(), String> {
    match path.parent() {
        Some(parent) => fs::create_dir_all(parent)
            .map_err(|error| format!("Failed to create directory {}: {error}", parent.display())),
        None => Ok(()),
    }
}

#[allow(dead_code)]
fn _debug_payload(value: &Value) -> String {
    serde_json::to_string_pretty(value).unwrap_or_default()
}
