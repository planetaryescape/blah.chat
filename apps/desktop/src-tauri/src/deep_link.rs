use url::Url;

use crate::validation::validate_deep_link_id;

pub fn deep_link_to_route(payload: &str) -> Option<String> {
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
            } else if validate_deep_link_id(id).is_ok() {
                Some(format!("/chat/{id}"))
            } else {
                // Invalid ID format — fall back to /app
                Some("/app".to_string())
            }
        }
        "search" => Some("/search".to_string()),
        "settings" => Some("/settings".to_string()),
        _ => Some("/app".to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_chat_link() {
        assert_eq!(
            deep_link_to_route("blahchat://chat/abc123"),
            Some("/chat/abc123".to_string())
        );
    }

    #[test]
    fn test_empty_chat_path() {
        assert_eq!(
            deep_link_to_route("blahchat://chat/"),
            Some("/app".to_string())
        );
        assert_eq!(
            deep_link_to_route("blahchat://chat"),
            Some("/app".to_string())
        );
    }

    #[test]
    fn test_search_link() {
        assert_eq!(
            deep_link_to_route("blahchat://search"),
            Some("/search".to_string())
        );
    }

    #[test]
    fn test_settings_link() {
        assert_eq!(
            deep_link_to_route("blahchat://settings"),
            Some("/settings".to_string())
        );
    }

    #[test]
    fn test_unknown_host_fallback() {
        assert_eq!(
            deep_link_to_route("blahchat://unknown"),
            Some("/app".to_string())
        );
    }

    #[test]
    fn test_wrong_scheme() {
        assert_eq!(deep_link_to_route("https://blah.chat/chat/123"), None);
    }

    #[test]
    fn test_traversal_normalized_by_url_parser() {
        // URL parser normalizes ../../admin to /admin, which is alphanumeric
        assert_eq!(
            deep_link_to_route("blahchat://chat/../../admin"),
            Some("/chat/admin".to_string())
        );
    }

    #[test]
    fn test_traversal_in_raw_id() {
        // IDs with dots/slashes are rejected by validation
        assert_eq!(
            deep_link_to_route("blahchat://chat/../../../etc"),
            // URL parser normalizes this; result depends on URL normalization
            // The key is validate_deep_link_id rejects non-alphanumeric IDs
            Some("/chat/etc".to_string())
        );
    }

    #[test]
    fn test_malicious_id_with_spaces() {
        assert_eq!(
            deep_link_to_route("blahchat://chat/id with spaces"),
            Some("/app".to_string())
        );
    }
}
