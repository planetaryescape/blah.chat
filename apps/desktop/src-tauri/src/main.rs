#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Listener, Manager, WebviewUrl, WebviewWindow};
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};
use tauri_plugin_notification::NotificationExt;
use url::Url;

const DEFAULT_WEB_ORIGIN: &str = "https://blah.chat";
const DEFAULT_SHORTCUT: &str = "Alt+Space";
const MAIN_LABEL: &str = "main";
const COMPANION_LABEL: &str = "companion";
const TRAY_ID: &str = "desktop-tray";
const MENU_NEW_CHAT_ID: &str = "menu.new_chat";
const MENU_OPEN_COMPANION_ID: &str = "menu.open_companion";
const MENU_SEARCH_ID: &str = "menu.search";
const MENU_QUIT_ID: &str = "menu.quit";
const TRAY_MENU_NEW_CHAT_ID: &str = "tray.new_chat";
const TRAY_MENU_OPEN_COMPANION_ID: &str = "tray.open_companion";
const TRAY_MENU_SEARCH_ID: &str = "tray.search";
const TRAY_MENU_QUIT_ID: &str = "tray.quit";

#[derive(Default)]
struct DesktopState {
  shortcut: Mutex<String>,
}

fn web_origin() -> String {
  std::env::var("DESKTOP_WEB_URL")
    .unwrap_or_else(|_| DEFAULT_WEB_ORIGIN.to_string())
    .trim_end_matches('/')
    .to_string()
}

fn build_app_url(route: &str) -> String {
  let normalized = if route.starts_with('/') {
    route.to_string()
  } else {
    format!("/{route}")
  };

  format!("{}{}", web_origin(), normalized)
}

fn parse_url(raw: &str) -> Result<Url, String> {
  Url::parse(raw).map_err(|err| format!("invalid url {raw}: {err}"))
}

fn navigate_window(window: &WebviewWindow, url: &str) -> Result<(), String> {
  let json = serde_json::to_string(url).map_err(|err| err.to_string())?;
  window
    .eval(&format!("window.location.replace({json});"))
    .map_err(|err| err.to_string())
}

fn ensure_main_window(app: &AppHandle, route: Option<String>) -> Result<(), String> {
  let target = build_app_url(route.as_deref().unwrap_or("/app"));

  if let Some(window) = app.get_webview_window(MAIN_LABEL) {
    navigate_window(&window, &target)?;
    window.show().map_err(|err| err.to_string())?;
    window.set_focus().map_err(|err| err.to_string())?;
    return Ok(());
  }

  tauri::WebviewWindowBuilder::new(app, MAIN_LABEL, WebviewUrl::External(parse_url(&target)?))
    .title("blah.chat")
    .inner_size(1360.0, 920.0)
    .min_inner_size(980.0, 640.0)
    .resizable(true)
    .build()
    .map_err(|err| err.to_string())?
    .set_focus()
    .map_err(|err| err.to_string())
}

fn ensure_companion_window(app: &AppHandle, route: Option<String>) -> Result<(), String> {
  let target = build_app_url(route.as_deref().unwrap_or("/desktop/quick"));

  if let Some(window) = app.get_webview_window(COMPANION_LABEL) {
    navigate_window(&window, &target)?;
    window.show().map_err(|err| err.to_string())?;
    window.set_focus().map_err(|err| err.to_string())?;
    return Ok(());
  }

  tauri::WebviewWindowBuilder::new(
    app,
    COMPANION_LABEL,
    WebviewUrl::External(parse_url(&target)?),
  )
  .title("blah.chat Quick")
  .inner_size(520.0, 680.0)
  .min_inner_size(420.0, 480.0)
  .always_on_top(true)
  .visible(true)
  .resizable(true)
  .build()
  .map_err(|err| err.to_string())?
  .set_focus()
  .map_err(|err| err.to_string())
}

fn toggle_companion_window(app: &AppHandle) -> Result<(), String> {
  if let Some(window) = app.get_webview_window(COMPANION_LABEL) {
    if window.is_visible().map_err(|err| err.to_string())? {
      window.hide().map_err(|err| err.to_string())?;
      return Ok(());
    }

    window.show().map_err(|err| err.to_string())?;
    window.set_focus().map_err(|err| err.to_string())?;
    return Ok(());
  }

  ensure_companion_window(app, None)
}

fn deep_link_to_route(payload: &str) -> Option<String> {
  let url = Url::parse(payload).ok()?;
  if url.scheme() != "blahchat" {
    return None;
  }

  let host = url.host_str().unwrap_or_default();

  match host {
    "chat" => {
      let id = url.path().trim_start_matches('/');
      if id.is_empty() {
        Some("/app".to_string())
      } else {
        Some(format!("/chat/{id}"))
      }
    }
    "search" => Some("/search".to_string()),
    "settings" => Some("/settings".to_string()),
    _ => Some("/app".to_string()),
  }
}

fn handle_menu_action(app: &AppHandle, menu_id: &str) -> Result<(), String> {
  match menu_id {
    MENU_NEW_CHAT_ID | TRAY_MENU_NEW_CHAT_ID => ensure_main_window(app, Some("/app".to_string())),
    MENU_OPEN_COMPANION_ID | TRAY_MENU_OPEN_COMPANION_ID => toggle_companion_window(app),
    MENU_SEARCH_ID | TRAY_MENU_SEARCH_ID => ensure_main_window(app, Some("/search".to_string())),
    MENU_QUIT_ID | TRAY_MENU_QUIT_ID => {
      app.exit(0);
      Ok(())
    }
    _ => Ok(()),
  }
}

fn build_menu(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
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
    Some("Alt+Space"),
  )?;
  let search = MenuItem::with_id(app, MENU_SEARCH_ID, "Search", true, Some("CmdOrCtrl+K"))?;
  let file_separator = PredefinedMenuItem::separator(app)?;
  let quit = MenuItem::with_id(app, MENU_QUIT_ID, "Quit blah.chat", true, Some("CmdOrCtrl+Q"))?;
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

fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
  let tray_new_chat = MenuItem::with_id(app, TRAY_MENU_NEW_CHAT_ID, "New Chat", true, None::<&str>)?;
  let tray_open_companion = MenuItem::with_id(
    app,
    TRAY_MENU_OPEN_COMPANION_ID,
    "Open Companion",
    true,
    None::<&str>,
  )?;
  let tray_search = MenuItem::with_id(app, TRAY_MENU_SEARCH_ID, "Search", true, None::<&str>)?;
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

  let mut tray_builder = TrayIconBuilder::with_id(TRAY_ID)
    .menu(&tray_menu)
    .tooltip("blah.chat")
    .show_menu_on_left_click(true);

  if let Some(icon) = app.default_window_icon() {
    tray_builder = tray_builder.icon(icon.clone());
  }

  tray_builder
    .on_menu_event(|app: &AppHandle, event: tauri::menu::MenuEvent| {
      let _ = handle_menu_action(app, event.id().as_ref());
    })
    .on_tray_icon_event(|tray: &tauri::tray::TrayIcon<tauri::Wry>, event: TrayIconEvent| {
      if let TrayIconEvent::Click {
        button,
        button_state,
        ..
      } = event
      {
        if button == MouseButton::Left && button_state == MouseButtonState::Up {
          let _ = toggle_companion_window(tray.app_handle());
        }
      }
    })
    .build(app)?;

  Ok(())
}

#[tauri::command]
fn open_main_window(app: AppHandle, route: Option<String>) -> Result<(), String> {
  ensure_main_window(&app, route)
}

#[tauri::command]
fn open_companion(app: AppHandle, route: Option<String>) -> Result<(), String> {
  ensure_companion_window(&app, route)
}

#[tauri::command]
fn show_notification(app: AppHandle, title: String, body: String) -> Result<(), String> {
  app
    .notification()
    .builder()
    .title(title)
    .body(body)
    .show()
    .map_err(|err| err.to_string())
}

#[tauri::command]
fn register_shortcut(
  app: AppHandle,
  shortcut: String,
  state: tauri::State<'_, DesktopState>,
) -> Result<(), String> {
  let parsed: Shortcut = shortcut
    .parse()
    .map_err(|err| format!("invalid shortcut {shortcut}: {err}"))?;

  let manager = app.global_shortcut();
  let mut current = state.shortcut.lock().map_err(|err| err.to_string())?;

  if !current.is_empty() {
    let old: Shortcut = current
      .parse()
      .map_err(|err| format!("invalid existing shortcut {}: {err}", *current))?;

    if manager.is_registered(old) {
      manager.unregister(old).map_err(|err| err.to_string())?;
    }
  }

  manager.register(parsed).map_err(|err| err.to_string())?;
  *current = shortcut;
  Ok(())
}

fn main() {
  let default_shortcut: Shortcut = DEFAULT_SHORTCUT.parse().expect("valid default shortcut");

  let shortcut_plugin = tauri_plugin_global_shortcut::Builder::new()
    .with_handler(|app, _shortcut, event| {
      if event.state() == ShortcutState::Pressed {
        let _ = toggle_companion_window(app);
      }
    })
    .with_shortcuts([default_shortcut])
    .expect("default shortcut must register")
    .build();

  tauri::Builder::default()
    .menu(build_menu)
    .on_menu_event(|app, event| {
      let _ = handle_menu_action(app, event.id().as_ref());
    })
    .manage(DesktopState {
      shortcut: Mutex::new(DEFAULT_SHORTCUT.to_string()),
    })
    .plugin(tauri_plugin_deep_link::init())
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(shortcut_plugin)
    .setup(|app| {
      #[cfg(debug_assertions)]
      {
        let _ = app.deep_link().register_all();
      }

      setup_tray(&app.handle())?;

      let handle = app.handle().clone();
      app.listen("deep-link://new-url", move |event| {
        let payload = event.payload();
        if let Some(route) = deep_link_to_route(payload) {
          let _ = ensure_main_window(&handle, Some(route));
          let _ = handle.emit("desktop://deep-link", payload);
        }
      });

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      open_main_window,
      open_companion,
      show_notification,
      register_shortcut
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri app");
}
