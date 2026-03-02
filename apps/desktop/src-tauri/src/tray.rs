use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

use tracing::warn;

use crate::error::AppError;
use crate::settings::DesktopState;
use crate::windows::{ensure_main_window, toggle_companion_window};

pub const TRAY_ID: &str = "desktop-tray";

pub const MENU_NEW_CHAT_ID: &str = "menu.new_chat";
pub const MENU_OPEN_COMPANION_ID: &str = "menu.open_companion";
pub const MENU_SEARCH_ID: &str = "menu.search";
pub const MENU_QUIT_ID: &str = "menu.quit";

const TRAY_MENU_NEW_CHAT_ID: &str = "tray.new_chat";
const TRAY_MENU_OPEN_COMPANION_ID: &str = "tray.open_companion";
const TRAY_MENU_SEARCH_ID: &str = "tray.search";
const TRAY_MENU_QUIT_ID: &str = "tray.quit";

pub fn handle_menu_action(app: &AppHandle, menu_id: &str) -> Result<(), AppError> {
    match menu_id {
        MENU_NEW_CHAT_ID | TRAY_MENU_NEW_CHAT_ID => {
            ensure_main_window(app, Some("/app".to_string()))
        }
        MENU_OPEN_COMPANION_ID | TRAY_MENU_OPEN_COMPANION_ID => {
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
            toggle_companion_window(app)
        }
        MENU_SEARCH_ID | TRAY_MENU_SEARCH_ID => {
            ensure_main_window(app, Some("/search".to_string()))
        }
        MENU_QUIT_ID | TRAY_MENU_QUIT_ID => {
            app.exit(0);
            Ok(())
        }
        _ => Ok(()),
    }
}

pub fn build_menu(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let new_chat = MenuItem::with_id(
        app,
        MENU_NEW_CHAT_ID,
        "New Chat",
        true,
        Some("CmdOrCtrl+N"),
    )?;
    let open_companion = MenuItem::with_id(
        app,
        MENU_OPEN_COMPANION_ID,
        "Open Companion",
        true,
        None::<&str>,
    )?;
    let search = MenuItem::with_id(app, MENU_SEARCH_ID, "Search", true, Some("CmdOrCtrl+K"))?;
    let file_separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(
        app,
        MENU_QUIT_ID,
        "Quit blah.chat",
        true,
        Some("CmdOrCtrl+Q"),
    )?;
    let file = Submenu::with_items(
        app,
        "File",
        true,
        &[&new_chat, &open_companion, &search, &file_separator, &quit],
    )?;

    let copy = PredefinedMenuItem::copy(app, None)?;
    let paste = PredefinedMenuItem::paste(app, None)?;
    let select_all = PredefinedMenuItem::select_all(app, None)?;
    let edit = Submenu::with_items(app, "Edit", true, &[&copy, &paste, &select_all])?;

    Menu::with_items(app, &[&file, &edit])
}

pub fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let tray_new_chat =
        MenuItem::with_id(app, TRAY_MENU_NEW_CHAT_ID, "New Chat", true, None::<&str>)?;
    let tray_open_companion = MenuItem::with_id(
        app,
        TRAY_MENU_OPEN_COMPANION_ID,
        "Open Companion",
        true,
        None::<&str>,
    )?;
    let tray_search =
        MenuItem::with_id(app, TRAY_MENU_SEARCH_ID, "Search", true, None::<&str>)?;
    let tray_separator = PredefinedMenuItem::separator(app)?;
    let tray_quit = MenuItem::with_id(app, TRAY_MENU_QUIT_ID, "Quit", true, None::<&str>)?;
    let tray_menu = Menu::with_items(
        app,
        &[
            &tray_new_chat,
            &tray_open_companion,
            &tray_search,
            &tray_separator,
            &tray_quit,
        ],
    )?;

    // Left-click = toggle companion, right-click = menu (no show_menu_on_left_click)
    let mut tray_builder = TrayIconBuilder::with_id(TRAY_ID)
        .menu(&tray_menu)
        .tooltip("blah.chat");

    if let Some(icon) = app.default_window_icon() {
        tray_builder = tray_builder.icon(icon.clone());
    }

    tray_builder
        .on_menu_event(|app: &AppHandle, event: tauri::menu::MenuEvent| {
            if let Err(err) = handle_menu_action(app, event.id().as_ref()) {
                warn!(error = %err, menu_id = event.id().as_ref(), "menu action failed");
            }
        })
        .on_tray_icon_event(
            |tray: &tauri::tray::TrayIcon<tauri::Wry>, event: TrayIconEvent| {
                if let TrayIconEvent::Click {
                    button,
                    button_state,
                    ..
                } = event
                {
                    if button == MouseButton::Left && button_state == MouseButtonState::Up {
                        let app = tray.app_handle();
                        let enabled = app
                            .state::<DesktopState>()
                            .settings
                            .read()
                            .map(|settings| settings.companion_enabled)
                            .unwrap_or(true);
                        if !enabled {
                            if let Err(err) = ensure_main_window(app, Some("/app".to_string())) {
                                warn!(error = %err, "failed to open main window from tray");
                            }
                            return;
                        }
                        if let Err(err) = toggle_companion_window(app) {
                            warn!(error = %err, "failed to toggle companion from tray");
                        }
                    }
                }
            },
        )
        .build(app)?;

    Ok(())
}

use tauri::Manager;
