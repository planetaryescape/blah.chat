use std::sync::Mutex;

use serde::Serialize;
use tauri::AppHandle;
use tauri_plugin_updater::{Update, UpdaterExt};

use crate::error::AppError;

#[derive(Default)]
pub struct DesktopUpdaterState {
    pub pending_update: Mutex<Option<Update>>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopUpdateInfo {
    pub version: String,
    pub current_version: String,
    pub body: Option<String>,
    pub published_at: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopUpdateStatus {
    pub enabled: bool,
    pub available: bool,
    pub update: Option<DesktopUpdateInfo>,
    pub error: Option<String>,
}

pub fn is_updater_disabled_error(message: &str) -> bool {
    message.contains("Updater does not have any endpoints set")
        || message.contains("state not managed")
        || message.contains("missing field `pubkey`")
}

fn map_update_info(update: &Update) -> DesktopUpdateInfo {
    DesktopUpdateInfo {
        version: update.version.clone(),
        current_version: update.current_version.clone(),
        body: update.body.clone(),
        published_at: update.date.map(|date| date.to_string()),
    }
}

pub fn cached_update(app: &AppHandle) -> Result<Option<Update>, AppError> {
    let state = app.state::<DesktopUpdaterState>();
    let guard = state.pending_update.lock().map_err(|err| AppError::Lock(err.to_string()))?;
    Ok(guard.clone())
}

pub fn set_cached_update(app: &AppHandle, update: Option<Update>) -> Result<(), AppError> {
    let state = app.state::<DesktopUpdaterState>();
    let mut locked = state.pending_update.lock().map_err(|err| AppError::Lock(err.to_string()))?;
    *locked = update;
    Ok(())
}

pub async fn perform_update_check(app: &AppHandle, force: bool) -> DesktopUpdateStatus {
    if !force {
        if let Ok(Some(update)) = cached_update(app) {
            return DesktopUpdateStatus {
                enabled: true,
                available: true,
                update: Some(map_update_info(&update)),
                error: None,
            };
        }
    }

    let updater = match app.updater() {
        Ok(updater) => updater,
        Err(err) => {
            let message = err.to_string();
            if is_updater_disabled_error(&message) {
                let _ = set_cached_update(app, None);
                return DesktopUpdateStatus {
                    enabled: false,
                    available: false,
                    update: None,
                    error: None,
                };
            }
            return DesktopUpdateStatus {
                enabled: true,
                available: false,
                update: None,
                error: Some(message),
            };
        }
    };

    match updater.check().await {
        Ok(Some(update)) => {
            let info = map_update_info(&update);
            let _ = set_cached_update(app, Some(update));
            DesktopUpdateStatus {
                enabled: true,
                available: true,
                update: Some(info),
                error: None,
            }
        }
        Ok(None) => {
            let _ = set_cached_update(app, None);
            DesktopUpdateStatus {
                enabled: true,
                available: false,
                update: None,
                error: None,
            }
        }
        Err(err) => {
            let message = err.to_string();
            if is_updater_disabled_error(&message) {
                let _ = set_cached_update(app, None);
                return DesktopUpdateStatus {
                    enabled: false,
                    available: false,
                    update: None,
                    error: None,
                };
            }

            DesktopUpdateStatus {
                enabled: true,
                available: false,
                update: None,
                error: Some(message),
            }
        }
    }
}

use tauri::Manager;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_updater_disabled_error() {
        assert!(is_updater_disabled_error(
            "Updater does not have any endpoints set"
        ));
        assert!(is_updater_disabled_error("state not managed for plugin"));
        assert!(is_updater_disabled_error("missing field `pubkey`"));
        assert!(!is_updater_disabled_error("network timeout"));
    }
}
