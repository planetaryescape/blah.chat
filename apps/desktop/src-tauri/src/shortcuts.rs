use tauri::AppHandle;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

use tracing::{info, warn};

use crate::error::AppError;
use crate::settings::DesktopState;
use crate::validation::validate_shortcut;

pub fn unregister_current_shortcut(
    app: &AppHandle,
    state: &DesktopState,
) -> Result<(), AppError> {
    let manager = app.global_shortcut();
    let mut current = state.shortcut.write()?;

    if current.is_empty() {
        return Ok(());
    }

    let old: Shortcut = current
        .parse()
        .map_err(|err| AppError::Shortcut(format!("invalid existing shortcut {}: {err}", *current)))?;

    if manager.is_registered(old) {
        manager
            .unregister(old)
            .map_err(|err| AppError::Shortcut(err.to_string()))?;
    }

    current.clear();
    Ok(())
}

pub fn register_shortcut_impl(
    app: &AppHandle,
    shortcut: &str,
    state: &DesktopState,
) -> Result<(), AppError> {
    validate_shortcut(shortcut)?;

    let parsed: Shortcut = shortcut
        .parse()
        .map_err(|err| AppError::Shortcut(format!("invalid shortcut {shortcut}: {err}")))?;

    unregister_current_shortcut(app, state)?;

    let manager = app.global_shortcut();
    manager
        .register(parsed)
        .map_err(|err| AppError::Shortcut(err.to_string()))?;

    let mut current = state.shortcut.write()?;
    *current = shortcut.to_string();
    Ok(())
}

pub fn apply_settings(
    app: &AppHandle,
    settings: &crate::settings::DesktopSettings,
    state: &DesktopState,
) -> Result<(), AppError> {
    if !settings.companion_enabled {
        unregister_current_shortcut(app, state)?;
        if let Some(window) = app.get_webview_window(crate::windows::COMPANION_LABEL) {
            if let Err(err) = window.close() {
                warn!(error = %err, "failed to close companion window");
            }
        }
        return Ok(());
    }

    info!(shortcut = %settings.companion_shortcut, "registering companion shortcut");
    register_shortcut_impl(app, settings.companion_shortcut.as_str(), state)?;
    if let Some(window) = app.get_webview_window(crate::windows::COMPANION_LABEL) {
        window
            .set_always_on_top(settings.companion_always_on_top)
            .map_err(|err| AppError::Window(err.to_string()))?;
    }
    Ok(())
}

use tauri::Manager;
