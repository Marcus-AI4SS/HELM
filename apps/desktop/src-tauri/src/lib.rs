use serde_json::{json, Value};
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::{AppHandle, Manager};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

fn hide_child_console(command: &mut Command) {
    #[cfg(windows)]
    {
        command.creation_flags(CREATE_NO_WINDOW);
    }
    #[cfg(not(windows))]
    {
        let _ = command;
    }
}

fn public_bridge_file_name() -> &'static str {
    "helm_app_bridge.py"
}

fn legacy_bridge_file_name() -> String {
    ["private", "_app", "_bridge", ".py"].concat()
}

fn bridge_script(root: &Path) -> Option<PathBuf> {
    let scripts = root.join("skills").join("scripts");
    let legacy = legacy_bridge_file_name();
    for name in [public_bridge_file_name(), legacy.as_str()] {
        let candidate = scripts.join(name);
        if candidate.exists() {
            return Some(candidate);
        }
    }
    None
}

fn has_bridge(root: &Path) -> bool {
    bridge_script(root).is_some()
}

fn bridge_root(candidate: &Path) -> Option<PathBuf> {
    if has_bridge(candidate) {
        return Some(candidate.to_path_buf());
    }
    let nested = candidate.join("runtime-resources");
    if has_bridge(&nested) {
        return Some(nested);
    }
    None
}

fn detect_repo_or_resource_root(app: &AppHandle) -> Result<PathBuf, String> {
    if cfg!(debug_assertions) {
        let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        let repo_root = manifest_dir
            .join("..")
            .join("..")
            .join("..")
            .canonicalize()
            .map_err(|err| format!("无法解析开发态 app 仓库根目录：{err}"))?;
        if has_bridge(&repo_root) {
            return Ok(repo_root);
        }
    }

    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir);
    }
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            candidates.push(exe_dir.to_path_buf());
            candidates.extend(exe_dir.ancestors().take(5).map(Path::to_path_buf));
        }
    }
    if let Ok(current_dir) = std::env::current_dir() {
        candidates.push(current_dir.clone());
        candidates.extend(current_dir.ancestors().take(5).map(Path::to_path_buf));
    }

    candidates.dedup();
    for candidate in &candidates {
        if let Some(root) = bridge_root(candidate) {
            return Ok(root);
        }
    }

    let searched = candidates
        .iter()
        .map(|path| path.display().to_string())
        .collect::<Vec<_>>()
        .join("; ");
    Err(format!(
        "未找到 HELM 本地桥接脚本。需要存在打包内置资源或本地开发资源。已检查：{}",
        searched
    ))
}

fn python_invocations() -> Vec<Vec<String>> {
    let mut rows = Vec::new();
    if let Ok(explicit) = std::env::var("CODEX_CONSOLE_PYTHON") {
        if !explicit.trim().is_empty() {
            rows.push(vec![explicit]);
        }
    }
    if cfg!(target_os = "windows") {
        rows.push(vec!["python".into()]);
        rows.push(vec!["py".into(), "-3".into()]);
    } else {
        rows.push(vec!["python3".into()]);
        rows.push(vec!["python".into()]);
    }
    rows
}

fn run_bridge(app: &AppHandle, action: &str, payload: Value) -> Result<Value, String> {
    let root = detect_repo_or_resource_root(app)?;
    let bridge_script = bridge_script(&root)
        .ok_or_else(|| "未找到 HELM 本地桥接脚本。".to_string())?;

    let payload_text = payload.to_string();
    let mut last_error = String::new();
    for candidate in python_invocations() {
        if candidate.is_empty() {
            continue;
        }
        let executable = &candidate[0];
        let mut command = Command::new(executable);
        if candidate.len() > 1 {
            command.args(&candidate[1..]);
        }
        hide_child_console(&mut command);
        command
            .env("PYTHONUTF8", "1")
            .env("PYTHONIOENCODING", "utf-8")
            .arg(&bridge_script)
            .arg(action)
            .arg("--payload")
            .arg(&payload_text)
            .current_dir(&root);

        match command.output() {
            Ok(output) => {
                if output.status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    return serde_json::from_str(stdout.trim()).map_err(|err| {
                        format!("bridge 输出不是有效 JSON：{err}\n原始输出：{stdout}")
                    });
                }
                let stdout = String::from_utf8_lossy(&output.stdout);
                let stderr = String::from_utf8_lossy(&output.stderr);
                last_error = format!(
                    "bridge 执行失败（{}）\nstdout:\n{}\nstderr:\n{}",
                    executable, stdout, stderr
                );
            }
            Err(err) => {
                last_error = format!("无法调用 Python（{}）：{}", executable, err);
            }
        }
    }
    Err(last_error)
}

#[tauri::command]
fn get_dashboard(app: AppHandle, project_root: Option<String>) -> Result<Value, String> {
    run_bridge(&app, "dashboard", json!({ "projectRoot": project_root }))
}

#[tauri::command]
fn get_codex_handoff(app: AppHandle, project_root: Option<String>) -> Result<Value, String> {
    run_bridge(
        &app,
        "codex_handoff",
        json!({ "projectRoot": project_root }),
    )
}

#[tauri::command]
fn run_validator(app: AppHandle, name: String) -> Result<Value, String> {
    run_bridge(&app, "run_validator", json!({ "name": name }))
}

#[tauri::command]
fn open_path(
    app: AppHandle,
    path: String,
    project_root: Option<String>,
    dry_run: Option<bool>,
) -> Result<Value, String> {
    run_bridge(
        &app,
        "open_path",
        json!({ "path": path, "projectRoot": project_root, "dryRun": dry_run.unwrap_or(false) }),
    )
}

#[tauri::command]
fn open_external_app(app: AppHandle, label: String, dry_run: Option<bool>) -> Result<Value, String> {
    run_bridge(
        &app,
        "open_external_app",
        json!({ "label": label, "dryRun": dry_run.unwrap_or(false) }),
    )
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_dashboard,
            get_codex_handoff,
            run_validator,
            open_path,
            open_external_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
