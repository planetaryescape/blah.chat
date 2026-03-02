#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod deep_link;
mod error;
mod settings;
mod shortcuts;
mod tray;
mod updater;
mod validation;
mod windows;

use std::sync::RwLock;

use tauri::{AppHandle, Emitter, Listener, Manager};
#[cfg(debug_assertions)]
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_global_shortcut::{Shortcut, ShortcutState};
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_updater::UpdaterExt;

use crate::error::AppError;
use crate::settings::{DesktopSettings, DesktopState, PartialDesktopSettings};
use crate::updater::{DesktopUpdateStatus, DesktopUpdaterState};

pub const DEFAULT_WEB_ORIGIN: &str = "https://blah.chat";
pub const DEFAULT_SHORTCUT: &str = "Alt+Space";

// --- IPC Commands ---

#[tauri::command]
fn open_main_window(app: AppHandle, route: Option<String>) -> Result<(), AppError> {
    windows::ensure_main_window(&app, route)
}

#[tauri::command]
fn open_companion(app: AppHandle, route: Option<String>) -> Result<(), AppError> {
    let enabled = app
        .state::<DesktopState>()
        .settings
        .read()
        .map_err(|err| AppError::Lock(err.to_string()))?
        .companion_enabled;
    if !enabled {
        app.notification()
            .builder()
            .title("Companion disabled")
            .body("Enable it in Settings > Desktop")
            .show()
            .map_err(|err| AppError::Notification(err.to_string()))?;
        return Ok(());
    }
    windows::ensure_companion_window(&app, route)
}

#[tauri::command]
fn show_notification(app: AppHandle, title: String, body: String) -> Result<(), AppError> {
    validation::validate_notification(&title, &body)?;

    let state = app.state::<DesktopState>();
    let notifications_enabled = state.settings.read()?.notifications_enabled;
    if !notifications_enabled {
        return Ok(());
    }

    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|err| AppError::Notification(err.to_string()))
}

#[tauri::command]
fn get_desktop_settings(state: tauri::State<'_, DesktopState>) -> Result<DesktopSettings, AppError> {
    Ok(state.settings.read()?.clone())
}

#[tauri::command]
fn set_desktop_settings(
    app: AppHandle,
    settings: PartialDesktopSettings,
    state: tauri::State<'_, DesktopState>,
) -> Result<DesktopSettings, AppError> {
    let current = state.settings.read()?.clone();

    let mut next = current;
    if let Some(enabled) = settings.companion_enabled {
        next.companion_enabled = enabled;
    }
    if let Some(shortcut) = settings.companion_shortcut {
        next.companion_shortcut = shortcut;
    }
    if let Some(always) = settings.companion_always_on_top {
        next.companion_always_on_top = always;
    }
    if let Some(launch) = settings.launch_at_login {
        next.launch_at_login = launch;
    }
    if let Some(notif) = settings.notifications_enabled {
        next.notifications_enabled = notif;
    }

    // Validate shortcut before applying/persisting.
    if next.companion_enabled {
        validation::validate_shortcut(&next.companion_shortcut)?;
        let _: Shortcut = next
            .companion_shortcut
            .parse()
            .map_err(|err| AppError::Shortcut(format!("invalid shortcut {}: {err}", next.companion_shortcut)))?;
    }

    shortcuts::apply_settings(&app, &next, state.inner())?;
    settings::persist_settings(&app, &next)?;

    let mut locked = state.settings.write()?;
    *locked = next.clone();
    Ok(next)
}

#[tauri::command]
fn register_shortcut(
    app: AppHandle,
    shortcut: String,
    state: tauri::State<'_, DesktopState>,
) -> Result<(), AppError> {
    let _ = set_desktop_settings(
        app,
        PartialDesktopSettings {
            companion_shortcut: Some(shortcut),
            ..Default::default()
        },
        state,
    )?;
    Ok(())
}

#[tauri::command]
async fn check_desktop_update(app: AppHandle, force: Option<bool>) -> DesktopUpdateStatus {
    updater::perform_update_check(&app, force.unwrap_or(false)).await
}

#[tauri::command]
async fn install_desktop_update(app: AppHandle) -> Result<bool, AppError> {
    let update = if let Some(update) = updater::cached_update(&app)? {
        update
    } else {
        let updater = app
            .updater()
            .map_err(|err: tauri_plugin_updater::Error| AppError::Update(err.to_string()))?;
        match updater
            .check()
            .await
            .map_err(|err: tauri_plugin_updater::Error| AppError::Update(err.to_string()))?
        {
            Some(update) => update,
            None => return Ok(false),
        }
    };

    update
        .download_and_install(|_, _| {}, || {})
        .await
        .map_err(|err| AppError::Update(err.to_string()))?;

    let _ = updater::set_cached_update(&app, None);
    app.request_restart();
    Ok(true)
}

// --- App Setup ---

fn main() {
    let default_shortcut: Shortcut = DEFAULT_SHORTCUT.parse().expect("valid default shortcut");

    let shortcut_plugin = tauri_plugin_global_shortcut::Builder::new()
        .with_handler(|app, _shortcut, event| {
            if event.state() == ShortcutState::Pressed {
                let _ = windows::toggle_companion_window(app);
            }
        })
        .with_shortcuts([default_shortcut]);

    // Graceful fallback if default shortcut is already claimed by another app
    let shortcut_plugin = match shortcut_plugin {
        Ok(builder) => builder.build(),
        Err(err) => {
            eprintln!(
                "warning: failed to register default shortcut {}: {}. Starting without shortcut.",
                DEFAULT_SHORTCUT, err
            );
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        let _ = windows::toggle_companion_window(app);
                    }
                })
                .build()
        }
    };

    tauri::Builder::default()
        .menu(tray::build_menu)
        .on_menu_event(|app, event| {
            let _ = tray::handle_menu_action(app, event.id().as_ref());
        })
        // macOS convention: close button hides main window, Cmd+Q quits
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == windows::MAIN_LABEL {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .manage(DesktopState {
            shortcut: RwLock::new(DEFAULT_SHORTCUT.to_string()),
            settings: RwLock::new(DesktopSettings::default()),
        })
        .manage(DesktopUpdaterState::default())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(shortcut_plugin)
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let _ = app.deep_link().register_all();
            }

            tray::setup_tray(app.handle())?;

            let handle = app.handle().clone();
            let state = handle.state::<DesktopState>();
            if let Ok(loaded) = settings::load_settings(&handle) {
                if let Ok(mut locked) = state.settings.write() {
                    *locked = loaded.clone();
                }
                let _ = shortcuts::apply_settings(&handle, &loaded, state.inner());
            }

            let handle = app.handle().clone();
            app.listen("deep-link://new-url", move |event| {
                let payload = event.payload();
                if let Some(route) = deep_link::deep_link_to_route(payload) {
                    let _ = windows::ensure_main_window(&handle, Some(route));
                    let _ = handle.emit("desktop://deep-link", payload);
                }
            });

            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let status = updater::perform_update_check(&handle, false).await;
                if !status.available {
                    return;
                }

                let Some(update) = status.update else {
                    return;
                };

                // Gate notification on user preference
                let notifications_enabled = handle
                    .state::<DesktopState>()
                    .settings
                    .read()
                    .map(|s| s.notifications_enabled)
                    .unwrap_or(true);

                if notifications_enabled {
                    let body = format!(
                        "Version {} is available. Open Settings > Desktop to update.",
                        update.version
                    );
                    let _ = handle
                        .notification()
                        .builder()
                        .title("blah.chat update available")
                        .body(body)
                        .show();
                }
                let _ = handle.emit("desktop://update-available", update);
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            open_main_window,
            open_companion,
            show_notification,
            get_desktop_settings,
            set_desktop_settings,
            register_shortcut,
            check_desktop_update,
            install_desktop_update
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri app");
}
