use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindow};

use crate::error::AppError;
use crate::settings::DesktopState;
use crate::validation::validate_route;

pub const MAIN_LABEL: &str = "main";
pub const COMPANION_LABEL: &str = "companion";

pub fn web_origin() -> String {
    std::env::var("DESKTOP_WEB_URL")
        .unwrap_or_else(|_| crate::DEFAULT_WEB_ORIGIN.to_string())
        .trim_end_matches('/')
        .to_string()
}

pub fn build_app_url(route: &str) -> Result<String, AppError> {
    let validated = validate_route(route)?;
    Ok(format!("{}{}", web_origin(), validated))
}

fn parse_url(raw: &str) -> Result<url::Url, AppError> {
    url::Url::parse(raw).map_err(|err| AppError::Window(format!("invalid url {raw}: {err}")))
}

pub fn navigate_window(window: &WebviewWindow, url: &str) -> Result<(), AppError> {
    let parsed = parse_url(url)?;
    window
        .navigate(parsed)
        .map_err(|err| AppError::Window(err.to_string()))
}

pub fn ensure_main_window(app: &AppHandle, route: Option<String>) -> Result<(), AppError> {
    let target = build_app_url(route.as_deref().unwrap_or("/app"))?;

    if let Some(window) = app.get_webview_window(MAIN_LABEL) {
        navigate_window(&window, &target)?;
        window
            .show()
            .map_err(|err| AppError::Window(err.to_string()))?;
        window
            .set_focus()
            .map_err(|err| AppError::Window(err.to_string()))?;
        return Ok(());
    }

    tauri::WebviewWindowBuilder::new(
        app,
        MAIN_LABEL,
        WebviewUrl::External(parse_url(&target)?),
    )
    .title("blah.chat")
    .inner_size(1360.0, 920.0)
    .min_inner_size(980.0, 640.0)
    .resizable(true)
    .build()
    .map_err(|err| AppError::Window(err.to_string()))?
    .set_focus()
    .map_err(|err| AppError::Window(err.to_string()))
}

pub fn ensure_companion_window(app: &AppHandle, route: Option<String>) -> Result<(), AppError> {
    let target = build_app_url(route.as_deref().unwrap_or("/desktop/quick"))?;
    let state = app.state::<DesktopState>();
    let settings = state.settings.read()?.clone();

    if let Some(window) = app.get_webview_window(COMPANION_LABEL) {
        navigate_window(&window, &target)?;
        window
            .set_always_on_top(settings.companion_always_on_top)
            .map_err(|err| AppError::Window(err.to_string()))?;
        window
            .show()
            .map_err(|err| AppError::Window(err.to_string()))?;
        window
            .set_focus()
            .map_err(|err| AppError::Window(err.to_string()))?;
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
    .map_err(|err| AppError::Window(err.to_string()))?
    .set_focus()
    .map_err(|err| AppError::Window(err.to_string()))
}

pub fn toggle_companion_window(app: &AppHandle) -> Result<(), AppError> {
    let state = app.state::<DesktopState>();
    let settings = state.settings.read()?.clone();

    if !settings.companion_enabled {
        tauri_plugin_notification::NotificationExt::notification(app)
            .builder()
            .title("Companion disabled")
            .body("Enable it in Settings > Desktop")
            .show()
            .map_err(|err| AppError::Notification(err.to_string()))?;
        return Ok(());
    }

    if let Some(window) = app.get_webview_window(COMPANION_LABEL) {
        if window
            .is_visible()
            .map_err(|err| AppError::Window(err.to_string()))?
        {
            window
                .hide()
                .map_err(|err| AppError::Window(err.to_string()))?;
            return Ok(());
        }

        window
            .show()
            .map_err(|err| AppError::Window(err.to_string()))?;
        window
            .set_focus()
            .map_err(|err| AppError::Window(err.to_string()))?;
        return Ok(());
    }

    ensure_companion_window(app, None)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_app_url_valid() {
        let url = build_app_url("/app").unwrap();
        assert!(url.ends_with("/app"));
    }

    #[test]
    fn test_build_app_url_rejects_traversal() {
        assert!(build_app_url("/../../etc/passwd").is_err());
    }

    #[test]
    fn test_build_app_url_rejects_protocol() {
        assert!(build_app_url("javascript:alert(1)").is_err());
    }
}
