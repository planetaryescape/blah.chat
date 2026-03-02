use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("settings error: {0}")]
    Settings(String),

    #[error("shortcut error: {0}")]
    Shortcut(String),

    #[error("window error: {0}")]
    Window(String),

    #[error("update error: {0}")]
    Update(String),

    #[error("validation error: {0}")]
    Validation(String),

    #[error("notification error: {0}")]
    Notification(String),

    #[error("{0}")]
    Lock(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

impl<T> From<std::sync::PoisonError<T>> for AppError {
    fn from(err: std::sync::PoisonError<T>) -> Self {
        AppError::Lock(err.to_string())
    }
}
