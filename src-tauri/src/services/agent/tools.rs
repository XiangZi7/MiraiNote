use crate::error::{AppError, AppResult};
use serde_json::{json, Value};

// Tools can only read the captured document; no filesystem paths are executed.
pub fn definitions() -> Value {
    json!([
        {"type":"function","function":{"name":"search_document","description":"Find lines containing a literal phrase in the current document snapshot.","parameters":{"type":"object","properties":{"query":{"type":"string"}},"required":["query"],"additionalProperties":false}}},
        {"type":"function","function":{"name":"document_outline","description":"Extract Markdown headings from the current document snapshot.","parameters":{"type":"object","properties":{},"additionalProperties":false}}},
        {"type":"function","function":{"name":"read_document_lines","description":"Read a line range of the current document snapshot. Use this when the embedded snapshot was truncated. At most 400 lines per call.","parameters":{"type":"object","properties":{"start":{"type":"integer","description":"1-based first line"},"end":{"type":"integer","description":"1-based last line, inclusive"}},"required":["start","end"],"additionalProperties":false}}}
    ])
}

/// Returns a short label for the transcript plus the JSON result handed back to the model.
pub fn execute(name: &str, arguments: &str, text: &str) -> AppResult<(String, String)> {
    let input: Value = if arguments.trim().is_empty() {
        json!({})
    } else {
        serde_json::from_str(arguments)
            .map_err(|_| AppError::invalid_input("文档工具参数无效"))?
    };
    match name {
        "search_document" => {
            let query = input["query"]
                .as_str()
                .filter(|query| !query.trim().is_empty() && query.len() <= 1000)
                .ok_or_else(|| AppError::invalid_input("请提供有效的文档搜索词"))?;
            let needle = query.to_lowercase();
            let matches: Vec<Value> = text
                .lines()
                .enumerate()
                .filter(|(_, line)| line.to_lowercase().contains(&needle))
                .take(50)
                .map(|(index, line)| json!({"line":index+1,"text":clip_line(line, 1000)}))
                .collect();
            Ok((
                format!("搜索文档「{}」· {} 处", clip_line(query, 40), matches.len()),
                json!({"matches":matches}).to_string(),
            ))
        }
        "document_outline" => {
            let matches: Vec<Value> = text
                .lines()
                .enumerate()
                .filter(|(_, line)| line.trim_start().starts_with('#'))
                .take(100)
                .map(|(index, line)| json!({"line":index+1,"text":clip_line(line, 300)}))
                .collect();
            Ok((
                format!("提取文档标题 · {} 条", matches.len()),
                json!({"headings":matches}).to_string(),
            ))
        }
        "read_document_lines" => {
            let total = text.lines().count();
            let start = line_number(&input["start"])?;
            let end = line_number(&input["end"])?;
            if end < start {
                return Err(AppError::invalid_input("读取范围的结束行不能小于起始行"));
            }
            if start > total {
                return Err(AppError::invalid_input(format!(
                    "文档只有 {total} 行，请求的起始行超出范围"
                )));
            }
            let end = end.min(total).min(start + 399);
            let lines: Vec<Value> = text
                .lines()
                .skip(start - 1)
                .take(end - start + 1)
                .enumerate()
                .map(|(offset, line)| json!({"line":start+offset,"text":clip_line(line, 1000)}))
                .collect();
            Ok((
                format!("读取文档 {start}–{end} 行（共 {total} 行）"),
                json!({"totalLines":total,"lines":lines}).to_string(),
            ))
        }
        _ => Err(AppError::invalid_input("模型请求了不可用的文档工具")),
    }
}

fn line_number(value: &Value) -> AppResult<usize> {
    value
        .as_u64()
        .filter(|number| (1..=1_000_000).contains(number))
        .map(|number| number as usize)
        .ok_or_else(|| AppError::invalid_input("行号必须是 1 到 1000000 之间的整数"))
}
fn clip_line(line: &str, max: usize) -> String {
    line.chars().take(max).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    const DOCUMENT: &str = "# 标题\n第二行\n第三行\n## 小节\n第五行";

    #[test]
    fn tools_only_read_supplied_snapshot_and_reject_other_operations() {
        let (label, output) = execute("search_document", r#"{"query":"标题"}"#, DOCUMENT).unwrap();
        assert!(output.contains("# 标题"));
        assert!(!output.contains("第二行"));
        assert!(label.contains("1 处"));
        assert!(execute("read_file", r#"{"path":"C:/secret"}"#, DOCUMENT).is_err());
        assert!(execute("search_document", r#"{"query":""}"#, DOCUMENT).is_err());
        let (label, output) = execute("document_outline", "", DOCUMENT).unwrap();
        assert!(output.contains("## 小节"));
        assert!(label.contains("2 条"));
    }

    #[test]
    fn line_paging_stays_inside_the_document_and_caps_each_call() {
        let (label, output) = execute("read_document_lines", r#"{"start":4,"end":9}"#, DOCUMENT)
            .unwrap();
        assert!(label.contains("4–5 行（共 5 行）"));
        assert!(output.contains("第五行"));
        assert!(!output.contains("第三行"));
        // A request beyond the end fails loudly instead of silently returning nothing.
        assert!(execute("read_document_lines", r#"{"start":6,"end":8}"#, DOCUMENT).is_err());
        assert!(execute("read_document_lines", r#"{"start":3,"end":1}"#, DOCUMENT).is_err());
        assert!(execute("read_document_lines", r#"{"start":0,"end":2}"#, DOCUMENT).is_err());
        let long = (1..=900)
            .map(|number| format!("行 {number}"))
            .collect::<Vec<_>>()
            .join("\n");
        let (label, _) = execute("read_document_lines", r#"{"start":1,"end":900}"#, &long).unwrap();
        assert!(label.contains("1–400 行"));
    }
}
