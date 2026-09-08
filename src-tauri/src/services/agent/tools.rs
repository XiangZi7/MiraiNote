use crate::error::{AppError, AppResult};
use serde_json::{json, Value};

// Tools can only read the captured document; no filesystem paths are executed.
pub fn definitions() -> Value {
    json!([
        {"type":"function","function":{"name":"search_document","description":"Find lines containing a literal phrase in the current document snapshot.","parameters":{"type":"object","properties":{"query":{"type":"string"}},"required":["query"],"additionalProperties":false}}},
        {"type":"function","function":{"name":"document_outline","description":"Extract Markdown headings from the current document snapshot.","parameters":{"type":"object","properties":{},"additionalProperties":false}}}
    ])
}

pub fn execute(name: &str, arguments: &str, text: &str) -> AppResult<String> {
    let input: Value =
        serde_json::from_str(arguments).map_err(|_| AppError::invalid_input("文档工具参数无效"))?;
    let lines: Vec<Value> = match name {
        "search_document" => {
            let query = input["query"].as_str().filter(|q| !q.trim().is_empty() && q.len() <= 1000)
                .ok_or_else(|| AppError::invalid_input("请提供有效的文档搜索词"))?.to_lowercase();
            text.lines().enumerate().filter(|(_, line)| line.to_lowercase().contains(&query))
                .take(50).map(|(index, line)| json!({"line":index+1,"text":line.chars().take(1000).collect::<String>()})).collect()
        }
        "document_outline" => text.lines().enumerate()
            .filter(|(_, line)| line.trim_start().starts_with('#'))
            .take(100).map(|(index, line)| json!({"line":index+1,"text":line.chars().take(300).collect::<String>()})).collect(),
        _ => return Err(AppError::invalid_input("模型请求了不可用的文档工具")),
    };
    Ok(json!({"matches":lines}).to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn tools_only_read_supplied_snapshot_and_reject_other_operations() {
        let result = execute("search_document", r#"{"query":"标题"}"#, "# 标题\n另一行").unwrap();
        assert!(result.contains("# 标题"));
        assert!(!result.contains("另一行"));
        assert!(execute("read_file", r#"{"path":"C:/secret"}"#, "").is_err());
        assert!(execute("search_document", r#"{"query":""}"#, "text").is_err());
    }
}
