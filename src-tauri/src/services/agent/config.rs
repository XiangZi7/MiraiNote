//! AI credentials never enter generic frontend settings or logs.
use super::limits::Limits;
use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Config {
    #[serde(default)]
    pub limits: Limits,
    #[serde(default)]
    pub api_format: ApiFormat,
    pub enabled: bool,
    pub base_url: String,
    pub model: String,
    #[serde(default)]
    pub api_key: String,
}
impl Default for Config {
    fn default() -> Self {
        Self {
            limits: Limits::default(),
            api_format: ApiFormat::Openai,
            enabled: false,
            base_url: "https://api.openai.com/v1".into(),
            model: String::new(),
            api_key: String::new(),
        }
    }
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PublicConfig {
    pub limits: Limits,
    pub id: String,
    pub name: String,
    pub api_format: ApiFormat,
    pub enabled: bool,
    pub base_url: String,
    pub model: String,
    pub has_api_key: bool,
}
impl Config {
    pub fn public(&self, id: &str, name: &str) -> PublicConfig {
        PublicConfig {
            limits: self.limits,
            id: id.into(),
            name: name.into(),
            api_format: self.api_format,
            enabled: self.enabled,
            base_url: self.base_url.clone(),
            model: self.model.clone(),
            has_api_key: !self.api_key.is_empty(),
        }
    }
    pub fn ready(&self) -> AppResult<()> {
        self.limits.validate()?;
        validate_url(&self.base_url)?;
        if !self.enabled || self.model.trim().is_empty() {
            return Err(AppError::invalid_input(
                "请先在设置 → AI Agent 中启用并填写模型",
            ));
        }
        Ok(())
    }
}
pub fn validate_url(raw: &str) -> AppResult<reqwest::Url> {
    let url = reqwest::Url::parse(raw).map_err(|_| AppError::invalid_input("API 地址无效"))?;
    let local = matches!(url.host_str(), Some("localhost" | "127.0.0.1" | "[::1]"));
    if (url.scheme() != "https" && !(url.scheme() == "http" && local))
        || url.host_str().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.query().is_some()
        || url.fragment().is_some()
    {
        return Err(AppError::invalid_input(
            "API 地址必须使用 HTTPS（本机可用 HTTP），不能包含账号、查询参数或片段",
        ));
    }
    Ok(url)
}
#[derive(Clone, Copy, Default, Deserialize, Serialize, PartialEq, Eq, Debug)]
#[serde(rename_all = "lowercase")]
pub enum ApiFormat {
    #[default]
    Openai,
    Anthropic,
}
#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub config: Config,
}
#[derive(Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Settings {
    pub active_id: String,
    pub profiles: Vec<Profile>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PublicSettings {
    pub active_id: String,
    pub profiles: Vec<PublicConfig>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProfileInput {
    pub id: Option<String>,
    pub name: String,
    pub config: Config,
}
impl Settings {
    pub fn public(&self) -> PublicSettings {
        PublicSettings {
            active_id: self.active_id.clone(),
            profiles: self
                .profiles
                .iter()
                .map(|p| p.config.public(&p.id, &p.name))
                .collect(),
        }
    }
    pub fn profile(&self, id: &str) -> AppResult<&Profile> {
        self.profiles
            .iter()
            .find(|p| p.id == id)
            .ok_or_else(|| AppError::invalid_input("AI 配置不存在，请重新选择或添加配置"))
    }
    pub fn active(&self) -> AppResult<Config> {
        Ok(self.profile(&self.active_id)?.config.clone())
    }
    pub fn upsert(&mut self, input: ProfileInput, clear_key: bool) -> AppResult<()> {
        let name = input.name.trim();
        if name.is_empty() || name.chars().count() > 80 || name.chars().any(char::is_control) {
            return Err(AppError::invalid_input("请填写配置名称（最多 80 字）"));
        }
        let previous = match input.id.as_deref() {
            Some(id) => self.profile(id)?.config.clone(),
            None => Config::default(),
        };
        let config = resolve_credentials(input.config, previous, clear_key)?;
        if config.enabled {
            config.ready()?;
        }
        if let Some(id) = input.id {
            let profile = self
                .profiles
                .iter_mut()
                .find(|p| p.id == id)
                .ok_or_else(|| AppError::invalid_input("AI 配置不存在"))?;
            profile.name = name.into();
            profile.config = config;
            self.active_id = id;
        } else {
            if self.profiles.len() >= 100 {
                return Err(AppError::invalid_input("最多保存 100 个 AI 配置"));
            }
            let id = uuid::Uuid::new_v4().to_string();
            self.profiles.push(Profile {
                id: id.clone(),
                name: name.into(),
                config,
            });
            self.active_id = id;
        }
        Ok(())
    }
    pub fn activate(&mut self, id: &str) -> AppResult<()> {
        self.profile(id)?.config.ready()?;
        self.active_id = id.into();
        Ok(())
    }
    pub fn remove(&mut self, id: &str) -> AppResult<()> {
        self.profile(id)?;
        self.profiles.retain(|p| p.id != id);
        if self.active_id == id {
            // Deletion must not silently route the next prompt to another provider.
            self.active_id.clear();
        }
        Ok(())
    }
}
fn decode(bytes: &[u8]) -> AppResult<Settings> {
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum Stored {
        Current(Settings),
        Legacy(Config),
    }
    let result = serde_json::from_slice::<Stored>(bytes)
        .map_err(|_| AppError::internal("AI 设置损坏，无法读取"))?;
    Ok(match result {
        Stored::Current(settings) => settings,
        Stored::Legacy(config) => Settings {
            active_id: "legacy-default".into(),
            profiles: vec![Profile {
                id: "legacy-default".into(),
                name: "原有配置".into(),
                config,
            }],
        },
    })
}
pub fn read(app: &AppHandle) -> AppResult<Settings> {
    let path = app
        .path()
        .app_data_dir()
        .map_err(|_| AppError::internal("无法定位设置目录"))?
        .join("ai-settings.bin");
    match std::fs::read(path) {
        Ok(bytes) => decode(&protect(&bytes, false)?),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(Settings::default()),
        Err(error) => Err(error.into()),
    }
}
// Shared by saving and model discovery; resolving a draft never persists it.
pub(super) fn resolve_credentials(
    mut next: Config,
    previous: Config,
    clear_key: bool,
) -> AppResult<Config> {
    next.limits.validate()?;
    next.base_url = next.base_url.trim().trim_end_matches('/').into();
    next.model = next.model.trim().into();
    next.api_key = next.api_key.trim().into();
    validate_url(&next.base_url)?;
    if next.model.len() > 200 || next.api_key.len() > 8192 || next.api_key.contains(['\r', '\n']) {
        return Err(AppError::invalid_input("模型或密钥格式无效"));
    }
    if clear_key {
        next.api_key.clear();
    } else if next.api_key.is_empty() {
        if next.base_url != previous.base_url && !previous.api_key.is_empty() {
            return Err(AppError::invalid_input(
                "更换服务地址时请重新输入密钥或选择清除旧密钥，避免将旧密钥发送到其他服务",
            ));
        }
        next.api_key = previous.api_key;
    }
    Ok(next)
}
pub fn save(app: &AppHandle, next: &Settings) -> AppResult<PublicSettings> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|_| AppError::internal("无法定位设置目录"))?;
    std::fs::create_dir_all(&dir)?;
    let bytes = serde_json::to_vec(&next).map_err(|_| AppError::internal("保存 AI 设置失败"))?;
    // Entire file is encrypted for the current OS user; never write a plaintext temp file.
    let temporary = dir.join("ai-settings.bin.tmp");
    let encrypted = protect(&bytes, true)?;
    use std::io::Write;
    let mut file = std::fs::File::create(&temporary)?;
    file.write_all(&encrypted)?;
    file.sync_all()?;
    drop(file);
    std::fs::rename(&temporary, dir.join("ai-settings.bin"))?;
    Ok(next.public())
}
#[cfg(windows)]
pub(super) fn protect(bytes: &[u8], encrypt: bool) -> AppResult<Vec<u8>> {
    use windows::Win32::{
        Foundation::{LocalFree, HLOCAL},
        Security::Cryptography::{
            CryptProtectData, CryptUnprotectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
        },
    };
    let input = CRYPT_INTEGER_BLOB {
        cbData: bytes.len() as u32,
        pbData: bytes.as_ptr() as *mut u8,
    };
    let mut output = CRYPT_INTEGER_BLOB::default();
    unsafe {
        let result = if encrypt {
            CryptProtectData(
                &input,
                windows::core::PCWSTR::null(),
                None,
                None,
                None,
                CRYPTPROTECT_UI_FORBIDDEN,
                &mut output,
            )
        } else {
            CryptUnprotectData(
                &input,
                None,
                None,
                None,
                None,
                CRYPTPROTECT_UI_FORBIDDEN,
                &mut output,
            )
        };
        result.map_err(|_| AppError::internal("Windows 凭据加密/解密失败"))?;
        let data = std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec();
        let _ = LocalFree(Some(HLOCAL(output.pbData as _)));
        Ok(data)
    }
}
#[cfg(not(windows))]
pub(super) fn protect(_bytes: &[u8], _encrypt: bool) -> AppResult<Vec<u8>> {
    Err(AppError::invalid_input(
        "此平台尚未接入系统密钥存储，AI 配置暂不可保存",
    ))
}

pub(super) fn client() -> AppResult<reqwest::Client> {
    let _ = rustls::crypto::ring::default_provider().install_default();
    reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .connect_timeout(std::time::Duration::from_secs(10))
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|_| AppError::internal("无法创建模型客户端"))
}
pub async fn completion(
    config: &Config,
    messages: &[serde_json::Value],
    tools: Option<serde_json::Value>,
) -> AppResult<serde_json::Value> {
    super::protocol::completion(config, messages, tools).await
}
pub(super) async fn request_json(request: reqwest::RequestBuilder) -> AppResult<serde_json::Value> {
    let mut response = request.send().await.map_err(|_| {
        AppError::internal("模型请求失败，请检查网络、证书及 API 地址（60 秒超时）")
    })?;
    if !response.status().is_success() {
        return Err(AppError::internal(format!(
            "模型服务返回 HTTP {}，请检查地址、模型、密钥与额度",
            response.status().as_u16()
        )));
    }
    let mut bytes = Vec::new();
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|_| AppError::internal("读取模型响应失败"))?
    {
        if bytes.len() + chunk.len() > 1_048_576 {
            return Err(AppError::invalid_input("模型响应超过 1 MB 限制"));
        }
        bytes.extend_from_slice(&chunk);
    }
    serde_json::from_slice(&bytes).map_err(|_| AppError::invalid_input("模型响应不是有效 JSON"))
}
#[cfg(test)]
mod tests {
    use super::*;
    fn input(id: Option<&str>, name: &str, url: &str, key: &str) -> ProfileInput {
        ProfileInput {
            id: id.map(str::to_owned),
            name: name.into(),
            config: Config {
                enabled: true,
                base_url: url.into(),
                model: "test-model".into(),
                api_key: key.into(),
                ..Config::default()
            },
        }
    }
    #[test]
    fn migrates_old_encrypted_payload_without_losing_key_or_enablement() {
        let settings = decode(br#"{"enabled":true,"baseUrl":"https://old.example/v1","model":"old-model","apiKey":"old-test-key"}"#).unwrap();
        assert_eq!(settings.active_id, "legacy-default");
        let active = settings.active().unwrap();
        assert_eq!(active.api_key, "old-test-key");
        assert_eq!(active.api_format, ApiFormat::Openai);
        assert_eq!(active.limits, Limits::default());
        let serialized = serde_json::to_vec(&settings).unwrap();
        assert_eq!(
            decode(&serialized).unwrap().active().unwrap().model,
            "old-model"
        );
        let public = serde_json::to_string(&settings.public()).unwrap();
        assert!(!public.contains("old-test-key"));
        assert!(public.contains("hasApiKey"));
        assert!(decode(br#"{"unexpected":true}"#).is_err());
    }
    #[test]
    fn capacity_is_migrated_and_persisted_per_profile() {
        let mut settings = decode(br#"{"activeId":"old","profiles":[{"id":"old","name":"Existing","config":{"enabled":true,"baseUrl":"https://same.example/v1","model":"test-model"}}]}"#).unwrap();
        assert_eq!(settings.active().unwrap().limits, Limits::default());
        let mut expanded = input(None, "Expanded", "https://same.example/v1", "test-key");
        let limits = Limits {
            max_steps: 32,
            max_context_kb: 1000,
            max_messages: 256,
        };
        expanded.config.limits = limits;
        settings.upsert(expanded, false).unwrap();
        let saved = decode(&serde_json::to_vec(&settings).unwrap()).unwrap();
        assert_eq!(saved.active().unwrap().limits, limits);
        assert_eq!(
            saved.profile("old").unwrap().config.limits,
            Limits::default()
        );
        assert_eq!(saved.public().profiles[1].limits, limits);
        assert!(saved.active().unwrap().limits.check_request(8, &[]).is_ok());
        let mut invalid = input(Some("old"), "Invalid", "https://same.example/v1", "");
        invalid.config.enabled = false;
        invalid.config.limits.max_steps = 0;
        assert!(settings.upsert(invalid, false).is_err());
        assert_eq!(settings.profile("old").unwrap().name, "Existing");
    }
    #[test]
    fn multiple_profiles_isolate_keys_and_reject_stale_updates() {
        let mut settings = Settings::default();
        settings
            .upsert(
                input(None, "Official", "https://same.example/v1", "key-a"),
                false,
            )
            .unwrap();
        let first = settings.active_id.clone();
        settings
            .upsert(
                input(None, "Relay", "https://same.example/v1", "key-b"),
                false,
            )
            .unwrap();
        let second = settings.active_id.clone();
        settings
            .upsert(
                input(Some(&first), "Renamed", "https://same.example/v1", ""),
                false,
            )
            .unwrap();
        assert_eq!(settings.active().unwrap().api_key, "key-a");
        assert_eq!(settings.profile(&second).unwrap().config.api_key, "key-b");
        assert!(settings
            .upsert(
                input(Some(&first), "Official", "https://other.example/v1", ""),
                false
            )
            .is_err());
        settings
            .upsert(input(None, "No key", "https://same.example/v1", ""), false)
            .unwrap();
        assert!(settings.active().unwrap().api_key.is_empty());
        settings.activate(&second).unwrap();
        assert_eq!(settings.active().unwrap().api_key, "key-b");
        settings.remove(&second).unwrap();
        assert!(settings.active_id.is_empty());
        assert!(settings.activate(&second).is_err());
        assert!(settings
            .upsert(
                input(Some(&second), "Stale", "https://same.example/v1", ""),
                false
            )
            .is_err());
        settings
            .upsert(
                input(
                    Some(&first),
                    "Official",
                    "https://same.example/v1",
                    "ignored",
                ),
                true,
            )
            .unwrap();
        assert!(settings.active().unwrap().api_key.is_empty());
    }
    #[test]
    fn endpoint_policy() {
        for url in [
            "https://api.openai.com/v1",
            "http://localhost:11434/v1",
            "http://127.0.0.1:1234/v1",
            "http://[::1]:1234/v1",
        ] {
            assert!(validate_url(url).is_ok(), "{url}");
        }
        for url in [
            "http://example.com/v1",
            "https://user:secret@example.com",
            "file:///key",
            "https://a.com?k=secret",
            "https://a.com/#token",
        ] {
            assert!(validate_url(url).is_err(), "{url}");
        }
    }
    #[cfg(windows)]
    #[test]
    fn encrypted_round_trip() {
        let plain = b"test-key-not-a-real-credential";
        let ciphertext = protect(plain, true).unwrap();
        assert_ne!(ciphertext, plain);
        assert_eq!(protect(&ciphertext, false).unwrap(), plain);
    }
}
