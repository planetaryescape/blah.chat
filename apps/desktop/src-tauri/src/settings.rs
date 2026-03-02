use std::sync::RwLock;

use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

use crate::error::AppError;

pub const SETTINGS_STORE_FILE: &str = "desktop-settings.json";

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopSettings {
    pub companion_enabled: bool,
    pub companion_shortcut: String,
    pub companion_always_on_top: bool,
    pub launch_at_login: bool,
    pub notifications_enabled: bool,
}

impl Default for DesktopSettings {
    fn default() -> Self {
        Self {
            companion_enabled: true,
            companion_shortcut: crate::DEFAULT_SHORTCUT.to_string(),
            companion_always_on_top: true,
            launch_at_login: false,
            notifications_enabled: true,
        }
    }
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PartialDesktopSettings {
    pub companion_enabled: Option<bool>,
    pub companion_shortcut: Option<String>,
    pub companion_always_on_top: Option<bool>,
    pub launch_at_login: Option<bool>,
    pub notifications_enabled: Option<bool>,
}

#[derive(Default)]
pub struct DesktopState {
    pub shortcut: RwLock<String>,
    pub settings: RwLock<DesktopSettings>,
}

pub fn load_settings(app: &AppHandle) -> Result<DesktopSettings, AppError> {
    let store = app
        .store(SETTINGS_STORE_FILE)
        .map_err(|err| AppError::Settings(err.to_string()))?;

    let mut settings = DesktopSettings::default();
    if let Some(value) = store.get("companionEnabled").and_then(|v| v.as_bool()) {
        settings.companion_enabled = value;
    }
    if let Some(value) = store.get("companionShortcut").and_then(|v| v.as_str().map(String::from))
    {
        settings.companion_shortcut = value;
    }
    if let Some(value) = store
        .get("companionAlwaysOnTop")
        .and_then(|v| v.as_bool())
    {
        settings.companion_always_on_top = value;
    }
    if let Some(value) = store.get("launchAtLogin").and_then(|v| v.as_bool()) {
        settings.launch_at_login = value;
    }
    if let Some(value) = store
        .get("notificationsEnabled")
        .and_then(|v| v.as_bool())
    {
        settings.notifications_enabled = value;
    }

    Ok(settings)
}

pub fn persist_settings(app: &AppHandle, settings: &DesktopSettings) -> Result<(), AppError> {
    let store = app
        .store(SETTINGS_STORE_FILE)
        .map_err(|err| AppError::Settings(err.to_string()))?;
    store.set("companionEnabled", serde_json::json!(settings.companion_enabled));
    store.set(
        "companionShortcut",
        serde_json::json!(settings.companion_shortcut),
    );
    store.set(
        "companionAlwaysOnTop",
        serde_json::json!(settings.companion_always_on_top),
    );
    store.set("launchAtLogin", serde_json::json!(settings.launch_at_login));
    store.set(
        "notificationsEnabled",
        serde_json::json!(settings.notifications_enabled),
    );
    store.save().map_err(|err| AppError::Settings(err.to_string()))
}
