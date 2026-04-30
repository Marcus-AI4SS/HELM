from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


os.environ.setdefault("PYTHONUTF8", "1")
os.environ.setdefault("PYTHONIOENCODING", "utf-8")
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

SKILLS_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = SKILLS_ROOT.parent
VALIDATOR_RESULTS_DIR = SKILLS_ROOT / "outputs" / "manager-app" / "validator-results"
if str(SKILLS_ROOT) not in sys.path:
    sys.path.insert(0, str(SKILLS_ROOT))

from manager import research_env as env  # noqa: E402

EVIDENCE_LEVELS = {
    "missing",
    "file_read",
    "field_scanned",
    "configured",
    "openable",
    "validator_ran",
    "end_to_end_success",
}
EVIDENCE_SOURCES = {
    "path",
    "config",
    "runtime",
    "validator",
    "manual_open",
    "codex_log",
    "snapshot",
    "demo",
}
VALIDATOR_NAMES = {"stack", "pipeline", "contract", "registry"}
APP_PRODUCT_VERSION = "0.9.1-usability-rc"
HANDOFF_VERSION = "helm-local-research-board-v8.5-usability-rc"
RISKY_OPEN_EXTENSIONS = {
    ".app",
    ".bat",
    ".cmd",
    ".com",
    ".command",
    ".exe",
    ".hta",
    ".jar",
    ".js",
    ".jse",
    ".lnk",
    ".py",
    ".pyw",
    ".msi",
    ".ps1",
    ".psd1",
    ".psm1",
    ".reg",
    ".scr",
    ".scf",
    ".sh",
    ".terminal",
    ".url",
    ".vbe",
    ".vbs",
    ".workflow",
    ".wsf",
}
LEGACY_ACTIONS_ENABLED = os.environ.get("HELM_ENABLE_LEGACY_BRIDGE_ACTIONS") == "1"
PUBLIC_TEXT_REPLACEMENTS = {
    "Codex" + " Research" + " Console": "HELM 本地科研看板",
    "Codex" + "ResearchConsole": "HELM",
    "Codex" + "-Research" + "-Console": "HELM",
    "codex" + "-research" + "-console": "helm-local-research-board",
}


def _load_payload(raw: str | None) -> dict[str, Any]:
    if not raw:
        return {}
    return json.loads(raw)


def _json(data: Any) -> None:
    print(json.dumps(data, ensure_ascii=False, indent=2))


def _existing_project(projects: list[dict[str, Any]]) -> str | None:
    for project in projects:
        path = project.get("path") or project.get("project_root")
        if path and Path(path).exists():
            return str(Path(path))
    for project in projects:
        path = project.get("path") or project.get("project_root")
        if path:
            return str(Path(path))
    return None


def _path_key(value: Any) -> str:
    try:
        return str(Path(str(value)).expanduser().resolve(strict=False)).casefold()
    except (OSError, RuntimeError, ValueError):
        return str(Path(str(value)).expanduser()).casefold()


def _trusted_project_keys() -> set[str]:
    keys: set[str] = set()
    for row in env.list_trusted_projects():
        path = row.get("path") or row.get("project_root")
        if path:
            keys.add(_path_key(path))
    return keys


def _is_trusted_project_path(value: Any) -> bool:
    return _path_key(value) in _trusted_project_keys()


def _project_root(payload: dict[str, Any]) -> str | None:
    explicit = payload.get("projectRoot") or payload.get("project_root")
    if explicit:
        candidate = str(Path(str(explicit)).expanduser())
        if _is_trusted_project_path(candidate):
            return candidate
        return _existing_project(env.list_trusted_projects())
    return _existing_project(env.list_trusted_projects())


def _safe_call(default: Any, fn, *args) -> Any:
    try:
        return fn(*args)
    except Exception as exc:  # noqa: BLE001
        if isinstance(default, dict):
            return {**default, "error": str(exc)}
        return default


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _public_text(value: Any) -> str:
    text = str(value or "")
    for old, new in PUBLIC_TEXT_REPLACEMENTS.items():
        text = text.replace(old, new)
    return text


def _tone(value: Any, fallback: str = "gray") -> str:
    if value in {"green", "success", "ok", "pass"}:
        return "green"
    if value in {"amber", "warning", "pending", "revise"}:
        return "amber"
    if value in {"red", "danger", "blocked", "block", "fail"}:
        return "red"
    if value in {"blue", "info"}:
        return "blue"
    if value in {"gray", "muted", "unknown"}:
        return "gray"
    return fallback


def _evidence_level(value: Any, fallback: str = "missing") -> str:
    candidate = str(value or "").strip()
    if candidate in EVIDENCE_LEVELS:
        return candidate
    if fallback in EVIDENCE_LEVELS:
        return fallback
    return "missing"


def _evidence_source(value: Any, fallback: str = "path") -> str:
    candidate = str(value or "").strip()
    if candidate in EVIDENCE_SOURCES:
        return candidate
    if fallback in EVIDENCE_SOURCES:
        return fallback
    return "path"


def _evidence(
    label: str,
    status: str,
    *,
    tone: str = "gray",
    evidence_level: str = "missing",
    evidence_source: str = "path",
    source_path: str | None = None,
    detail: str = "",
    blocking: bool = False,
    returncode: int | None = None,
    stdout_excerpt: str = "",
    stderr_excerpt: str = "",
    checked_at: str | None = None,
) -> dict[str, Any]:
    return {
        "label": _public_text(label),
        "status": _public_text(status),
        "tone": _tone(tone),
        "evidence_level": _evidence_level(evidence_level),
        "evidence_source": _evidence_source(evidence_source),
        "source_path": source_path,
        "checked_at": checked_at or _now(),
        "detail": _public_text(detail),
        "blocking": blocking,
        "returncode": returncode,
        "stdout_excerpt": stdout_excerpt,
        "stderr_excerpt": stderr_excerpt,
    }


def _status_from_row(row: dict[str, Any], *, fallback_level: str = "field_scanned", source: str = "path") -> dict[str, Any]:
    label = str(row.get("label") or row.get("name") or row.get("gate_name") or "状态")
    status = str(row.get("status") or row.get("decision") or "未读取")
    missing_like = any(token in status for token in ("缺失", "未发现", "未写入", "尚未运行"))
    return _evidence(
        label,
        status,
        tone="amber" if missing_like else str(row.get("tone") or row.get("status") or row.get("decision") or "gray"),
        evidence_level="missing" if missing_like else str(row.get("evidence_level") or fallback_level),
        evidence_source=str(row.get("evidence_source") or source),
        source_path=str(row.get("path") or row.get("source_path") or "") or None,
        detail=str(row.get("detail") or row.get("subtitle") or ""),
        blocking=bool(missing_like or row.get("blocking") or row.get("decision") in {"block", "fail"}),
    )


def _file_row(row: dict[str, Any], label: str | None = None) -> dict[str, Any]:
    path = row.get("path") or row.get("source_path") or ""
    exists = bool(row.get("exists")) if "exists" in row else bool(path and Path(str(path)).exists())
    return {
        "label": label or row.get("label") or row.get("name") or (Path(str(path)).name if path else "文件"),
        "name": row.get("name") or (Path(str(path)).name if path else ""),
        "path": str(path),
        "exists": exists,
        "status": "已读取本地文件" if exists else "未发现本地证据",
        "evidence_level": "file_read" if exists else "missing",
        "evidence_source": "path",
        "updated_at": row.get("updated_at"),
        "line_count": row.get("line_count"),
    }


def _truth_source_rows(project_root: str | None) -> list[dict[str, Any]]:
    if not project_root:
        return []
    root = Path(project_root)
    names = [
        "research-map.md",
        "findings-memory.md",
        "material-passport.yaml",
        "evidence-ledger.yaml",
    ]
    rows = []
    for name in names:
        path = root / name
        rows.append(
            _evidence(
                name,
                "已读取本地文件" if path.exists() else "未发现本地证据",
                tone="green" if path.exists() else "amber",
                evidence_level="file_read" if path.exists() else "missing",
                evidence_source="path",
                source_path=str(path),
                detail="项目事实源文件。",
                blocking=not path.exists(),
            )
        )
    return rows


def _safe_list(value: Any) -> list[dict[str, Any]]:
    return value if isinstance(value, list) else []


def _project_summary_from_trusted_row(row: dict[str, Any]) -> dict[str, Any]:
    path = row.get("path") or row.get("project_root") or ""
    project_name = row.get("name") or (Path(path).name if path else "未命名项目")
    base: dict[str, Any] = {
        "name": project_name,
        "path": path,
        "exists": bool(path and Path(path).exists()),
        "source": row.get("source") or "trusted",
        "current_stage": "未读取",
        "status": "missing",
        "missing_count": 0,
        "material_count": 0,
        "artifact_count": 0,
        "recent_activity_count": 0,
        "next_action": "选择项目后让 Codex 读取事实源。",
        "tone": "red",
        "blocking": True,
    }
    if not path:
        base["next_action"] = "可信项目缺少路径。"
        return base
    project_root = str(Path(path).expanduser())
    if not Path(project_root).exists():
        base["next_action"] = "项目路径不存在，请先确认本机目录。"
        return base

    try:
        dashboard = _safe_call({"project_exists": False}, env.project_dashboard_overview, project_root)
        sources = _safe_call({"project_exists": False}, env.project_sources_overview, project_root)
        analysis = _safe_call({"project_exists": False}, env.project_analysis_overview, project_root)
        writing = _safe_call({"project_exists": False}, env.project_writing_overview, project_root)
        truth_missing = [item for item in _truth_source_rows(project_root) if item.get("blocking")]
        blockers = [
            str(item)
            for item in _safe_list(dashboard.get("blockers"))
            if str(item).strip()
        ]
        materials = _safe_list(sources.get("canonical_files")) + _safe_list(sources.get("material_files"))
        artifacts = _safe_list(analysis.get("outputs")) + _safe_list(writing.get("writing_files")) + _safe_list(writing.get("reports"))
        activity = _safe_list(dashboard.get("activity"))
        missing_count = len(truth_missing) + len(blockers)
        base.update(
            {
                "name": dashboard.get("project_name") or project_name,
                "exists": True,
                "current_stage": _public_text(dashboard.get("current_stage") or "未写入"),
                "status": _public_text(dashboard.get("status") or "文件读取"),
                "missing_count": missing_count,
                "material_count": len(materials),
                "artifact_count": len(artifacts),
                "recent_activity_count": len(activity),
                "last_activity_at": (activity[0].get("checked_at") or activity[0].get("updated_at") or activity[0].get("time")) if activity else None,
                "next_action": _public_text(dashboard.get("next_action") or ("补齐阻断项后交给 Codex" if missing_count else "让 Codex 读取事实源并继续推进。")),
                "tone": "amber" if missing_count else "blue",
                "blocking": bool(missing_count),
            }
        )
        return base
    except Exception as exc:  # noqa: BLE001
        base.update(
            {
                "exists": True,
                "status": "读取失败",
                "tone": "amber",
                "blocking": True,
                "error": str(exc),
                "next_action": "项目摘要读取失败；请刷新或让 Codex 检查事实源。",
            }
        )
        return base


def _environment_source_status() -> dict[str, Any]:
    source = _safe_call({}, env.environment_source_status)
    mode = str(source.get("mode") or "")
    return _evidence(
        "本地环境",
        str(source.get("label") or "未读取"),
        tone="green" if mode == "live_environment" else "amber",
        evidence_level="configured" if source else "missing",
        evidence_source="runtime",
        source_path=str(source.get("active_skills_root") or "") or None,
        detail=str(source.get("detail") or "用于读取 catalog / profiles / schemas / snapshot 的环境来源。"),
        blocking=not bool(source),
    )


def _safe_slug(value: str) -> str:
    return "".join(ch if ch.isalnum() or ch in ("-", "_") else "-" for ch in value).strip("-") or "validator"


def _validator_result_path(name: str) -> Path:
    return VALIDATOR_RESULTS_DIR / f"latest-{_safe_slug(name)}.json"


def _write_validator_result(name: str, result: dict[str, Any]) -> None:
    VALIDATOR_RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    _validator_result_path(name).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")


def _read_validator_results() -> list[dict[str, Any]]:
    if not VALIDATOR_RESULTS_DIR.exists():
        return []
    rows: list[dict[str, Any]] = []
    for path in sorted(VALIDATOR_RESULTS_DIR.glob("latest-*.json")):
        try:
            rows.append(json.loads(path.read_text(encoding="utf-8")))
        except Exception:
            continue
    return rows


def _validator_status_from_result(result: dict[str, Any]) -> dict[str, Any]:
    ok = bool(result.get("ok"))
    label = str(result.get("label") or result.get("name") or "validator")
    return _evidence(
        label,
        "本地校验已通过" if ok else "本地校验未通过",
        tone="green" if ok else "red",
        evidence_level="validator_ran",
        evidence_source="validator",
        source_path=str(result.get("source_path") or result.get("script") or result.get("path") or ""),
        checked_at=str(result.get("checked_at") or _now()),
        detail=str(result.get("detail") or result.get("error") or ""),
        blocking=not ok,
        returncode=result.get("returncode"),
        stdout_excerpt=str(result.get("stdout_excerpt") or result.get("stdout") or "")[:1200],
        stderr_excerpt=str(result.get("stderr_excerpt") or result.get("stderr") or result.get("error") or "")[:1200],
    )


def _projects() -> dict[str, Any]:
    rows = []
    for row in env.list_trusted_projects():
        rows.append(_project_summary_from_trusted_row(row))
    return {"projects": rows, "selected_project_root": _existing_project(rows)}


def _project_page(payload: dict[str, Any]) -> dict[str, Any]:
    project_root = _project_root(payload)
    if not project_root:
        return {
            "project": {"name": "未检测到可信项目", "root": None, "exists": False, "current_stage": "公开样例或空状态", "status": "missing"},
            "stage_status": _evidence("项目", "未检测到可信项目", tone="amber", evidence_level="missing", blocking=True),
            "missing_inputs": ["未检测到可信项目或本地研究环境；只能使用公开样例或空状态。"],
            "recent_codex_activity": [],
            "material_entries": [],
            "artifact_entries": [],
            "environment_status": _environment_source_status(),
            "next_step_hint": "复制交接说明给 Codex，让 Codex 判断应读取哪些项目事实源。",
            "primary_actions": [],
        }
    dashboard = _safe_call({"project_exists": False}, env.project_dashboard_overview, project_root)
    sources = _safe_call({"project_exists": False}, env.project_sources_overview, project_root)
    analysis = _safe_call({"project_exists": False}, env.project_analysis_overview, project_root)
    writing = _safe_call({"project_exists": False}, env.project_writing_overview, project_root)
    root = Path(project_root)
    exists = root.exists()
    missing = [
        row["label"]
        for row in _truth_source_rows(project_root)
        if row.get("evidence_level") == "missing"
    ]
    project_blockers = [
        _public_text(item)
        for item in _safe_list(dashboard.get("blockers"))
        if str(item).strip()
    ]
    missing.extend(project_blockers)
    material_entries = [_file_row(row) for row in _safe_list(sources.get("canonical_files")) + _safe_list(sources.get("material_files"))]
    artifact_entries = [_file_row(row) for row in _safe_list(analysis.get("outputs")) + _safe_list(writing.get("writing_files")) + _safe_list(writing.get("reports"))]
    return {
        "project": {
            "name": dashboard.get("project_name") or root.name,
            "root": project_root,
            "exists": exists,
            "current_stage": _public_text(dashboard.get("current_stage") or "未写入"),
            "status": _public_text(dashboard.get("status") or ("文件读取" if exists else "missing")),
        },
        "stage_status": _evidence(
            "项目阶段",
            dashboard.get("current_stage") or "未写入",
            tone="blue" if exists else "amber",
            evidence_level="field_scanned" if exists else "missing",
            evidence_source="path",
            source_path=project_root,
            detail="阶段来自项目状态文件；缺失时只显示未写入。",
            blocking=not exists,
        ),
        "missing_inputs": missing,
        "recent_codex_activity": [_status_from_row(row, fallback_level="field_scanned", source="codex_log") for row in _safe_list(dashboard.get("activity"))[:5]],
        "material_entries": material_entries[:8],
        "artifact_entries": artifact_entries[:8],
        "environment_status": _environment_source_status(),
        "next_step_hint": _public_text(dashboard.get("next_action") or ("补齐阻断项后交给 Codex" if missing else "复制交接单，让 Codex 读取事实源后继续推进。")),
        "primary_actions": [
            {"label": "打开项目目录", "kind": "open_path", "target": project_root, "disabled": not exists},
            {"label": "交给 Codex", "kind": "handoff", "target": project_root, "disabled": False},
        ],
    }


def _credibility_page(payload: dict[str, Any]) -> dict[str, Any]:
    project_root = _project_root(payload)
    sources = _safe_call({"project_exists": False}, env.project_sources_overview, project_root) if project_root else {}
    analysis = _safe_call({"project_exists": False}, env.project_analysis_overview, project_root) if project_root else {}
    writing = _safe_call({"project_exists": False}, env.project_writing_overview, project_root) if project_root else {}
    truth_sources = _truth_source_rows(project_root)
    ledger_health = [_status_from_row(row, fallback_level="field_scanned", source="path") for row in _safe_list(sources.get("ledger_health"))]
    reproducibility = [_status_from_row(row, fallback_level="field_scanned", source="path") for row in _safe_list(analysis.get("reproducibility_status"))]
    citation = [_status_from_row(row, fallback_level="field_scanned", source="path") for row in _safe_list(writing.get("citation_chain_status"))]
    judgments = [
        _evidence(
            "文献引用",
            "待核验" if not citation else citation[0]["status"],
            tone=citation[0]["tone"] if citation else "amber",
            evidence_level=citation[0]["evidence_level"] if citation else "missing",
            evidence_source=citation[0]["evidence_source"] if citation else "path",
            detail="只展示本地写作质量报告或引用链状态，不代表实时 DOI 核验。",
            blocking=not citation,
        ),
        _evidence(
            "材料身份",
            "来源不足" if any(row.get("blocking") for row in truth_sources) else "事实源文件可读",
            tone="amber" if any(row.get("blocking") for row in truth_sources) else "green",
            evidence_level="file_read" if truth_sources and not any(row.get("blocking") for row in truth_sources) else "missing",
            evidence_source="path",
            detail="来自 research-map、findings-memory、material-passport 和 evidence-ledger。",
            blocking=any(row.get("blocking") for row in truth_sources),
        ),
        _evidence(
            "证据支撑",
            ledger_health[0]["status"] if ledger_health else "未读取证据台账",
            tone=ledger_health[0]["tone"] if ledger_health else "amber",
            evidence_level=ledger_health[0]["evidence_level"] if ledger_health else "missing",
            evidence_source=ledger_health[0]["evidence_source"] if ledger_health else "path",
            detail="只表示证据台账可读性与字段扫描，不代表研究结论成立。",
            blocking=not ledger_health,
        ),
        _evidence(
            "复现追踪",
            reproducibility[0]["status"] if reproducibility else "尚未运行",
            tone=reproducibility[0]["tone"] if reproducibility else "amber",
            evidence_level=reproducibility[0]["evidence_level"] if reproducibility else "missing",
            evidence_source=reproducibility[0]["evidence_source"] if reproducibility else "path",
            detail="来自分析文件、输出文件或本地 validator 结果。",
            blocking=not reproducibility,
        ),
    ]
    source_files = [_file_row(row) for row in _safe_list(sources.get("canonical_files")) + _safe_list(sources.get("material_files"))]
    return {
        "project_name": Path(project_root).name if project_root else "尚未选择项目",
        "judgments": judgments,
        "truth_sources": truth_sources + ledger_health,
        "gate_reports": [_status_from_row(row, fallback_level="field_scanned", source="path") for row in _safe_list(_safe_call([], env.project_quality_gate_reports, project_root))] if project_root else [],
        "source_files": source_files,
        "warning": "本页不提供综合可信分；只显示当前本地证据是否足以继续推进。",
    }


def _codex_handoff(payload: dict[str, Any]) -> dict[str, Any]:
    project_root = _project_root(payload)
    project_page = _project_page(payload)
    credibility_page = _credibility_page(payload)
    environment_page = _environment_page(payload)
    blockers = list(project_page.get("missing_inputs") or [])
    blockers.extend([item["label"] for item in credibility_page.get("judgments", []) if item.get("blocking")])
    validators = [item for item in environment_page.get("validators", []) if item.get("evidence_level") == "validator_ran"]
    handoff = {
        "handoff_version": HANDOFF_VERSION,
        "generated_at": _now(),
        "product_boundary": "App 只读取本地文件、打开本地资源、运行本地 validator，并准备交给 Codex 的交接单；研究判断、写作和核验必须回到 Codex 对话并由用户确认。",
        "project": {
            "name": project_page["project"]["name"],
            "root": project_root or "",
            "exists": bool(project_root and Path(project_root).exists()),
            "trusted_config_detected": bool(project_root),
        },
        "local_evidence": {
            "truth_sources": credibility_page.get("truth_sources", []),
            "reports": project_page.get("artifact_entries", []),
            "runtime": [environment_page.get("source_status")],
            "integrations": environment_page.get("local_capabilities", []),
        },
        "validation": {
            "validators_run": validators,
            "blocking_failures": blockers,
            "last_success_level": "validator_ran" if validators and not blockers else "field_scanned",
        },
        "missing_inputs": blockers,
        "safe_next_actions_for_codex": [
            "先读取项目事实源文件和质量门报告。",
            "说明将调用哪些 skill/MCP/plugin，以及每个组件的作用。",
            "对缺失证据先补台账或返回阻断，不要直接写正式结论。",
        ],
        "forbidden_claims": [
            "不要把配置态称为真实连通。",
            "不要把本地文件存在称为内容已核验。",
            "不要在未实时核验 DOI 前写入正式引用。",
            "不要把 App 生成的交接单当作研究结论。",
        ],
    }
    handoff["text"] = "\n".join(
        [
            "请根据以下本地项目交接单继续工作。",
            f"项目路径：{handoff['project']['root'] or '未选择'}",
            f"项目名：{handoff['project']['name']}",
            f"当前阶段：{project_page['project'].get('current_stage')}",
            "产品边界：HELM 只提供本地状态与证据线索；研究判断、写作和任务推进必须回到 Codex 对话并由用户确认。",
            "缺失/阻断：",
            *(f"- {item}" for item in (blockers or ["暂无显式阻断；仍需读取事实源确认。"])),
            "建议交给 Codex：",
            *(f"- {item}" for item in handoff["safe_next_actions_for_codex"]),
            "禁止声称：",
            *(f"- {item}" for item in handoff["forbidden_claims"]),
        ]
    )
    return handoff


def _next_step_page(payload: dict[str, Any]) -> dict[str, Any]:
    project_root = _project_root(payload)
    project_page = _project_page(payload)
    handoff = _codex_handoff(payload)
    blockers = handoff.get("missing_inputs", [])
    recommended = "补齐阻断项后交给 Codex" if blockers else "让 Codex 读取事实源并继续推进"
    return {
        "project_name": project_page["project"]["name"],
        "recommended_action": recommended,
        "rationale": "该建议只基于本地项目文件、质量门和环境状态；复杂研究判断必须回到 Codex。",
        "preconditions": [
            project_page["stage_status"],
            *(_credibility_page(payload).get("judgments", [])[:2]),
        ],
        "blockers": blockers,
        "related_files": project_page.get("material_entries", [])[:5],
        "handoff": handoff,
    }


def _deliverables_page(payload: dict[str, Any]) -> dict[str, Any]:
    project_root = _project_root(payload)
    writing = _safe_call({"project_exists": False}, env.project_writing_overview, project_root) if project_root else {}
    analysis = _safe_call({"project_exists": False}, env.project_analysis_overview, project_root) if project_root else {}
    reports = [_file_row(row) for row in _safe_list(writing.get("reports"))]
    draft_files = [_file_row(row) for row in _safe_list(writing.get("writing_files"))]
    figures = [_file_row(row) for row in _safe_list(analysis.get("outputs"))]
    deliverables = [
        {
            "label": "文稿",
            "description": "已有草稿和写作报告；Console 不生成正文。",
            "files": draft_files + reports,
            "status": _evidence("文稿", "已读取本地文件" if draft_files else "未发现本地证据", tone="green" if draft_files else "amber", evidence_level="file_read" if draft_files else "missing", blocking=not draft_files),
        },
        {
            "label": "图表",
            "description": "分析输出和图表文件；不代表结果已复现。",
            "files": figures,
            "status": _evidence("图表", "已读取本地文件" if figures else "未发现本地证据", tone="green" if figures else "amber", evidence_level="file_read" if figures else "missing", blocking=not figures),
        },
        {
            "label": "复现包",
            "description": "复现状态来自脚本、输出和 validator。",
            "files": [_file_row(row) for row in _safe_list(analysis.get("scripts"))],
            "status": _status_from_row(_safe_list(analysis.get("reproducibility_status"))[0], source="path") if _safe_list(analysis.get("reproducibility_status")) else _evidence("复现包", "尚未运行", tone="amber", blocking=True),
        },
        {
            "label": "投稿材料",
            "description": "只显示已有材料与 gate，不提交材料。",
            "files": reports,
            "status": _evidence("投稿材料", "待 gate 检查", tone="amber", evidence_level="field_scanned", detail="需要回到 Codex 对话中由用户确认并推进送审包检查。"),
        },
    ]
    return {
        "project_name": Path(project_root).name if project_root else "尚未选择项目",
        "deliverables": deliverables,
        "gate_status": [_status_from_row(row, fallback_level="field_scanned", source="path") for row in _safe_list(_safe_call([], env.project_quality_gate_reports, project_root))] if project_root else [],
        "export_directories": [],
    }


def _environment_page(payload: dict[str, Any]) -> dict[str, Any]:
    project_root = _project_root(payload)
    overview = env.environment_overview()
    source = overview.get("source_status", {})
    integrations = env.integrations_overview()
    runtime = env.runtime_info()
    capabilities = []
    for item in _safe_list(integrations.get("capabilities")):
        label = str(item.get("label") or "本地能力")
        detected = bool(item.get("detected"))
        capabilities.append(
            _evidence(
                label,
                "可尝试打开本地入口" if detected else "未发现本地入口",
                tone="green" if detected else "gray",
                evidence_level="openable" if detected else "missing",
                evidence_source="runtime",
                detail=str(item.get("detail") or ""),
                blocking=False,
            )
        )
    configured_mcp = integrations.get("active_mcp") or overview.get("summary", {}).get("active_mcp", [])
    for name in configured_mcp:
        capabilities.append(
            _evidence(
                str(name),
                "配置中已启用",
                tone="blue",
                evidence_level="configured",
                evidence_source="config",
                detail="MCP 配置启用不等于真实连通。",
            )
        )
    validators = [
        _evidence("stack validator", "可执行校验入口", tone="blue", evidence_level="configured", evidence_source="path"),
        _evidence("pipeline validator", "可执行校验入口", tone="blue", evidence_level="configured", evidence_source="path"),
        _evidence("contract validator", "可执行校验入口", tone="blue", evidence_level="configured", evidence_source="path"),
        _evidence("registry validator", "可执行校验入口", tone="blue", evidence_level="configured", evidence_source="path"),
    ]
    validator_results = [_validator_status_from_result(row) for row in _read_validator_results()]
    if validator_results:
        result_labels = {str(row.get("label")) for row in validator_results}
        validators = [row for row in validators if str(row.get("label")) not in result_labels]
        validators = validator_results + validators
    return {
        "source_status": _evidence(
            "环境来源",
            str(source.get("label") or "未读取"),
            tone="green" if source.get("mode") == "live_environment" else "amber",
            evidence_level="configured" if source else "missing",
            evidence_source="runtime",
            source_path=str(source.get("active_skills_root") or ""),
            detail=str(source.get("detail") or ""),
        ),
        "current_project_readiness": [
            _evidence(
                "当前项目",
                "已读取项目路径" if project_root else "未选择项目",
                tone="green" if project_root else "amber",
                evidence_level="file_read" if project_root else "missing",
                evidence_source="path",
                source_path=project_root,
                blocking=not bool(project_root),
            )
        ],
        "local_capabilities": capabilities,
        "validators": validators,
        "runtime": runtime,
    }


def _dashboard(payload: dict[str, Any]) -> dict[str, Any]:
    project_root = _project_root(payload)
    overview = env.environment_overview()
    projects = _projects()
    return {
        "product": {
            "name": "HELM 本地科研看板",
            "tagline": "本地项目状态、证据台账、交付物和交接单看板",
            "version": APP_PRODUCT_VERSION,
        },
        "source_status": overview.get("source_status", {}),
        "projects": projects["projects"],
        "selected_project_root": project_root,
        "project_page": _project_page(payload),
        "credibility_page": _credibility_page(payload),
        "next_step_page": _next_step_page(payload),
        "deliverables_page": _deliverables_page(payload),
        "environment_page": _environment_page(payload),
        "runtime": env.runtime_info(),
    }


def _codex_context(payload: dict[str, Any]) -> dict[str, Any]:
    handoff = _codex_handoff(payload)
    return {"project_root": handoff["project"]["root"], "context": handoff["text"], "handoff": handoff}


def _resolve_existing_path(value: Any) -> Path:
    return Path(str(value)).expanduser().resolve()


def _path_is_relative_to(path: Path, root: Path) -> bool:
    try:
        path.relative_to(root)
        return True
    except ValueError:
        return False


def _allowed_open_roots(payload: dict[str, Any]) -> list[Path]:
    roots: list[Path] = [REPO_ROOT, SKILLS_ROOT, VALIDATOR_RESULTS_DIR]
    project_root = _project_root(payload)
    if project_root:
        roots.append(Path(project_root))
    runtime = _safe_call({}, env.runtime_info)
    for key in ("app_root", "app_outputs_root", "active_skills_root", "env_skills_root", "snapshot_root"):
        value = runtime.get(key)
        if value:
            roots.append(Path(str(value)))

    resolved: list[Path] = []
    seen: set[str] = set()
    for root in roots:
        try:
            candidate = root.expanduser().resolve()
        except OSError:
            continue
        if not candidate.exists():
            continue
        marker = str(candidate).casefold()
        if marker in seen:
            continue
        seen.add(marker)
        resolved.append(candidate)
    return resolved


def _open_path(payload: dict[str, Any]) -> dict[str, Any]:
    target = payload.get("path")
    dry_run = bool(payload.get("dryRun") or payload.get("dry_run"))
    if not target:
        return {"ok": False, "error": "缺少 path"}
    path = _resolve_existing_path(target)
    if not path.exists():
        return {
            "ok": False,
            "error": f"路径不存在：{path}",
            "requested_path": str(path),
            "opened_path": "",
            "open_mode": "missing",
            "blocked_reason": "path_not_found",
            "evidence_level": "missing",
            "evidence_source": "manual_open",
        }
    allowed_roots = _allowed_open_roots(payload)
    if not any(_path_is_relative_to(path, root) or path == root for root in allowed_roots):
        return {
            "ok": False,
            "error": "拒绝打开不在当前项目或 HELM 运行资源范围内的路径。",
            "path": str(path),
            "requested_path": str(path),
            "opened_path": "",
            "open_mode": "denied",
            "blocked_reason": "outside_allowed_roots",
            "evidence_level": "missing",
            "evidence_source": "manual_open",
        }
    open_target = path
    open_mode = "directory" if path.is_dir() else "file"
    blocked_reason = ""
    if path.is_file() and path.suffix.lower() in RISKY_OPEN_EXTENSIONS:
        open_target = path.parent
        open_mode = "parent_directory_for_risky_file"
        blocked_reason = "risky_file_not_executed"
    if not dry_run:
        env.open_path(open_target)
    return {
        "ok": True,
        "path": str(open_target),
        "requested_path": str(path),
        "opened_path": str(open_target),
        "open_mode": open_mode,
        "blocked_reason": blocked_reason,
        "dry_run": dry_run,
        "evidence_level": "openable",
        "evidence_source": "manual_open",
    }


def _open_external_app(payload: dict[str, Any]) -> dict[str, Any]:
    label = str(payload.get("label") or "")
    dry_run = bool(payload.get("dryRun") or payload.get("dry_run"))
    if not label:
        return {"ok": False, "error": "缺少 label"}
    app = next((item for item in env.list_platform_apps() if item.get("label") == label), None)
    ok = bool(app)
    if ok and not dry_run:
        ok = env.open_platform_app(label)
    return {
        "ok": ok,
        "label": label,
        "path": app.get("path") if app else "",
        "launch_mode": app.get("launch_mode", "path") if app else "",
        "dry_run": dry_run,
        "evidence_level": "openable" if ok else "missing",
        "evidence_source": "manual_open",
        "status": "可尝试打开本地入口" if ok else "未发现本地入口",
    }


def _run_validator(payload: dict[str, Any]) -> dict[str, Any]:
    name = str(payload.get("name") or "stack")
    if name not in VALIDATOR_NAMES:
        return {
            "ok": False,
            "name": name,
            "label": f"{name} validator",
            "error": "不支持的 validator 名称。",
            "returncode": 2,
            "evidence_level": "missing",
            "evidence_source": "validator",
            "checked_at": _now(),
            "status": "未运行：validator 不在白名单内",
        }
    result = env.run_validator(name)
    enriched = {
        **result,
        "name": name,
        "label": f"{name} validator",
        "evidence_level": "validator_ran",
        "evidence_source": "validator",
        "checked_at": _now(),
        "stdout_excerpt": str(result.get("stdout") or "")[:1200],
        "stderr_excerpt": str(result.get("stderr") or result.get("error") or "")[:1200],
        "status": "已运行本地校验：通过" if result.get("ok") else "已运行本地校验：未通过",
    }
    _write_validator_result(name, enriched)
    return enriched


def _scaffold_project(payload: dict[str, Any]) -> dict[str, Any]:
    path = payload.get("path")
    if not path:
        return {"ok": False, "error": "缺少项目路径"}
    return env.bootstrap_project(path, payload.get("researchType") or payload.get("routeHint"))


def main() -> None:
    parser = argparse.ArgumentParser(description="Local bridge for HELM Local Research Board.")
    parser.add_argument("action")
    parser.add_argument("--payload")
    args = parser.parse_args()
    payload = _load_payload(args.payload)

    public_actions = {
        "dashboard": lambda: _dashboard(payload),
        "project_page": lambda: _project_page(payload),
        "credibility_page": lambda: _credibility_page(payload),
        "next_step_page": lambda: _next_step_page(payload),
        "deliverables_page": lambda: _deliverables_page(payload),
        "environment_page": lambda: _environment_page(payload),
        "codex_handoff": lambda: _codex_handoff(payload),
        "run_validator": lambda: _run_validator(payload),
        "open_path": lambda: _open_path(payload),
        "open_external_app": lambda: _open_external_app(payload),
    }
    legacy_actions = {
        "projects": lambda: _projects(),
        "project_detail": lambda: env.project_dashboard_overview(_project_root(payload)),
        "sources_summary": lambda: env.project_sources_overview(_project_root(payload)),
        "analysis_summary": lambda: env.project_analysis_overview(_project_root(payload)),
        "writing_summary": lambda: env.project_writing_overview(_project_root(payload)),
        "health_status": lambda: {
            "environment": env.environment_overview(),
            "integrations": env.integrations_overview(),
            "runtime": env.runtime_info(),
        },
        "docs_index": lambda: {"docs": env.docs_tree()},
        "codex_context": lambda: _codex_context(payload),
        "route_preview": lambda: env.route_preview(str(payload.get("task") or "")),
        "scaffold_project": lambda: _scaffold_project(payload),
    }
    actions = dict(public_actions)
    if LEGACY_ACTIONS_ENABLED:
        actions.update(legacy_actions)
    try:
        if args.action in legacy_actions and not LEGACY_ACTIONS_ENABLED:
            raise ValueError(
                f"legacy-only action 默认关闭：{args.action}；"
                "设置 HELM_ENABLE_LEGACY_BRIDGE_ACTIONS=1 仅用于本地兼容检查。"
            )
        if args.action not in actions:
            raise ValueError(f"不支持的 action：{args.action}")
        _json(actions[args.action]())
    except Exception as exc:  # noqa: BLE001
        print(
            json.dumps({"ok": False, "action": args.action, "error": str(exc)}, ensure_ascii=False, indent=2),
            file=sys.stderr,
        )
        raise SystemExit(1) from exc


if __name__ == "__main__":
    main()
