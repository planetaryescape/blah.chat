use crate::error::AppError;

/// Validate that a route is a safe internal path.
/// Rejects protocol schemes, double-slash navigations, and path traversal.
pub fn validate_route(route: &str) -> Result<String, AppError> {
    let route = route.trim();

    // Must start with /
    let route = if route.starts_with('/') {
        route.to_string()
    } else {
        format!("/{route}")
    };

    // Reject protocol schemes (e.g., javascript:, data:, http://)
    if route.contains(':') {
        return Err(AppError::Validation(format!(
            "route must not contain protocol schemes: {route}"
        )));
    }

    // Reject double slashes that could navigate to external origins
    if route.contains("//") {
        return Err(AppError::Validation(format!(
            "route must not contain '//': {route}"
        )));
    }

    // Reject path traversal
    if route.contains("..") {
        return Err(AppError::Validation(format!(
            "route must not contain '..': {route}"
        )));
    }

    Ok(route)
}

/// Validate notification content to prevent phishing.
const MAX_TITLE_LEN: usize = 100;
const MAX_BODY_LEN: usize = 500;

pub fn validate_notification(title: &str, body: &str) -> Result<(), AppError> {
    if title.len() > MAX_TITLE_LEN {
        return Err(AppError::Validation(format!(
            "notification title exceeds {MAX_TITLE_LEN} characters"
        )));
    }
    if body.len() > MAX_BODY_LEN {
        return Err(AppError::Validation(format!(
            "notification body exceeds {MAX_BODY_LEN} characters"
        )));
    }
    Ok(())
}

/// Validate shortcut string format.
/// Accepts patterns like "Alt+Space", "CmdOrCtrl+Shift+K", etc.
pub fn validate_shortcut(shortcut: &str) -> Result<(), AppError> {
    if shortcut.is_empty() {
        return Err(AppError::Validation("shortcut must not be empty".into()));
    }
    if shortcut.len() > 50 {
        return Err(AppError::Validation(
            "shortcut string too long".into(),
        ));
    }
    // Only allow alphanumeric, +, and common modifier names
    let valid_chars = shortcut
        .chars()
        .all(|c| c.is_alphanumeric() || c == '+' || c == ' ');
    if !valid_chars {
        return Err(AppError::Validation(format!(
            "shortcut contains invalid characters: {shortcut}"
        )));
    }
    Ok(())
}

/// Validate a deep link chat ID is alphanumeric (with hyphens/underscores).
pub fn validate_deep_link_id(id: &str) -> Result<(), AppError> {
    if id.is_empty() {
        return Ok(());
    }
    let valid = id
        .chars()
        .all(|c| c.is_alphanumeric() || c == '-' || c == '_');
    if !valid {
        return Err(AppError::Validation(format!(
            "deep link ID contains invalid characters: {id}"
        )));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_route_valid() {
        assert!(validate_route("/app").is_ok());
        assert!(validate_route("/chat/abc123").is_ok());
        assert!(validate_route("/settings").is_ok());
        assert!(validate_route("app").is_ok()); // auto-prefixes /
    }

    #[test]
    fn test_validate_route_rejects_protocols() {
        assert!(validate_route("javascript:alert(1)").is_err());
        assert!(validate_route("data:text/html,<h1>hi</h1>").is_err());
        assert!(validate_route("//evil.com").is_err());
    }

    #[test]
    fn test_validate_route_rejects_traversal() {
        assert!(validate_route("/chat/../../admin").is_err());
        assert!(validate_route("/../etc/passwd").is_err());
    }

    #[test]
    fn test_validate_route_rejects_double_slash() {
        assert!(validate_route("//evil.com").is_err());
        assert!(validate_route("/app//nested").is_err());
    }

    #[test]
    fn test_validate_notification() {
        assert!(validate_notification("Title", "Body text").is_ok());
        assert!(validate_notification(&"x".repeat(101), "body").is_err());
        assert!(validate_notification("title", &"x".repeat(501)).is_err());
    }

    #[test]
    fn test_validate_shortcut() {
        assert!(validate_shortcut("Alt+Space").is_ok());
        assert!(validate_shortcut("CmdOrCtrl+Shift+K").is_ok());
        assert!(validate_shortcut("").is_err());
        assert!(validate_shortcut(&"x".repeat(51)).is_err());
        assert!(validate_shortcut("Alt+;").is_err());
    }

    #[test]
    fn test_validate_deep_link_id() {
        assert!(validate_deep_link_id("abc123").is_ok());
        assert!(validate_deep_link_id("abc-123_def").is_ok());
        assert!(validate_deep_link_id("").is_ok());
        assert!(validate_deep_link_id("../../admin").is_err());
        assert!(validate_deep_link_id("id with spaces").is_err());
    }
}
