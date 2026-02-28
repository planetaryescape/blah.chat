#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Listener, Manager, WebviewUrl, WebviewWindow};
#[cfg(debug_assertions)]
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_store::StoreExt;
use tauri_plugin_updater::{Update, UpdaterExt};
use url::Url;

const DEFAULT_WEB_ORIGIN: &str = "https://blah.chat";
const DEFAULT_SHORTCUT: &str = "Alt+Space";
const SETTINGS_STORE_FILE: &str = "desktop-settings.json";
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

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DesktopSettings {
  companion_enabled: bool,
  companion_shortcut: String,
  companion_always_on_top: bool,
}

impl Default for DesktopSettings {
  fn default() -> Self {
    Self {
      companion_enabled: true,
      companion_shortcut: DEFAULT_SHORTCUT.to_string(),
      companion_always_on_top: true,
    }
  }
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PartialDesktopSettings {
  companion_enabled: Option<bool>,
  companion_shortcut: Option<String>,
  companion_always_on_top: Option<bool>,
}

#[derive(Default)]
struct DesktopState {
  shortcut: Mutex<String>,
  settings: Mutex<DesktopSettings>,
}

#[derive(Default)]
struct DesktopUpdaterState {
  pending_update: Mutex<Option<Update>>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopUpdateInfo {
  version: String,
  current_version: String,
  body: Option<String>,
  published_at: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopUpdateStatus {
  enabled: bool,
  available: bool,
  update: Option<DesktopUpdateInfo>,
  error: Option<String>,
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

fn is_updater_disabled_error(message: &str) -> bool {
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

fn cached_update(app: &AppHandle) -> Result<Option<Update>, String> {
  let state = app.state::<DesktopUpdaterState>();
  state
    .pending_update
    .lock()
    .map(|update| update.clone())
    .map_err(|err| err.to_string())
}

fn set_cached_update(app: &AppHandle, update: Option<Update>) -> Result<(), String> {
  let state = app.state::<DesktopUpdaterState>();
  let mut locked = state.pending_update.lock().map_err(|err| err.to_string())?;
  *locked = update;
  Ok(())
}

async fn perform_update_check(app: &AppHandle, force: bool) -> DesktopUpdateStatus {
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
  let settings = app
    .state::<DesktopState>()
    .settings
    .lock()
    .map_err(|err| err.to_string())?
    .clone();

  if let Some(window) = app.get_webview_window(COMPANION_LABEL) {
    navigate_window(&window, &target)?;
    window
      .set_always_on_top(settings.companion_always_on_top)
      .map_err(|err| err.to_string())?;
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
  .always_on_top(settings.companion_always_on_top)
  .visible(true)
  .resizable(true)
  .build()
  .map_err(|err| err.to_string())?
  .set_focus()
  .map_err(|err| err.to_string())
}

fn toggle_companion_window(app: &AppHandle) -> Result<(), String> {
  let settings = app
    .state::<DesktopState>()
    .settings
    .lock()
    .map_err(|err| err.to_string())?
    .clone();

  if settings.companion_enabled != true {
    app
      .notification()
      .builder()
      .title("Companion disabled")
      .body("Enable it in Settings > Desktop")
      .show()
      .map_err(|err| err.to_string())?;
    return Ok(());
  }

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
    MENU_OPEN_COMPANION_ID | TRAY_MENU_OPEN_COMPANION_ID => {
      let enabled = app
        .state::<DesktopState>()
        .settings
        .lock()
        .map_err(|err| err.to_string())?
        .companion_enabled;
      if enabled != true {
        app
          .notification()
          .builder()
          .title("Companion disabled")
          .body("Enable it in Settings > Desktop")
          .show()
          .map_err(|err| err.to_string())?;
        return Ok(());
      }
      toggle_companion_window(app)
    }
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
    None::<&str>,
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
          let app = tray.app_handle();
          let enabled = app
            .state::<DesktopState>()
            .settings
            .lock()
            .map(|settings| settings.companion_enabled)
            .unwrap_or(true);
          if enabled != true {
            let _ = ensure_main_window(app, Some("/app".to_string()));
            return;
          }
          let _ = toggle_companion_window(app);
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
  let enabled = app
    .state::<DesktopState>()
    .settings
    .lock()
    .map_err(|err| err.to_string())?
    .companion_enabled;
  if enabled != true {
    app
      .notification()
      .builder()
      .title("Companion disabled")
      .body("Enable it in Settings > Desktop")
      .show()
      .map_err(|err| err.to_string())?;
    return Ok(());
  }
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

fn load_settings(app: &AppHandle) -> Result<DesktopSettings, String> {
  let store = app
    .store(SETTINGS_STORE_FILE)
    .map_err(|err| err.to_string())?;

  let mut settings = DesktopSettings::default();
  if let Some(value) = store.get("companionEnabled").and_then(|v| v.as_bool()) {
    settings.companion_enabled = value;
  }
  if let Some(value) = store.get("companionShortcut") {
    if let Some(value) = value.as_str() {
      settings.companion_shortcut = value.to_string();
    }
  }
  if let Some(value) = store
    .get("companionAlwaysOnTop")
    .and_then(|v| v.as_bool())
  {
    settings.companion_always_on_top = value;
  }

  Ok(settings)
}

fn persist_settings(app: &AppHandle, settings: &DesktopSettings) -> Result<(), String> {
  let store = app
    .store(SETTINGS_STORE_FILE)
    .map_err(|err| err.to_string())?;
  store.set(
    "companionEnabled".to_string(),
    serde_json::json!(settings.companion_enabled),
  );
  store.set(
    "companionShortcut".to_string(),
    serde_json::json!(settings.companion_shortcut),
  );
  store.set(
    "companionAlwaysOnTop".to_string(),
    serde_json::json!(settings.companion_always_on_top),
  );
  store.save().map_err(|err| err.to_string())
}

fn unregister_current_shortcut(app: &AppHandle, state: &DesktopState) -> Result<(), String> {
  let manager = app.global_shortcut();
  let mut current = state.shortcut.lock().map_err(|err| err.to_string())?;

  if current.is_empty() {
    return Ok(());
  }

  let old: Shortcut = current
    .parse()
    .map_err(|err| format!("invalid existing shortcut {}: {err}", *current))?;

  if manager.is_registered(old) {
    manager.unregister(old).map_err(|err| err.to_string())?;
  }

  current.clear();
  Ok(())
}

fn register_shortcut_impl(
  app: &AppHandle,
  shortcut: &str,
  state: &DesktopState,
) -> Result<(), String> {
  let parsed: Shortcut = shortcut
    .parse()
    .map_err(|err| format!("invalid shortcut {shortcut}: {err}"))?;

  unregister_current_shortcut(app, state)?;

  let manager = app.global_shortcut();
  manager.register(parsed).map_err(|err| err.to_string())?;

  let mut current = state.shortcut.lock().map_err(|err| err.to_string())?;
  *current = shortcut.to_string();
  Ok(())
}

fn apply_settings(
  app: &AppHandle,
  settings: &DesktopSettings,
  state: &DesktopState,
) -> Result<(), String> {
  if settings.companion_enabled != true {
    unregister_current_shortcut(app, state)?;
    if let Some(window) = app.get_webview_window(COMPANION_LABEL) {
      let _ = window.close();
    }
    return Ok(());
  }

  register_shortcut_impl(app, settings.companion_shortcut.as_str(), state)?;
  if let Some(window) = app.get_webview_window(COMPANION_LABEL) {
    window
      .set_always_on_top(settings.companion_always_on_top)
      .map_err(|err| err.to_string())?;
  }
  Ok(())
}

#[tauri::command]
fn get_desktop_settings(state: tauri::State<'_, DesktopState>) -> Result<DesktopSettings, String> {
  state
    .settings
    .lock()
    .map(|settings| settings.clone())
    .map_err(|err| err.to_string())
}

#[tauri::command]
fn set_desktop_settings(
  app: AppHandle,
  settings: PartialDesktopSettings,
  state: tauri::State<'_, DesktopState>,
) -> Result<DesktopSettings, String> {
  let current = state
    .settings
    .lock()
    .map(|settings| settings.clone())
    .map_err(|err| err.to_string())?;

  let mut next = current.clone();
  if let Some(enabled) = settings.companion_enabled {
    next.companion_enabled = enabled;
  }
  if let Some(shortcut) = settings.companion_shortcut {
    next.companion_shortcut = shortcut;
  }
  if let Some(always) = settings.companion_always_on_top {
    next.companion_always_on_top = always;
  }

  // Validate shortcut before applying/persisting.
  if next.companion_enabled == true {
    let _: Shortcut = next
      .companion_shortcut
      .parse()
      .map_err(|err| format!("invalid shortcut {}: {err}", next.companion_shortcut))?;
  }

  apply_settings(&app, &next, state.inner())?;
  persist_settings(&app, &next)?;

  let mut locked = state.settings.lock().map_err(|err| err.to_string())?;
  *locked = next.clone();
  Ok(next)
}

#[tauri::command]
fn register_shortcut(
  app: AppHandle,
  shortcut: String,
  state: tauri::State<'_, DesktopState>,
) -> Result<(), String> {
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
  perform_update_check(&app, force.unwrap_or(false)).await
}

#[tauri::command]
async fn install_desktop_update(app: AppHandle) -> Result<bool, String> {
  let update = if let Some(update) = cached_update(&app)? {
    update
  } else {
    let updater = app.updater().map_err(|err| err.to_string())?;
    match updater.check().await.map_err(|err| err.to_string())? {
      Some(update) => update,
      None => return Ok(false),
    }
  };

  update
    .download_and_install(|_, _| {}, || {})
    .await
    .map_err(|err| err.to_string())?;

  let _ = set_cached_update(&app, None);
  app.request_restart();
  Ok(true)
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
      settings: Mutex::new(DesktopSettings::default()),
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

      setup_tray(&app.handle())?;

      let handle = app.handle().clone();
      let state = handle.state::<DesktopState>();
      if let Ok(settings) = load_settings(&handle) {
        if let Ok(mut locked) = state.settings.lock() {
          *locked = settings.clone();
        }
        let _ = apply_settings(&handle, &settings, state.inner());
      }

      let handle = app.handle().clone();
      app.listen("deep-link://new-url", move |event| {
        let payload = event.payload();
        if let Some(route) = deep_link_to_route(payload) {
          let _ = ensure_main_window(&handle, Some(route));
          let _ = handle.emit("desktop://deep-link", payload);
        }
      });

      let handle = app.handle().clone();
      tauri::async_runtime::spawn(async move {
        let status = perform_update_check(&handle, false).await;
        if !status.available {
          return;
        }

        let Some(update) = status.update else {
          return;
        };

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
