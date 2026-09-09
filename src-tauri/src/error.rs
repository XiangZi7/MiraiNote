use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppError {
    pub kind: &'static str,
    pub message: String,
}
impl AppError {
    pub fn invalid_input(message: impl Into<String>) -> Self {
        Self {
            kind: "invalidInput",
            message: message.into(),
        }
    }
    pub fn internal(message: impl Into<String>) -> Self {
        Self {
            kind: "internal",
            message: message.into(),
        }
    }
    pub fn not_found(message: impl Into<String>) -> Self {
        Self {
            kind: "notFound",
            message: message.into(),
        }
    }
    pub fn cancelled() -> Self {
        Self {
            kind: "cancelled",
            message: "任务已停止".into(),
        }
    }
}
impl From<std::io::Error> for AppError {
    fn from(_: std::io::Error) -> Self {
        Self {
            kind: "io",
            message: "无法读写 AI 配置或聊天记录，请检查应用数据目录权限".into(),
        }
    }
}
impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message)
    }
}
impl std::error::Error for AppError {}
pub type AppResult<T> = Result<T, AppError>;
