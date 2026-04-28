// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde_json::{json, Value};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[cfg(windows)]
#[link(name = "kernel32")]
extern "system" {
    fn AttachConsole(dwProcessId: u32) -> i32;
}

#[cfg(windows)]
fn attach_parent_console_for_cli() {
    const ATTACH_PARENT_PROCESS: u32 = 0xFFFF_FFFF;
    unsafe {
        AttachConsole(ATTACH_PARENT_PROCESS);
    }
}

#[cfg(not(windows))]
fn attach_parent_console_for_cli() {}

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

fn detect_cli_bridge_root() -> Option<PathBuf> {
    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Ok(current_dir) = std::env::current_dir() {
        candidates.push(current_dir.clone());
        candidates.extend(current_dir.ancestors().take(6).map(Path::to_path_buf));
    }
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            candidates.push(exe_dir.to_path_buf());
            candidates.extend(exe_dir.ancestors().take(6).map(Path::to_path_buf));
        }
    }
    candidates.dedup();
    candidates.iter().find_map(|path| bridge_root(path))
}

fn cli_python_invocations() -> Vec<Vec<String>> {
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

fn dashboard_probe() -> (i32, Value) {
    let Some(root) = detect_cli_bridge_root() else {
        return (
            2,
            json!({
                "ok": false,
                "exit_status": 2,
                "error": "missing_bridge",
                "bridge_root": null,
                "source_mode": null,
                "active_skills_root": null,
                "selected_project": null
            }),
        );
    };
    let Some(script) = bridge_script(&root) else {
        return (
            2,
            json!({
                "ok": false,
                "exit_status": 2,
                "error": "missing_bridge_script",
                "bridge_root": root.display().to_string(),
                "source_mode": null,
                "active_skills_root": null,
                "selected_project": null
            }),
        );
    };
    let root_display = root.display().to_string();
    let mut attempts: Vec<Value> = Vec::new();
    for candidate in cli_python_invocations() {
        let executable = candidate[0].clone();
        let mut command = Command::new(executable);
        if candidate.len() > 1 {
            command.args(&candidate[1..]);
        }
        hide_child_console(&mut command);
        let output = command
            .env("PYTHONUTF8", "1")
            .env("PYTHONIOENCODING", "utf-8")
            .arg(&script)
            .arg("dashboard")
            .current_dir(&root)
            .output();
        match output {
            Ok(output) => {
                let status_code = output.status.code().unwrap_or(-1);
                let stdout = String::from_utf8_lossy(&output.stdout);
                let stderr = String::from_utf8_lossy(&output.stderr);
                if output.status.success() {
                    if let Ok(value) = serde_json::from_str::<Value>(stdout.trim()) {
                        let source_status = value
                            .get("source_status")
                            .cloned()
                            .unwrap_or_else(|| json!({}));
                        let mode = source_status
                            .get("mode")
                            .and_then(Value::as_str)
                            .unwrap_or("unknown")
                            .to_string();
                        let label = source_status
                            .get("label")
                            .and_then(Value::as_str)
                            .unwrap_or("")
                            .to_string();
                        let active_skills_root = source_status
                            .get("active_skills_root")
                            .and_then(Value::as_str)
                            .or_else(|| {
                                value
                                    .get("runtime")
                                    .and_then(|row| row.get("active_skills_root"))
                                    .and_then(Value::as_str)
                            })
                            .unwrap_or("")
                            .to_string();
                        let selected_project = value
                            .get("selected_project_root")
                            .and_then(Value::as_str)
                            .unwrap_or("")
                            .to_string();
                        let product_version = value
                            .get("product")
                            .and_then(|row| row.get("version"))
                            .and_then(Value::as_str)
                            .unwrap_or("")
                            .to_string();
                        let project_count = value
                            .get("projects")
                            .and_then(Value::as_array)
                            .map_or(0, |rows| rows.len());
                        return (
                            0,
                            json!({
                                "ok": true,
                                "exit_status": 0,
                                "bridge_root": root_display,
                                "source_mode": mode,
                                "source_label": label,
                                "active_skills_root": active_skills_root,
                                "selected_project": selected_project,
                                "product_version": product_version,
                                "project_count": project_count
                            }),
                        );
                    }
                }
                attempts.push(json!({
                    "python": candidate.join(" "),
                    "exit_status": status_code,
                    "stdout_excerpt": stdout.chars().take(1200).collect::<String>(),
                    "stderr_excerpt": stderr.chars().take(1200).collect::<String>()
                }));
            }
            Err(error) => {
                attempts.push(json!({
                    "python": candidate.join(" "),
                    "error": error.to_string()
                }));
            }
        }
    }
    (
        3,
        json!({
            "ok": false,
            "exit_status": 3,
            "error": "bridge_failed",
            "bridge_root": root_display,
            "source_mode": null,
            "active_skills_root": null,
            "selected_project": null,
            "attempts": attempts
        }),
    )
}

fn run_self_test() -> i32 {
    let (exit_status, report) = dashboard_probe();
    if exit_status == 0 {
        let mode = report
            .get("source_mode")
            .and_then(Value::as_str)
            .unwrap_or("unknown");
        println!("{mode}");
    } else {
        let error = report
            .get("error")
            .and_then(Value::as_str)
            .unwrap_or("self_test_failed");
        eprintln!("{error}");
    }
    exit_status
}

fn run_self_test_json(path: &Path) -> i32 {
    let (exit_status, report) = dashboard_probe();
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            if let Err(error) = fs::create_dir_all(parent) {
                eprintln!("self_test_json_parent_failed: {error}");
                return 4;
            }
        }
    }
    let Ok(serialized) = serde_json::to_string_pretty(&report) else {
        eprintln!("self_test_json_serialize_failed");
        return 4;
    };
    if let Err(error) = fs::write(path, serialized) {
        eprintln!("self_test_json_write_failed: {error}");
        return 4;
    }
    exit_status
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.iter().any(|arg| arg == "--self-test") {
        attach_parent_console_for_cli();
        std::process::exit(run_self_test());
    }
    if let Some(index) = args.iter().position(|arg| arg == "--self-test-json") {
        attach_parent_console_for_cli();
        let Some(path) = args.get(index + 1) else {
            eprintln!("missing_self_test_json_path");
            std::process::exit(2);
        };
        std::process::exit(run_self_test_json(Path::new(path)));
    }
    helm_local_research_board_lib::run()
}
