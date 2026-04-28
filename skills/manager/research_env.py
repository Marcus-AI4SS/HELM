from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import tomllib
from dataclasses import dataclass
from pathlib import Path
from typing import Any

try:
    import winreg
except ImportError:  # pragma: no cover - non-Windows platforms
    winreg = None


SNAPSHOT_DIR_NAME = "environment-snapshot"


def _is_valid_data_root(candidate: Path) -> bool:
    """A data root supplies environment rules; it does not own the app UI."""
    return (
        candidate.exists()
        and (candidate / "catalog").exists()
        and (candidate / "scripts").exists()
    )


def _detect_app_root() -> Path:
    override = os.environ.get("CODEX_RESEARCH_APP_ROOT")
    if override:
        candidate = Path(override).expanduser().resolve()
        if (candidate / "manager").exists():
            return candidate

    if getattr(sys, "frozen", False):
        exe_path = Path(sys.executable).resolve()
        for candidate in [exe_path.parent, *exe_path.parents]:
            if (candidate / "manager").exists() and (candidate / "scripts").exists():
                return candidate
            if candidate.name == "skills" and (candidate / "manager").exists():
                return candidate

    source_root = Path(__file__).resolve().parent.parent
    return source_root


def _default_live_env_skills_root(app_root: Path) -> Path:
    # Public companion layout:
    #   workspace/HELM/skills
    #   workspace/VELA/skills
    if app_root.parent.name.lower() == "helm":
        return app_root.parent.parent / "VELA" / "skills"

    return app_root.parent / "VELA" / "skills"


def _detect_env_skills_root(app_root: Path) -> Path:
    candidates: list[Path] = []
    for env_name in ["HELM_VELA_SKILLS_ROOT", "CODEX_RESEARCH_ENV_SKILLS_ROOT", "ENV_SKILLS_ROOT"]:
        override = os.environ.get(env_name)
        if override:
            candidates.append(Path(override).expanduser().resolve())

    legacy_override = os.environ.get("CODEX_RESEARCH_ROOT")
    if legacy_override:
        candidates.append(Path(legacy_override).expanduser().resolve())

    candidates.append(_default_live_env_skills_root(app_root).resolve())

    for candidate in candidates:
        if _is_valid_data_root(candidate):
            return candidate
    return candidates[0] if candidates else _default_live_env_skills_root(app_root).resolve()


def _live_env_disabled() -> bool:
    value = os.environ.get("CODEX_RESEARCH_DISABLE_LIVE_ENV", "")
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _detect_active_data_root(app_root: Path, env_skills_root: Path, snapshot_root: Path) -> Path:
    if not _live_env_disabled() and _is_valid_data_root(env_skills_root):
        return env_skills_root
    if _is_valid_data_root(snapshot_root):
        return snapshot_root
    if _is_valid_data_root(app_root):
        return app_root
    return snapshot_root


APP_ROOT = _detect_app_root()
APP_ENV_ROOT = APP_ROOT.parent
SNAPSHOT_ROOT = APP_ROOT / SNAPSHOT_DIR_NAME
SNAPSHOT_MANIFEST_PATH = APP_ROOT / "snapshot-manifest.json"
ENV_SKILLS_ROOT = _detect_env_skills_root(APP_ROOT)
ROOT = _detect_active_data_root(APP_ROOT, ENV_SKILLS_ROOT, SNAPSHOT_ROOT)
ENV_ROOT = ROOT.parent
APP_OUTPUTS_DIR = APP_ROOT / "outputs"
CODEX_HOME = Path(os.environ.get("CODEX_HOME", str(Path.home() / ".codex")))
CONFIG_PATH = CODEX_HOME / "config.toml"
SKILLS_DIR = CODEX_HOME / "skills"
DOCS_DIR = ROOT / "docs"
OUTPUTS_DIR = ROOT / "outputs"
PROFILES_DIR = ROOT / "profiles"
CATALOG_DIR = ROOT / "catalog"
CLOUD_DIR = ROOT / "cloud"
PLUGIN_DIR = ROOT / "plugins" / "research-autopilot"
MANAGER_DIR = APP_ROOT / "manager"
MANAGER_ASSETS_DIR = MANAGER_DIR / "assets"
def _detect_host_platform() -> str:
    # Avoid platform.system() on Windows because it may block on WMI in restricted sessions.
    if sys.platform.startswith("win"):
        return "windows"
    if sys.platform == "darwin":
        return "darwin"
    if sys.platform.startswith("linux"):
        return "linux"
    return os.name.lower()


HOST_PLATFORM = _detect_host_platform()


def _is_windows() -> bool:
    return HOST_PLATFORM == "windows"


def _is_macos() -> bool:
    return HOST_PLATFORM == "darwin"


def _venv_python_for(base: Path) -> Path:
    if _is_windows():
        return base / ".venv" / "Scripts" / "python.exe"
    for candidate in [base / ".venv" / "bin" / "python3", base / ".venv" / "bin" / "python"]:
        if candidate.exists():
            return candidate
    return base / ".venv" / "bin" / "python3"


VENV_PYTHON = _venv_python_for(ENV_ROOT)
POWERSHELL = shutil.which("pwsh") or "pwsh"
HOST_SHELL = (
    shutil.which("pwsh")
    or shutil.which("zsh")
    or shutil.which("bash")
    or shutil.which("powershell")
    or ""
)
SCHEMAS_DIR = ROOT / "schemas"

DEFAULT_GLOBAL_RULES = {
    "language": "zh-CN",
    "role": "world-class-doctoral-supervisor",
    "require_realtime_verification": True,
    "formal_citation_requires_doi": True,
    "forbid_unverified_references": True,
    "forbid_ai_hallucinated_citations": True,
    "data_paragraph_framework": "PEEL",
}

MCP_NOTES = {
    "chrome-devtools": "读取浏览器登录态下真实可见的页面内容与动态页面状态。",
    "social-platform-mcp": "统一封装跨平台社媒页面抓取与证据落盘，作为标准化 capture facade 使用。",
    "zotero-mcp": "连接正式文献库，负责入库、标签、笔记和导出。",
    "openalex-mcp": "提供学术图谱、作者、期刊和趋势层面的开放元数据。",
    "semantic-scholar-mcp": "提供语义相关论文、引文影响和关联发现。",
    "google-scholar-mcp": "作为 Scholar 发现层补充，不直接充当正式引文来源。",
    "cnki-mcp": "作为中文文献发现层补充，不直接充当正式引文来源。",
    "paper-search-mcp": "补充开放获取和预印本发现，不替代正式核验链。",
    "xiaohongshu-mcp": "小红书平台专用补充后端，只负责平台特定结构化能力，不再承担跨平台总入口。",
}

PLUGIN_NOTES = {
    "GitHub": "用于查看上游仓库、issue、PR 和生态候选实现。",
    "Superpowers": "提供规划、技能编写、调试和执行方法论。",
    "Hugging Face": "作为计算社科增强层，补充模型、数据集和推理模板。",
    "Scite": "作为文献发现增强层，补充带引文语境的研究检索。",
    "Google Drive": "作为外部文件协作层，处理 Drive、Docs、Sheets 和 Slides 任务。",
}

ROUTE_LABELS = {
    "computational-social-science": "计算社会科学项目",
    "empirical-quant": "量化实证分析",
    "environment-ops": "环境维护",
    "general-research": "通用研究任务",
    "literature-review": "文献综述",
    "long-running-experiment-ops": "长时实验运维",
    "network-analysis": "社会网络分析",
    "project-retrospective": "项目复盘",
    "single-paper-review": "单篇论文评审",
    "social-platform-case": "社媒案例研究",
    "social-science-submission-package": "投稿材料整理",
    "stack-governance": "环境治理",
    "text-corpus": "文本语料分析",
    "writing-export": "写作与导出",
}

SCOPE_CLASS_LABELS = {
    "always_multi_agent": "默认进入项目协作",
    "conditional_multi_agent": "按任务规模决定",
    "never_default_multi_agent": "默认单步处理",
}

DATA_ACCESS_LABELS = {
    "authenticated_visible": "登录后浏览器可见内容",
    "licensed_library": "授权数据库与正式文献库",
    "public_open": "公开资料与本地项目文件",
}

TASK_TYPE_LABELS = {
    "computational_social_science": "计算社会科学",
    "environment_ops": "环境维护",
    "general_research": "通用研究",
    "literature_review": "文献综述",
    "network_analysis": "网络分析",
    "paper_review": "论文评审",
    "project_retrospective": "项目复盘",
    "quant_analysis": "量化分析",
    "runtime_ops": "运行维护",
    "social_evidence": "社媒证据",
    "stack_governance": "环境治理",
    "submission_packaging": "投稿整理",
    "text_analysis": "文本分析",
    "writing_export": "写作导出",
}

DISPATCH_STAGE_LABELS = {
    "planning": "规划中",
    "dispatch_ready": "已形成分派方案",
    "dispatched": "已进入协作执行",
    "review_pending": "等待复核",
    "blocked": "当前被阻断",
}

PROFILE_LABELS = {
    "baseline": "日常基线",
    "literature": "文献工作",
    "paper-review": "单篇评审",
    "css-text-network": "文本与网络分析",
    "social-platform": "社媒证据",
    "writing-review": "写作与返修",
    "cloud-batch": "云端批处理",
}

SKILL_LABELS = {
    "research-autopilot": "自动研究助手",
    "research-team-orchestrator": "项目协作编排",
    "social-platform-reader": "社媒证据读取",
    "citation-verifier": "引文核验",
    "cnki-research": "CNKI 文献发现",
    "google-scholar-research": "Scholar 文献发现",
    "openalex-landscape": "学术版图扫描",
    "academic-paper-review": "单篇论文评审",
    "quant-analysis": "量化分析",
    "text-analysis": "文本分析",
    "network-analysis": "网络分析",
    "research-design-studio": "研究设计",
    "dataset-discovery": "数据集发现",
    "digital-trace-pipeline": "数字踪迹流程",
    "abm-simulation-lab": "ABM 仿真",
    "reproducibility-package": "复现包整理",
    "long-running-experiment-ops": "长时实验运维",
    "figure-table-studio": "图表工作室",
    "reviewer-response-pack": "审稿回复整理",
    "social-science-submission-packager": "投稿材料整理",
    "research-docx-export": "Word 导出",
    "writing-reference-capture": "写作引文捕获",
    "latex-paper-conversion": "LaTeX 模板迁移",
    "obsidian-research-sync": "Obsidian 同步",
    "research-stack-manager": "环境治理",
    "project-retrospective-evolver": "项目复盘",
    "local-cloud-router": "本地与云端判断",
    "skill-vetter": "组件审查",
}

MCP_LABELS = {
    "chrome-devtools": "浏览器读取",
    "social-platform-mcp": "社媒采集连接",
    "xiaohongshu-mcp": "小红书补充读取",
    "zotero-mcp": "Zotero 文献库",
    "openalex-mcp": "OpenAlex 学术图谱",
    "semantic-scholar-mcp": "Semantic Scholar",
    "google-scholar-mcp": "Google Scholar 发现层",
    "cnki-mcp": "CNKI 发现层",
    "paper-search-mcp": "论文搜索补充",
}

SKILL_NOTES = {
    "academic-paper-review": "负责单篇论文的结构化评审、方法识别、证据核查和审稿意见组织。",
    "systematic-literature-review": "负责多篇文献的系统综述、主题比较、证据归纳和研究缺口提炼。",
    "citation-verifier": "负责 DOI、期刊、作者、年份与正式发表信息的核验，阻止伪引文进入正式链路。",
    "cnki-research": "负责中文文献发现、筛选和初步元数据收集。",
    "google-scholar-research": "负责 Scholar 层面的广泛发现、初筛和引文线索补充。",
    "openalex-landscape": "负责学术版图、作者群体、期刊分布与趋势扫描。",
    "semantic-citation-tracer": "负责前向/后向引文扩展和语义相近论文追踪。",
    "zotero-sync": "负责把已核验文献、标签和笔记写入 Zotero 正式文献库。",
    "quant-analysis": "负责描述统计、回归、面板模型和稳健性分析等定量工作。",
    "text-analysis": "负责语料清洗、编码、主题提取、词典分析与嵌入式文本分析。",
    "network-analysis": "负责构建关系网络、计算结构指标、识别社群并生成网络解释。",
    "research-design-studio": "负责把研究问题转成可执行设计，包括假设、数据策略和识别逻辑。",
    "dataset-discovery": "负责寻找开放数据、平台导出、复现数据和机器可读数据源。",
    "digital-trace-pipeline": "负责平台数据、网页痕迹和社媒数字踪迹的采集与处理流程设计。",
    "abm-simulation-lab": "负责代理人模型、规则系统、参数扫描和社会过程模拟实验。",
    "reproducibility-package": "负责整理脚本、环境、输入输出和复现说明，形成可复跑研究包。",
    "long-running-experiment-ops": "负责长时实验运行监督、断点续跑、状态诊断、worker 控制、后台任务和崩溃恢复。",
    "figure-table-studio": "负责论文级图表、回归表和可直接入稿的可视化输出。",
    "reviewer-response-pack": "负责把审稿意见转成逐条回应、修订矩阵和返修材料。",
    "social-science-submission-packager": "负责社会科学论文送审包，统一冻结事实源、交付边界、复现材料、图表、引文核验和公开/内部文件。",
    "research-docx-export": "负责把综述、评审、案例分析和项目简报输出为 Word 文档。",
    "writing-reference-capture": "负责在写作开始前识别实际用到的论文，完成核验、Zotero 项目入库和 Obsidian 项目同步。",
    "latex-paper-conversion": "负责不同期刊或会议模板之间的 LaTeX 迁移与格式修复。",
    "social-platform-reader": "负责从浏览器登录态或平台后端读取社媒页面的真实可见内容并结构化抽取。",
    "obsidian-research-sync": "负责把项目结论、方法卡和复盘内容同步到 Obsidian 知识库。",
    "project-retrospective-evolver": "负责项目结束后的流程复盘，并判断是否需要沉淀或更新技能。",
    "research-stack-manager": "负责整栈治理、冲突审计、组件去留说明和后续演进提案。",
    "research-autopilot": "负责统一主路由，自动决定技能、MCP、插件和本地/云端路径。",
    "research-team-orchestrator": "负责把项目型任务的多 agent 规划写成 clarification card、dispatch artifact、target-specific review 映射和 canonical 输出骨架。",
    "local-cloud-router": "负责判断任务更适合本地执行还是切到云端资源。",
    "skill-vetter": "负责在纳入第三方技能、插件或 MCP 之前审查权限、维护性和重叠风险。",
}

WRITING_CHECK_LABELS = {
    "style_calibration": "风格校准",
    "argument_chain_closure": "论证闭环",
    "citation_alignment": "引文对应",
    "empty_phrase_scan": "空洞表达扫描",
}

ROUTE_PREP_HINTS = {
    "literature-review": ["明确研究主题", "准备关键词或核心问题", "确认是否需要 Zotero 与 Obsidian 同步"],
    "computational-social-science": ["明确研究问题", "准备数据来源想法", "说明希望先做设计、数据还是分析"],
    "social-platform-case": ["准备目标链接或页面", "说明要抓正文还是评论", "说明是否需要后续案例分析或报告"],
    "empirical-quant": ["准备数据文件或变量说明", "说明核心因变量与自变量", "说明是否需要表格或图形输出"],
    "text-corpus": ["准备语料来源", "说明分析目标", "确认是否需要编码、主题或词典分析"],
    "network-analysis": ["准备节点边数据", "说明网络对象", "确认要看结构、社群还是可视化"],
    "writing-export": ["说明目标产物", "准备提纲或草稿", "确认是否需要返修或投稿材料"],
}

SOCIAL_COMPLEXITY_KEYWORDS = [
    "专辑",
    "收藏",
    "board",
    "评论",
    "批量",
    "滚动",
    "点击",
    "截图",
    "证据",
    "懒加载",
    "爬",
    "抓取",
    "采集",
    "全部",
    "逐条",
]

SOCIAL_AUTOMATION_DEBUG_KEYWORDS = [
    "模板",
    "脚本",
    "debug",
    "调试",
    "trace",
    "har",
    "dashboard",
    "复用流程",
]

SOCIAL_SIMPLE_XHS_KEYWORDS = [
    "小红书搜索",
    "search",
    "profile",
    "主页",
    "公开笔记",
    "公开详情",
    "feed",
]


@dataclass
class RoutePreview:
    task_class: str
    project_scope_class: str
    task_type: str
    data_access_level: str
    quality_gate_required: list[str]
    stage_scope: list[str]
    subagent_allowed: bool
    profile: str
    skills: list[str]
    helper_skills: list[str]
    project_helper_skills: list[str]
    plugins: list[str]
    mcp: list[str]
    excluded: list[dict[str, str]]
    rationale: str
    next_step: str
    score: int


def load_json(path: Path, default: Any | None = None) -> Any:
    if not path.exists():
        return {} if default is None else default
    return json.loads(path.read_text(encoding="utf-8"))


def load_toml(path: Path, default: dict[str, Any] | None = None) -> dict[str, Any]:
    if not path.exists():
        return {} if default is None else default
    try:
        return tomllib.loads(path.read_text(encoding="utf-8"))
    except tomllib.TOMLDecodeError:
        return tomllib.loads(path.read_text(encoding="utf-8-sig"))


def _snapshot_manifest() -> dict[str, Any]:
    if SNAPSHOT_MANIFEST_PATH.exists():
        return load_json(SNAPSHOT_MANIFEST_PATH, {})
    embedded_manifest = SNAPSHOT_ROOT / "snapshot-manifest.json"
    if embedded_manifest.exists():
        return load_json(embedded_manifest, {})
    return {}


def environment_source_status() -> dict[str, Any]:
    live_disabled = _live_env_disabled()
    live_available = _is_valid_data_root(ENV_SKILLS_ROOT) and not live_disabled
    snapshot_available = _is_valid_data_root(SNAPSHOT_ROOT)
    legacy_available = _is_valid_data_root(APP_ROOT)

    if ROOT == ENV_SKILLS_ROOT and live_available:
        mode = "live_environment"
        label = "实时环境"
        detail = "正在从 VELA companion environment 实时读取 catalog / profiles / schemas / docs / scripts / plugins。"
    elif ROOT == SNAPSHOT_ROOT and snapshot_available:
        mode = "snapshot_fallback"
        label = "内置快照"
        detail = "live 环境不可用，已回退到 app 内置环境快照。"
    elif ROOT == APP_ROOT and legacy_available:
        mode = "legacy_app_snapshot"
        label = "兼容快照"
        detail = "live 环境和正式 snapshot 都不可用，暂时读取 app 根目录下的旧版环境副本。"
    else:
        mode = "missing"
        label = "环境缺失"
        detail = "未找到可用的 live 环境或内置快照。"

    manifest = _snapshot_manifest()
    return {
        "mode": mode,
        "label": label,
        "detail": detail,
        "live_disabled": live_disabled,
        "live_available": live_available,
        "snapshot_available": snapshot_available,
        "legacy_available": legacy_available,
        "app_root": str(APP_ROOT),
        "app_env_root": str(APP_ENV_ROOT),
        "env_skills_root": str(ENV_SKILLS_ROOT),
        "snapshot_root": str(SNAPSHOT_ROOT),
        "active_skills_root": str(ROOT),
        "active_env_root": str(ENV_ROOT),
        "snapshot_manifest_path": str(SNAPSHOT_MANIFEST_PATH),
        "snapshot_generated_at": str(manifest.get("generated_at", "")),
        "snapshot_source_head": str(manifest.get("source_head", "")),
        "snapshot_file_count": manifest.get("file_count", 0),
    }


def workspace_link_status() -> dict[str, str]:
    status = environment_source_status()
    return {
        "workspace_mode": str(status["mode"]),
        "workspace_label": str(status["label"]),
        "workspace_detail": str(status["detail"]),
        "environment_source": str(status["active_skills_root"]),
    }


def load_settings() -> dict[str, Any]:
    return load_toml(CATALOG_DIR / "settings.toml", {})


def global_route_rules() -> dict[str, Any]:
    rules = dict(DEFAULT_GLOBAL_RULES)
    rules.update(load_settings().get("global_route_rules", {}))
    return rules


def load_skill_catalog() -> dict[str, Any]:
    return load_json(CATALOG_DIR / "skill_catalog.json", {"skills": {}})


def load_conflict_matrix() -> dict[str, Any]:
    return load_json(CATALOG_DIR / "conflict_matrix.json", {})


def load_routing_table() -> dict[str, Any]:
    return load_json(CATALOG_DIR / "routing_table.json", {"routes": []})


def load_external_candidates() -> dict[str, Any]:
    return load_json(CATALOG_DIR / "external_plugin_candidates.json", {})


def load_manager_distributions() -> dict[str, Any]:
    return load_json(CATALOG_DIR / "manager_distributions.json", {})


def load_pipeline_stages() -> dict[str, Any]:
    return load_json(CATALOG_DIR / "research_pipeline_stages.json", {"stages": [], "route_stage_sequences": {}})


def load_quality_gates() -> dict[str, Any]:
    return load_json(CATALOG_DIR / "quality_gates.json", {"gates": []})


def list_docs() -> list[dict[str, str]]:
    docs: list[dict[str, str]] = []
    if not DOCS_DIR.exists():
        return docs
    for path in sorted(DOCS_DIR.glob("*.md")):
        docs.append({"name": path.name, "path": str(path)})
    return docs


def list_all_docs() -> list[dict[str, str]]:
    docs: list[dict[str, str]] = []
    if not DOCS_DIR.exists():
        return docs
    for path in sorted(DOCS_DIR.rglob("*.md")):
        docs.append(
            {
                "name": path.name,
                "relative_path": str(path.relative_to(ROOT)),
                "path": str(path),
            }
        )
    return docs


def list_profiles() -> list[dict[str, Any]]:
    profiles: list[dict[str, Any]] = []
    if not PROFILES_DIR.exists():
        return profiles
    for path in sorted(PROFILES_DIR.glob("*.toml")):
        data = load_toml(path)
        data["file_name"] = path.name
        data["path"] = str(path)
        profiles.append(data)
    return profiles


def get_profile(profile_name: str) -> dict[str, Any]:
    path = PROFILES_DIR / f"{profile_name}.toml"
    return load_toml(path, {})


def load_config() -> dict[str, Any]:
    if not CONFIG_PATH.exists():
        return {}
    try:
        return load_toml(CONFIG_PATH)
    except (tomllib.TOMLDecodeError, FileNotFoundError):
        return {}


def current_plugin_states() -> dict[str, bool]:
    config = load_config()
    states: dict[str, bool] = {}
    for name, value in config.get("plugins", {}).items():
        states[name] = value.get("enabled", True)
    return states


def current_mcp_states() -> dict[str, bool]:
    config = load_config()
    states: dict[str, bool] = {}
    for name, value in config.get("mcp_servers", {}).items():
        states[name] = value.get("enabled", True)
    return states


def list_trusted_projects() -> list[dict[str, str]]:
    config = load_config()
    projects = config.get("projects", {})
    rows: list[dict[str, str]] = []
    for path, value in projects.items():
        if value.get("trust_level") == "trusted":
            rows.append(
                {
                    "path": path,
                    "name": Path(path).name,
                }
            )
    return sorted(rows, key=lambda item: item["path"].lower())


def inventory_skills() -> list[dict[str, Any]]:
    catalog = load_skill_catalog()
    items: list[dict[str, Any]] = []
    inventory_root = SKILLS_DIR if SKILLS_DIR.exists() else ROOT
    if not inventory_root.exists():
        return items
    for path in sorted(inventory_root.iterdir()):
        if not path.is_dir():
            continue
        skill_file = path / "SKILL.md"
        if not skill_file.exists():
            continue
        text = skill_file.read_text(encoding="utf-8", errors="replace")
        header_match = re.search(r"^#\s+(.+)$", text, re.M)
        desc_match = re.search(r"^description:\s*(.+)$", text, re.M)
        info = catalog.get("skills", {}).get(path.name, {})
        items.append(
            {
                "name": path.name,
                "title": header_match.group(1).strip() if header_match else path.name,
                "description": desc_match.group(1).strip() if desc_match else "",
                "category": info.get("category", "未分类"),
                "role": info.get("role", "leaf"),
                "status": info.get("status", "active"),
                "entry": info.get("entry", False),
                "task_type": info.get("task_type", ""),
                "data_access_level": info.get("data_access_level", ""),
                "quality_gate_required": info.get("quality_gate_required", []),
                "stage_scope": info.get("stage_scope", []),
                "subagent_allowed": info.get("subagent_allowed", False),
                "path": str(skill_file),
            }
        )
    return items


def skill_description_map() -> dict[str, str]:
    return {item["name"]: item["description"] for item in inventory_skills()}


def _humanize_identifier(value: str | None) -> str:
    if not value:
        return "未设置"
    return value.replace("_", " ").replace("-", " ").strip()


def humanize_route_id(route_id: str | None) -> str:
    if not route_id:
        return "未判断"
    return ROUTE_LABELS.get(route_id, _humanize_identifier(route_id))


def humanize_scope_class(scope_class: str | None) -> str:
    if not scope_class:
        return "未设置"
    return SCOPE_CLASS_LABELS.get(scope_class, _humanize_identifier(scope_class))


def humanize_data_access_level(level: str | None) -> str:
    if not level:
        return "未设置"
    return DATA_ACCESS_LABELS.get(level, _humanize_identifier(level))


def humanize_task_type(task_type: str | None) -> str:
    if not task_type:
        return "未设置"
    return TASK_TYPE_LABELS.get(task_type, _humanize_identifier(task_type))


def humanize_stage_id(stage_id: str | None) -> str:
    if not stage_id:
        return "未进入项目阶段"
    for item in load_pipeline_stages().get("stages", []):
        if item.get("id") == stage_id:
            return item.get("label", stage_id)
    return _humanize_identifier(stage_id)


def humanize_dispatch_stage(stage_id: str | None) -> str:
    if not stage_id:
        return "未设置"
    return DISPATCH_STAGE_LABELS.get(stage_id, _humanize_identifier(stage_id))


def humanize_gate_ids(gate_ids: list[str]) -> list[str]:
    gate_map = {item.get("id"): item.get("label", item.get("id", "")) for item in load_quality_gates().get("gates", [])}
    return [gate_map.get(gate_id, _humanize_identifier(gate_id)) for gate_id in gate_ids]


def humanize_stage_ids(stage_ids: list[str]) -> list[str]:
    return [humanize_stage_id(stage_id) for stage_id in stage_ids]


def humanize_profile_name(profile_name: str | None) -> str:
    if not profile_name:
        return "未设置"
    if profile_name in PROFILE_LABELS:
        return PROFILE_LABELS[profile_name]
    try:
        profile = get_profile(profile_name)
        display_name = profile.get("display_name")
        if display_name:
            return str(display_name)
    except Exception:  # noqa: BLE001
        pass
    return _humanize_identifier(profile_name)


def humanize_skill_name(skill_name: str | None) -> str:
    if not skill_name:
        return "未设置"
    return SKILL_LABELS.get(skill_name, _humanize_identifier(skill_name))


def humanize_skill_names(skill_names: list[str]) -> list[str]:
    return [humanize_skill_name(name) for name in skill_names]


def humanize_mcp_name(mcp_name: str | None) -> str:
    if not mcp_name:
        return "未设置"
    return MCP_LABELS.get(mcp_name, _humanize_identifier(mcp_name))


def humanize_mcp_names(mcp_names: list[str]) -> list[str]:
    return [humanize_mcp_name(name) for name in mcp_names]


def humanize_writing_check_name(check_name: str | None) -> str:
    if not check_name:
        return "未设置"
    return WRITING_CHECK_LABELS.get(check_name, _humanize_identifier(check_name))


def preparation_hints_for_route(route_id: str | None) -> list[str]:
    if not route_id:
        return []
    return ROUTE_PREP_HINTS.get(route_id, ["先明确任务目标", "准备可用材料", "再让工作台决定后续路线"])


def _update_enabled_line(body: str, enabled: bool) -> str:
    desired = f"enabled = {'true' if enabled else 'false'}"
    pattern = re.compile(r"(?m)^enabled\s*=\s*(true|false)\s*$")
    if pattern.search(body):
        updated = pattern.sub(desired, body, count=1)
        if not updated.endswith("\n"):
            updated += "\n"
        return updated
    body = body.rstrip() + "\n" + desired + "\n"
    return body


def _set_mcp_enabled(config_text: str, server_name: str, enabled: bool) -> str:
    section_pattern = re.compile(
        rf"(?ms)(^\[mcp_servers\.{re.escape(server_name)}\]\r?\n)(.*?)(?=^\[|\Z)"
    )
    match = section_pattern.search(config_text)
    if not match:
        raise KeyError(f"Missing MCP section: {server_name}")
    header, body = match.group(1), match.group(2)
    updated = header + _update_enabled_line(body, enabled)
    return config_text[: match.start()] + updated + config_text[match.end() :]


def profile_diff(profile_name: str) -> list[dict[str, Any]]:
    profile = get_profile(profile_name)
    current = current_mcp_states()
    managed = profile["managed_mcp"]
    enabled = set(profile["enabled_mcp"])
    diff: list[dict[str, Any]] = []
    for name in managed:
        target = name in enabled
        before = current.get(name, True)
        if before != target:
            diff.append({"name": name, "before": before, "after": target})
    return diff


def apply_profile(profile_name: str) -> dict[str, Any]:
    profile = get_profile(profile_name)
    diff = profile_diff(profile_name)
    config_text = CONFIG_PATH.read_text(encoding="utf-8")
    enabled = set(profile["enabled_mcp"])
    for name in profile["managed_mcp"]:
        config_text = _set_mcp_enabled(config_text, name, name in enabled)
    CONFIG_PATH.write_text(config_text, encoding="utf-8")
    return {
        "profile": profile_name,
        "changed": diff,
        "restart_required": True,
        "enabled_mcp": sorted(enabled),
    }


def classify_task(prompt: str) -> RoutePreview:
    data = load_routing_table()
    normalized = prompt.lower()
    best: dict[str, Any] | None = None
    best_score = -1
    scores: list[tuple[dict[str, Any], int]] = []

    for route in data.get("routes", []):
        score = 0
        for keyword in route.get("keywords", []):
            if keyword.lower() in normalized:
                score += 2
        for alias in route.get("aliases", []):
            if alias.lower() in normalized:
                score += 1
        if route.get("always_default"):
            score = max(score, 0)
        scores.append((route, score))
        if score > best_score:
            best = route
            best_score = score

    if best is None:
        return RoutePreview(
            task_class="general-research",
            project_scope_class="conditional_multi_agent",
            task_type="general_research",
            data_access_level="public_open",
            quality_gate_required=[],
            stage_scope=[],
            subagent_allowed=False,
            profile="baseline",
            skills=["research-autopilot"],
            helper_skills=[],
            project_helper_skills=[],
            plugins=["Research Autopilot"],
            mcp=[],
            excluded=[],
            rationale="当前本地路由表未命中具体路线，先按通用研究任务处理。",
            next_step="先补一条更具体的任务描述，再决定是否进入项目协作。",
            score=0,
        )
    if best_score <= 0:
        for route in data["routes"]:
            if route.get("always_default"):
                best = route
                best_score = 0
                break

    excluded: list[dict[str, str]] = []
    for route, score in sorted(scores, key=lambda item: item[1], reverse=True):
        if route["id"] == best["id"]:
            continue
        if len(excluded) >= 3:
            break
        reason = route.get("not_selected_reason", "与当前任务信号不够匹配。")
        if score > 0:
            reason = f"虽然命中部分关键词，但优先级低于 `{best['id']}`。"
        excluded.append({"route": route["id"], "reason": reason})

    return RoutePreview(
        task_class=best["id"],
        project_scope_class=best.get("project_scope_class", "never_default_multi_agent"),
        task_type=best.get("task_type", ""),
        data_access_level=best.get("data_access_level", ""),
        quality_gate_required=best.get("quality_gate_required", []),
        stage_scope=best.get("stage_scope", []),
        subagent_allowed=best.get("subagent_allowed", False),
        profile=best["profile"],
        skills=best["skills"],
        helper_skills=best.get("helper_skills", []),
        project_helper_skills=best.get("project_helper_skills", []),
        plugins=best.get("plugins", []),
        mcp=best.get("mcp", []),
        excluded=excluded,
        rationale=best["rationale"],
        next_step=best["next_step"],
        score=best_score,
    )


def infer_social_backend_decision(prompt: str) -> dict[str, Any]:
    normalized = prompt.lower()
    complexity = any(keyword.lower() in normalized for keyword in SOCIAL_COMPLEXITY_KEYWORDS)
    direct_agent_debug = any(keyword.lower() in normalized for keyword in SOCIAL_AUTOMATION_DEBUG_KEYWORDS)
    simple_xhs = ("小红书" in prompt or "xiaohongshu" in normalized) and any(
        keyword.lower() in normalized for keyword in SOCIAL_SIMPLE_XHS_KEYWORDS
    )

    selected = ["chrome-devtools"]
    selected_reason = {
        "chrome-devtools": "社媒任务默认先读浏览器登录态下的真实可见内容，因此浏览器精读链保持第一入口。"
    }
    rejected: list[dict[str, str]] = []

    if complexity:
        selected.append("social-platform-mcp")
        selected_reason["social-platform-mcp"] = (
            "任务包含重复点击、批量抓取、滚动懒加载、证据留档或可复用采集流程，适合走标准化社媒 capture facade。"
        )
    else:
        rejected.append(
            {
                "component": "social-platform-mcp",
                "reason": "当前更像一次性浏览器可见读取，不需要先升级成标准化批量抓取接口。",
            }
        )

    if simple_xhs and not complexity:
        selected.append("xiaohongshu-mcp")
        selected_reason["xiaohongshu-mcp"] = "当前请求更像小红书公开结构化元数据补充，可作为平台专用次级后端启用。"
    else:
        rejected.append(
            {
                "component": "xiaohongshu-mcp",
                "reason": "它只适合小红书平台专用补充，不适合承担跨平台总入口；当前优先级低于浏览器证据链或通用 facade。",
            }
        )

    if direct_agent_debug:
        selected.append("agent-browser")
        selected_reason["agent-browser"] = "任务包含模板开发、调试或非标准交互，保留 direct agent-browser 直连更合适。"
    elif complexity:
        rejected.append(
            {
                "component": "agent-browser",
                "reason": "当前所需的自动化抓取已经由 social-platform-mcp 封装，不必把 agent-browser 直连作为第一入口。",
            }
        )
    else:
        rejected.append(
            {
                "component": "agent-browser",
                "reason": "当前不是调试型或高复杂度自动化页面，不需要直接启用 agent-browser。",
            }
        )

    return {
        "selected": selected,
        "selected_reason": selected_reason,
        "rejected": rejected,
    }


def render_explanation_card(prompt: str) -> str:
    preview = classify_task(prompt)
    skill_notes = skill_description_map()
    rules = global_route_rules()

    selected_plugins = ", ".join(normalize_plugin_name(name) for name in preview.plugins) if preview.plugins else "无"
    selected_helpers = ", ".join(humanize_skill_names(preview.helper_skills)) if preview.helper_skills else "无"
    selected_project_helpers = ", ".join(humanize_skill_names(preview.project_helper_skills)) if preview.project_helper_skills else "无"
    selected_skills = ", ".join(humanize_skill_names(preview.skills)) if preview.skills else "无"
    selected_mcp = ", ".join(humanize_mcp_names(preview.mcp)) if preview.mcp else "无"

    lines = [
        "# 研究自动路由说明卡",
        "",
        "## 全局学术约束",
        f"- 角色定位：{rules['role']}",
        f"- 交互语言：{rules['language']}",
        f"- 实时核验：{'是' if rules.get('require_realtime_verification') else '否'}",
        f"- 正式引文必须含 DOI：{'是' if rules.get('formal_citation_requires_doi') else '否'}",
        f"- 禁止未核验或幻觉引文：{'是' if rules.get('forbid_unverified_references') else '否'} / {'是' if rules.get('forbid_ai_hallucinated_citations') else '否'}",
        f"- 数据分析段落框架：{rules.get('data_paragraph_framework', 'PEEL')}",
        "",
        "## 本次选路",
        f"- 任务归类：`{humanize_route_id(preview.task_class)}`",
        f"- 研究范围：`{humanize_scope_class(preview.project_scope_class)}`",
        f"- 任务方式：`{humanize_task_type(preview.task_type)}`",
        f"- 资料权限：`{humanize_data_access_level(preview.data_access_level)}`",
        f"- 关键检查：`{', '.join(humanize_gate_ids(preview.quality_gate_required)) if preview.quality_gate_required else '无'}`",
        f"- 覆盖阶段：`{', '.join(humanize_stage_ids(preview.stage_scope)) if preview.stage_scope else '无'}`",
        f"- 是否需要协作：`{'是' if preview.subagent_allowed else '否'}`",
        f"- 建议方案：`{humanize_profile_name(preview.profile)}`",
        f"- 主要能力：`{selected_skills}`",
        f"- 辅助能力：`{selected_helpers}`",
        f"- 协作支持：`{selected_project_helpers}`",
        f"- 外部连接：`{selected_mcp}`",
        f"- 扩展工具：`{selected_plugins}`",
        f"- 选择理由：{preview.rationale}",
        "- 每个组件在本次任务里的作用：",
    ]
    for skill in preview.skills:
        lines.append(
            f"  - `{humanize_skill_name(skill)}`：{SKILL_NOTES.get(skill, skill_notes.get(skill, '承担该路线中的核心任务。'))}"
        )
    for skill in preview.helper_skills:
        lines.append(
            f"  - `{humanize_skill_name(skill)}`：{SKILL_NOTES.get(skill, skill_notes.get(skill, '作为辅助决策或辅助执行组件使用。'))}"
        )
    for skill in preview.project_helper_skills:
        lines.append(
            f"  - `{humanize_skill_name(skill)}`：{SKILL_NOTES.get(skill, skill_notes.get(skill, '作为项目型协作编排与分工落盘组件使用。'))}"
        )
    for mcp in preview.mcp:
        lines.append(f"  - `{humanize_mcp_name(mcp)}`：{MCP_NOTES.get(mcp, '提供当前路线需要的外部上下文或检索入口。')}")
    for plugin in preview.plugins:
        lines.append(f"  - `{plugin}`：{PLUGIN_NOTES.get(plugin, '作为该路线的增强层使用。')}")

    lines.append("- 被排除的候选及原因：")
    for item in preview.excluded:
        lines.append(f"  - `{humanize_route_id(item['route'])}`：{item['reason']}")

    lines.extend(
        [
            f"- 下一步将执行什么：{preview.next_step}",
            "",
            "> 如果当前激活的外部连接状态与所选方案不一致，应用所选方案后需要重启 Codex 才会完全生效。",
        ]
    )

    if preview.task_class == "social-platform-case":
        decision = infer_social_backend_decision(prompt)
        lines.extend(
            [
                "",
                "## 社媒读取方式判断",
                f"- 当前选中的方式：`{', '.join(humanize_mcp_name(name) if name.endswith('-mcp') or name == 'chrome-devtools' else name for name in decision['selected'])}`",
            ]
        )
        for component in decision["selected"]:
            display = humanize_mcp_name(component) if component.endswith("-mcp") or component == "chrome-devtools" else component
            lines.append(f"- `{display}` 入选理由：{decision['selected_reason'][component]}")
        for item in decision["rejected"]:
            display = humanize_mcp_name(item["component"]) if item["component"].endswith("-mcp") or item["component"] == "chrome-devtools" else item["component"]
            lines.append(f"- `{display}` 未作为优先方式的原因：{item['reason']}")

    return "\n".join(lines)


def summarize_environment() -> dict[str, Any]:
    states = current_mcp_states()
    active = sorted(name for name, enabled in states.items() if enabled)
    disabled = sorted(name for name, enabled in states.items() if not enabled)
    plugin_states = current_plugin_states()
    skills = inventory_skills()
    settings = load_settings()
    source_status = environment_source_status()
    return {
        "root": str(ROOT),
        "app_root": str(APP_ROOT),
        "env_skills_root": str(ENV_SKILLS_ROOT),
        "snapshot_root": str(SNAPSHOT_ROOT),
        "environment_source_mode": source_status["mode"],
        "environment_source_label": source_status["label"],
        "environment_source_detail": source_status["detail"],
        "config_path": str(CONFIG_PATH),
        "skills_dir": str(SKILLS_DIR),
        "plugin_dir": str(PLUGIN_DIR),
        "cloud_dir": str(CLOUD_DIR),
        "obsidian_vault": settings.get("obsidian", {}).get("vault_path", ""),
        "active_mcp": active,
        "disabled_mcp": disabled,
        "active_plugins": sorted(name for name, enabled in plugin_states.items() if enabled),
        "skill_count": len(skills),
        "entry_skills": [item["name"] for item in skills if item["entry"]],
        "global_rules": global_route_rules(),
    }


def _progress_from_checks(checks: list[bool]) -> int:
    if not checks:
        return 0
    return int(round(sum(1 for item in checks if item) / len(checks) * 100))


def collect_dashboard_metrics() -> dict[str, Any]:
    skills = inventory_skills()
    routing = load_routing_table()
    plugin_states = current_plugin_states()
    mcp_states = current_mcp_states()
    docs = list_all_docs()
    profiles = list_profiles()
    trusted_projects = list_trusted_projects()
    gates = load_quality_gates()

    return {
        "skill_count": len(skills),
        "active_skill_count": len([item for item in skills if item["status"] == "active"]),
        "route_count": len(routing.get("routes", [])),
        "profile_count": len(profiles),
        "active_mcp_count": len([name for name, enabled in mcp_states.items() if enabled]),
        "active_plugin_count": len([name for name, enabled in plugin_states.items() if enabled]),
        "trusted_project_count": len(trusted_projects),
        "doc_count": len(docs),
        "gate_count": len(gates.get("gates", [])),
    }


def manager_readiness_snapshot() -> list[dict[str, Any]]:
    mcp_states = current_mcp_states()

    routing_checks = [
        (CATALOG_DIR / "routing_table.json").exists(),
        (CATALOG_DIR / "conflict_matrix.json").exists(),
        (CATALOG_DIR / "skill_catalog.json").exists(),
        (CATALOG_DIR / "project_scope_rules.json").exists(),
        (CATALOG_DIR / "research_team_playbooks.json").exists(),
    ]
    contract_checks = [
        (CATALOG_DIR / "agent_execution_modes.json").exists(),
        (CATALOG_DIR / "subagent_registry.json").exists(),
        (SCHEMAS_DIR / "agent_dispatch_card.schema.json").exists(),
        (SCHEMAS_DIR / "project_agent_definition.schema.json").exists(),
        (ROOT / "scripts" / "validate_agents_contract.py").exists(),
    ]
    gate_checks = [
        (CATALOG_DIR / "research_pipeline_stages.json").exists(),
        (CATALOG_DIR / "quality_gates.json").exists(),
        (CATALOG_DIR / "data_access_matrix.json").exists(),
        (CATALOG_DIR / "writing_quality_rules.json").exists(),
        (ROOT / "scripts" / "validate_research_pipeline.py").exists(),
    ]
    evidence_checks = [
        mcp_states.get("chrome-devtools", False),
        mcp_states.get("social-platform-mcp", False),
        (DOCS_DIR / "30-integrations" / "agent-browser-接入与使用说明.md").exists(),
        any(item["name"] == "social-platform-reader" for item in inventory_skills()),
    ]
    knowledge_checks = [
        mcp_states.get("zotero-mcp", False),
        mcp_states.get("openalex-mcp", False),
        (DOCS_DIR / "30-integrations" / "Codex-Zotero-Obsidian-联动工作流.md").exists(),
        any(item["name"] == "obsidian-research-sync" for item in inventory_skills()),
    ]
    runtime_checks = [
        VENV_PYTHON.exists(),
        shutil.which("git") is not None,
        shutil.which("node") is not None,
        bool(HOST_SHELL),
        CONFIG_PATH.exists(),
    ]

    return [
        {
            "id": "routing",
            "label": "任务分流",
            "subtitle": "研究任务的自动判断与分派",
            "progress": _progress_from_checks(routing_checks),
            "detail": "已具备任务分流规则、冲突约束和项目编排模板。",
        },
        {
            "id": "orchestration",
            "label": "协作编排",
            "subtitle": "项目型任务的协作与复核",
            "progress": _progress_from_checks(contract_checks),
            "detail": "已具备任务分派、协作角色约束和复核映射。",
        },
        {
            "id": "gates",
            "label": "质量检查",
            "subtitle": "阶段检查与写作检查",
            "progress": _progress_from_checks(gate_checks),
            "detail": "已具备阶段检查、写作检查和推进约束。",
        },
        {
            "id": "evidence",
            "label": "证据采集",
            "subtitle": "社媒与网页证据入口",
            "progress": _progress_from_checks(evidence_checks),
            "detail": "默认优先读取浏览器真实可见内容，再接入标准化采集入口。",
        },
        {
            "id": "knowledge",
            "label": "知识同步",
            "subtitle": "Zotero 与 Obsidian",
            "progress": _progress_from_checks(knowledge_checks),
            "detail": "正式文献链与知识沉淀链已分层，不混在一个工具里。",
        },
        {
            "id": "runtime",
            "label": "本机运行环境",
            "subtitle": "Python、Git、Node 与配置文件",
            "progress": _progress_from_checks(runtime_checks),
            "detail": "这套环境默认本地优先，日常执行依赖主 .venv 和本机工具链。",
        },
    ]


def list_recent_reports() -> list[dict[str, str]]:
    reports_dir = OUTPUTS_DIR / "reports"
    rows: list[dict[str, str]] = []
    if not reports_dir.exists():
        return rows
    for path in sorted(reports_dir.glob("*.md"), key=lambda item: item.stat().st_mtime, reverse=True):
        rows.append({"name": path.name, "path": str(path)})
    return rows


def latest_report_path() -> str:
    reports = list_recent_reports()
    return reports[0]["path"] if reports else ""


def normalize_plugin_name(raw_name: str) -> str:
    mapping = {
        "github@openai-curated": "GitHub",
        "google-drive@openai-curated": "Google Drive",
        "hugging-face@openai-curated": "Hugging Face",
        "research-autopilot@research-environment-local": "自动研究助手",
        "scite@openai-curated": "Scite",
        "superpowers@openai-curated": "Superpowers",
    }
    return mapping.get(raw_name, raw_name)


def platform_family() -> str:
    if _is_windows():
        return "windows"
    if _is_macos():
        return "macos"
    return HOST_PLATFORM


def host_platform() -> str:
    return HOST_PLATFORM


def _codex_app_candidates() -> list[dict[str, Any]]:
    if _is_windows():
        candidates = [
            Path.home() / "AppData" / "Local" / "Programs" / "Codex" / "Codex.exe",
            Path.home() / "AppData" / "Local" / "Microsoft" / "WindowsApps" / "codex.exe",
        ]
    elif _is_macos():
        candidates = [
            Path("/Applications/Codex.app"),
            Path.home() / "Applications" / "Codex.app",
            Path("/Applications/OpenAI Codex.app"),
            Path.home() / "Applications" / "OpenAI Codex.app",
        ]
    else:
        candidates = []
    rows: list[dict[str, str]] = []
    for path in candidates:
        if path.exists():
            rows.append(
                {
                    "id": f"codex-{path.name.lower()}",
                    "label": "Codex App",
                    "path": str(path),
                    "launchable": True,
                }
            )
    if not rows and CONFIG_PATH.exists():
        rows.append(
            {
                "id": "codex-config",
                "label": "Codex App",
                "path": str(CONFIG_PATH),
                "launchable": False,
            }
        )
    return rows


def _extract_windows_exe_path(raw: str | None) -> str:
    if not raw:
        return ""
    value = raw.strip()
    if value.startswith('"'):
        match = re.match(r'"([^"]+\.exe)"', value, flags=re.IGNORECASE)
        return match.group(1) if match else ""
    match = re.match(r"(.+?\.exe)", value, flags=re.IGNORECASE)
    return match.group(1).rstrip(", ") if match else ""


def _windows_registered_research_apps() -> list[dict[str, Any]]:
    if not _is_windows() or winreg is None:
        return []

    targets = {
        "zotero": ("Zotero", "zotero.exe"),
        "obsidian": ("Obsidian", "Obsidian.exe"),
    }
    roots = [
        (winreg.HKEY_LOCAL_MACHINE, r"Software\Microsoft\Windows\CurrentVersion\Uninstall"),
        (winreg.HKEY_LOCAL_MACHINE, r"Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"),
        (winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Uninstall"),
    ]
    rows: list[dict[str, Any]] = []
    seen_paths: set[str] = set()

    def query_string(key, name: str) -> str:
        try:
            value, _ = winreg.QueryValueEx(key, name)
        except OSError:
            return ""
        return str(value).strip()

    for root, subkey in roots:
        try:
            parent = winreg.OpenKey(root, subkey)
        except OSError:
            continue
        with parent:
            for index in range(winreg.QueryInfoKey(parent)[0]):
                try:
                    child_name = winreg.EnumKey(parent, index)
                    child = winreg.OpenKey(parent, child_name)
                except OSError:
                    continue
                with child:
                    display_name = query_string(child, "DisplayName")
                    normalized = display_name.lower()
                    for target_key, (label, exe_name) in targets.items():
                        if target_key not in normalized:
                            continue
                        install_location = query_string(child, "InstallLocation")
                        display_icon = query_string(child, "DisplayIcon")
                        candidates: list[Path] = []
                        if install_location:
                            candidates.append(Path(install_location) / exe_name)
                        icon_path = _extract_windows_exe_path(display_icon)
                        if icon_path:
                            candidates.append(Path(icon_path))
                        for candidate in candidates:
                            normalized_path = str(candidate)
                            if normalized_path in seen_paths:
                                continue
                            rows.append(
                                {
                                    "id": f"{target_key}-registry",
                                    "label": label,
                                    "path": normalized_path,
                                    "launchable": True,
                                }
                            )
                            seen_paths.add(normalized_path)
    return rows


def list_platform_apps() -> list[dict[str, Any]]:
    if _is_windows():
        candidates = [
            *_codex_app_candidates(),
            *_windows_registered_research_apps(),
            {"id": "zotero-custom-root", "label": "Zotero", "path": r"C:\zotero\zotero.exe"},
            {"id": "zotero", "label": "Zotero", "path": r"C:\Program Files\Zotero\zotero.exe"},
            {"id": "zotero-x86", "label": "Zotero", "path": r"C:\Program Files (x86)\Zotero\zotero.exe"},
            {
                "id": "zotero-user",
                "label": "Zotero",
                "path": str(Path.home() / "AppData" / "Local" / "Programs" / "Zotero" / "zotero.exe"),
            },
            {"id": "obsidian-system", "label": "Obsidian", "path": r"C:\Program Files\Obsidian\Obsidian.exe"},
            {"id": "obsidian-x86", "label": "Obsidian", "path": r"C:\Program Files (x86)\Obsidian\Obsidian.exe"},
            {
                "id": "obsidian",
                "label": "Obsidian",
                "path": str(Path.home() / "AppData" / "Local" / "Programs" / "Obsidian" / "Obsidian.exe"),
            },
        ]
    elif _is_macos():
        candidates = [
            *_codex_app_candidates(),
            {"id": "zotero", "label": "Zotero", "path": "/Applications/Zotero.app"},
            {"id": "zotero-user", "label": "Zotero", "path": str(Path.home() / "Applications" / "Zotero.app")},
            {"id": "obsidian", "label": "Obsidian", "path": "/Applications/Obsidian.app"},
            {
                "id": "obsidian-user",
                "label": "Obsidian",
                "path": str(Path.home() / "Applications" / "Obsidian.app"),
            },
        ]
    else:
        candidates = [*_codex_app_candidates()]

    rows: list[dict[str, Any]] = []
    seen_labels: set[str] = set()
    for item in candidates:
        item_path = Path(item["path"])
        if item_path.exists() and item["label"] not in seen_labels:
            launchable = item.get("launchable", True)
            rows.append(
                {
                    "id": item["id"],
                    "label": item["label"],
                    "path": str(item_path),
                    "launchable": bool(launchable) if not isinstance(launchable, str) else launchable.lower() == "true",
                }
            )
            seen_labels.add(item["label"])
    return rows


def known_desktop_apps() -> list[dict[str, Any]]:
    return list_platform_apps()


def open_platform_app(label: str) -> bool:
    for item in list_platform_apps():
        if item["label"] != label:
            continue
        if not item.get("launchable", True):
            return False
        path = Path(item["path"])
        if _is_windows():
            os.startfile(str(path))
            return True
        if _is_macos():
            if path.suffix == ".app":
                subprocess.run(["open", str(path)], check=False)
            else:
                subprocess.run(["open", str(path)], check=False)
            return True
        return False
    return False


def open_desktop_app(label: str) -> bool:
    return open_platform_app(label)


def load_project_snapshot(project_root: str | Path) -> dict[str, Any]:
    base = Path(project_root)
    current_state = base / "logs" / "project-state" / "current.json"
    pipeline_state = base / "logs" / "quality-gates" / "pipeline-status.json"
    writing_quality = base / "logs" / "quality-gates" / "writing-quality-report.json"

    return {
        "project_root": str(base),
        "exists": base.exists(),
        "current_state": load_json(current_state) if current_state.exists() else {},
        "pipeline_state": load_json(pipeline_state) if pipeline_state.exists() else {},
        "writing_quality": load_json(writing_quality) if writing_quality.exists() else {},
    }


def _load_jsonl(path: Path, limit: int = 40) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    if not path.exists() or not path.is_file():
        return rows
    for index, line in enumerate(path.read_text(encoding="utf-8", errors="replace").splitlines()):
        if len(rows) >= limit:
            break
        line = line.strip()
        if not line:
            continue
        try:
            payload = json.loads(line)
            if isinstance(payload, dict):
                rows.append(payload)
            else:
                rows.append({"message": str(payload), "source_line": index + 1})
        except json.JSONDecodeError:
            rows.append({"message": line, "source_line": index + 1, "parse_error": True})
    return rows


def _safe_file_mtime(path: Path) -> float:
    try:
        return path.stat().st_mtime
    except OSError:
        return 0


def _summarize_gate_payload(path: Path, payload: dict[str, Any]) -> dict[str, Any]:
    decision = (
        payload.get("decision")
        or payload.get("status")
        or payload.get("gate_decision")
        or ("pass" if payload.get("allowed_to_advance") else "pending")
    )
    gate_name = payload.get("gate_name") or payload.get("name") or path.stem
    issues = payload.get("blocking_issues") or payload.get("required_actions") or []
    if isinstance(issues, dict):
        issue_count = len(issues)
    elif isinstance(issues, list):
        issue_count = len(issues)
    else:
        issue_count = 1 if issues else 0
    return {
        "name": str(gate_name),
        "path": str(path),
        "relative_path": str(path.name),
        "decision": str(decision),
        "issue_count": issue_count,
        "updated_at": _safe_file_mtime(path),
    }


def project_handoff_inbox(project_root: str | Path, limit: int = 20) -> list[dict[str, Any]]:
    base = Path(project_root) if project_root else Path()
    rows = _load_jsonl(base / "logs" / "project-state" / "handoff-inbox.jsonl", limit=limit)
    normalized: list[dict[str, Any]] = []
    for index, row in enumerate(rows):
        normalized.append(
            {
                "id": str(row.get("id") or row.get("handoff_id") or f"handoff-{index + 1}"),
                "title": str(row.get("title") or row.get("summary") or row.get("message") or "Codex 待确认事项"),
                "detail": str(row.get("detail") or row.get("body") or row.get("reason") or row.get("next_action") or ""),
                "status": str(row.get("status") or row.get("decision") or "pending"),
                "owner": str(row.get("owner") or row.get("agent") or row.get("owner_agent_id") or "Codex"),
                "artifact_path": str(row.get("artifact_path") or row.get("path") or ""),
                "created_at": str(row.get("created_at") or row.get("updated_at") or ""),
            }
        )
    return normalized


def project_activity(project_root: str | Path, limit: int = 30) -> list[dict[str, Any]]:
    base = Path(project_root) if project_root else Path()
    rows = _load_jsonl(base / "logs" / "project-state" / "activity.jsonl", limit=limit)
    normalized: list[dict[str, Any]] = []
    for index, row in enumerate(rows):
        normalized.append(
            {
                "id": str(row.get("id") or f"activity-{index + 1}"),
                "label": str(row.get("label") or row.get("title") or row.get("event") or row.get("message") or "项目活动"),
                "status": str(row.get("status") or row.get("state") or "已记录"),
                "title": str(row.get("title") or row.get("event") or row.get("message") or "项目活动"),
                "detail": str(row.get("detail") or row.get("body") or row.get("path") or ""),
                "kind": str(row.get("kind") or row.get("type") or "activity"),
                "actor": str(row.get("actor") or row.get("agent") or row.get("owner") or "Codex"),
                "created_at": str(row.get("created_at") or row.get("updated_at") or ""),
                "evidence_level": str(row.get("evidence_level") or "file_read"),
                "evidence_source": str(row.get("evidence_source") or "codex_log"),
            }
        )
    return normalized


def project_quality_gate_reports(project_root: str | Path, limit: int = 30) -> list[dict[str, Any]]:
    base = Path(project_root) if project_root else Path()
    gate_dir = base / "logs" / "quality-gates"
    if not gate_dir.exists():
        return []
    rows: list[dict[str, Any]] = []
    for path in sorted(gate_dir.glob("*.json"), key=_safe_file_mtime, reverse=True):
        if len(rows) >= limit:
            break
        payload = load_json(path, {})
        if isinstance(payload, dict):
            rows.append(_summarize_gate_payload(path, payload))
    return rows


def project_method_passports(project_root: str | Path, limit: int = 30) -> list[dict[str, Any]]:
    base = Path(project_root) if project_root else Path()
    files = _collect_project_files(
        base,
        ["analysis/method-passports", "method-passports", "analysis/methods"],
        (".yaml", ".yml", ".json", ".md"),
        limit=limit,
    )
    return files


def project_key_artifacts(project_root: str | Path) -> list[dict[str, Any]]:
    base = Path(project_root) if project_root else Path()
    label_map = {
        "research-map.md": "研究地图",
        "findings-memory.md": "发现记录",
        "material-passport.yaml": "材料台账",
        "evidence-ledger.yaml": "证据台账",
        "current.json": "项目状态",
        "activity.jsonl": "最近活动",
        "handoff-inbox.jsonl": "待确认事项",
        "pipeline-status.json": "阶段检查",
        "writing-quality-report.json": "写作质量",
    }
    artifact_names = [
        "research-map.md",
        "findings-memory.md",
        "material-passport.yaml",
        "evidence-ledger.yaml",
        "logs/project-state/current.json",
        "logs/project-state/activity.jsonl",
        "logs/project-state/handoff-inbox.jsonl",
        "logs/quality-gates/pipeline-status.json",
        "logs/quality-gates/writing-quality-report.json",
    ]
    rows: list[dict[str, Any]] = []
    for name in artifact_names:
        path = base / name
        rows.append(
            {
                "name": name,
                "label": label_map.get(Path(name).name, Path(name).name),
                "path": str(path),
                "exists": path.exists(),
                "line_count": _safe_text_line_count(path),
                "updated_at": _safe_file_mtime(path),
            }
        )
    return rows


def project_dashboard_overview(project_root: str | Path) -> dict[str, Any]:
    base = Path(project_root) if project_root else Path()
    snapshot = load_project_snapshot(base) if project_root else {}
    current = snapshot.get("current_state", {}) if isinstance(snapshot, dict) else {}
    pipeline = snapshot.get("pipeline_state", {}) if isinstance(snapshot, dict) else {}
    writing = snapshot.get("writing_quality", {}) if isinstance(snapshot, dict) else {}
    blockers = current.get("blockers", []) if isinstance(current, dict) else []
    next_quality_gates = current.get("next_quality_gates", []) if isinstance(current, dict) else []
    milestones = current.get("milestones", []) if isinstance(current, dict) else []
    next_milestone = ""
    if isinstance(milestones, list):
        for item in milestones:
            if isinstance(item, dict) and item.get("status") != "complete":
                next_milestone = str(item.get("label") or item.get("id") or "")
                break
    next_action = next_milestone or ("先处理 " + "、".join(next_quality_gates[:2]) if next_quality_gates else "在 Codex 中继续推进当前项目")
    gate_reports = project_quality_gate_reports(base)
    handoffs = project_handoff_inbox(base)
    activity = project_activity(base)
    return {
        "project_root": str(base) if project_root else "",
        "project_exists": bool(project_root) and base.exists(),
        "project_name": base.name if project_root else "未选择项目",
        "current_stage": current.get("pipeline_stage") or pipeline.get("current_stage") or "",
        "status": current.get("status") or "unknown",
        "owner": current.get("current_owner_display_name") or current.get("current_owner_agent_id") or "Codex",
        "blockers": blockers if isinstance(blockers, list) else [],
        "next_action": next_action,
        "next_quality_gates": next_quality_gates if isinstance(next_quality_gates, list) else [],
        "handoffs": handoffs,
        "activity": activity,
        "gate_reports": gate_reports,
        "key_artifacts": project_key_artifacts(base),
        "method_passports": project_method_passports(base),
        "writing_status": writing.get("status", "missing") if isinstance(writing, dict) and writing else "missing",
    }


def _safe_text_line_count(path: Path) -> int:
    if not path.exists() or not path.is_file():
        return 0
    return len(path.read_text(encoding="utf-8", errors="replace").splitlines())


def _count_yaml_list_entries(path: Path) -> int:
    if not path.exists() or not path.is_file():
        return 0
    count = 0
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        if re.match(r"^\s*-\s+\S+", line):
            count += 1
    return count


def _read_text_status(path: Path) -> tuple[bool, bool, str]:
    if not path.exists() or not path.is_file():
        return False, False, ""
    try:
        return True, True, path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return True, False, ""


def _has_yaml_key(text: str, keys: list[str]) -> bool:
    if not text.strip():
        return False
    escaped = "|".join(re.escape(key) for key in keys)
    return bool(re.search(rf"(?im)^\s*(?:{escaped})\s*:", text))


def _status_row(label: str, status: str, tone: str, detail: str = "") -> dict[str, str]:
    return {"label": label, "status": status, "tone": tone, "detail": detail}


def _source_ledger_health(base: Path) -> list[dict[str, str]]:
    material_path = base / "material-passport.yaml"
    evidence_path = base / "evidence-ledger.yaml"
    material_exists, material_readable, material_text = _read_text_status(material_path)
    evidence_exists, evidence_readable, evidence_text = _read_text_status(evidence_path)
    both_exist = material_exists and evidence_exists
    both_readable = material_readable and evidence_readable
    key_fields = (
        _has_yaml_key(material_text, ["materials", "project", "project_name", "truth_sources", "ethics", "access_level"])
        and _has_yaml_key(evidence_text, ["entries", "evidence", "claims", "sources"])
    )
    traceable = _has_yaml_key(
        f"{material_text}\n{evidence_text}",
        ["source", "sources", "url", "link", "doi", "path", "file", "origin", "evidence_ref", "locator"],
    )
    return [
        _status_row(
            "台账文件",
            "存在" if both_exist else "缺失",
            "green" if both_exist else "amber",
            "需要 material-passport.yaml 与 evidence-ledger.yaml 同时存在。",
        ),
        _status_row(
            "schema 可读",
            "可读" if both_readable else "未写入" if not both_exist else "不可读",
            "green" if both_readable else "amber" if not both_exist else "rose",
            "当前只做本地文本读取与字段扫描，不做联网真实性核验。",
        ),
        _status_row(
            "关键字段",
            "完整" if key_fields else "待补齐",
            "green" if key_fields else "amber",
            "至少应包含材料/证据条目、项目边界或来源字段。",
        ),
        _status_row(
            "来源可追溯",
            "可追溯" if traceable else "未验证",
            "green" if traceable else "amber",
            "需要出现 source/url/doi/path 等可回链字段。",
        ),
    ]


def _any_existing(base: Path, relative_paths: list[str]) -> bool:
    return any((base / item).exists() for item in relative_paths)


def _reproducibility_status(base: Path, outputs: list[dict[str, Any]]) -> list[dict[str, str]]:
    env_lock = _any_existing(
        base,
        [
            "requirements.txt",
            "environment.yml",
            "environment.yaml",
            "pyproject.toml",
            "uv.lock",
            "poetry.lock",
            "conda-lock.yml",
            "package-lock.json",
        ],
    )
    run_record = _any_existing(
        base,
        [
            "run-manifest.json",
            "reproducibility-manifest.yaml",
            "logs/runs",
            "logs/analysis",
            "logs/project-state/activity.jsonl",
        ],
    )
    bundle = _any_existing(
        base,
        [
            "reproducibility",
            "reproducibility-package",
            "outputs/reproducibility",
            "outputs/reproducibility-bundle",
            "reproducibility-manifest.yaml",
        ],
    )
    return [
        _status_row("环境锁文件", "已发现" if env_lock else "未发现", "green" if env_lock else "amber"),
        _status_row("最近运行记录", "已落盘" if run_record else "尚未运行", "green" if run_record else "amber"),
        _status_row("输出新鲜度", "已发现输出" if outputs else "未落盘", "blue" if outputs else "amber"),
        _status_row("复现包", "已发现" if bundle else "未生成", "green" if bundle else "amber"),
    ]


def _citation_chain_status(base: Path, reference_files: list[dict[str, Any]], reports: list[dict[str, Any]], flags: dict[str, bool]) -> list[dict[str, str]]:
    quality_report = _any_existing(
        base,
        [
            "writing-quality-report.json",
            "logs/quality-gates/writing-quality-report.json",
            "reports/writing-quality-report.json",
        ],
    ) or any("writing-quality" in item.get("name", "").lower() for item in reports)
    sync_receipt = _any_existing(
        base,
        [
            "logs/zotero-sync.json",
            "logs/obsidian-sync.json",
            "logs/writing-reference-capture-report.json",
            "outputs/reports/writing-reference-capture-report.json",
            "zotero-sync-report.json",
        ],
    )
    return [
        _status_row("引用文件", "已发现" if reference_files else "未写入", "green" if reference_files else "amber"),
        _status_row("写作质量报告", "已发现" if quality_report else "未写入", "green" if quality_report else "amber"),
        _status_row("Zotero 桌面端", "可打开" if flags["zotero_detected"] else "待安装", "green" if flags["zotero_detected"] else "amber"),
        _status_row("Zotero MCP", "已启用" if flags["zotero_mcp_active"] else "未启用", "green" if flags["zotero_mcp_active"] else "amber"),
        _status_row("Obsidian", "可打开" if flags["obsidian_detected"] else "待安装", "green" if flags["obsidian_detected"] else "amber"),
        _status_row("端到端同步凭据", "最近成功" if sync_receipt else "未验证", "green" if sync_receipt else "amber"),
    ]


def _collect_project_files(base: Path, roots: list[str], suffixes: tuple[str, ...], limit: int = 80) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    seen: set[Path] = set()
    if not base.exists():
        return rows
    for root_name in roots:
        root = base / root_name
        if not root.exists():
            continue
        candidates = [root] if root.is_file() else root.rglob("*")
        for path in candidates:
            if len(rows) >= limit:
                return rows
            if not path.is_file() or path in seen:
                continue
            if path.suffix.lower() not in suffixes:
                continue
            seen.add(path)
            try:
                size = path.stat().st_size
                mtime = path.stat().st_mtime
            except OSError:
                size = 0
                mtime = 0
            rows.append(
                {
                    "name": path.name,
                    "path": str(path),
                    "relative_path": str(path.relative_to(base)) if path.is_relative_to(base) else str(path),
                    "size": size,
                    "updated_at": mtime,
                }
            )
    return rows


def _project_file_status(base: Path, names: list[str]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for name in names:
        path = base / name
        rows.append(
            {
                "name": name,
                "path": str(path),
                "exists": path.exists(),
                "line_count": _safe_text_line_count(path),
            }
        )
    return rows


def _integration_detection_flags() -> dict[str, bool]:
    capabilities = integrations_overview().get("capabilities", [])
    capability_map = {item["label"]: item for item in capabilities if isinstance(item, dict)}
    active_mcp = summarize_environment().get("active_mcp", [])
    return {
        "zotero_detected": bool(capability_map.get("Zotero", {}).get("detected")),
        "obsidian_detected": bool(capability_map.get("Obsidian", {}).get("detected")),
        "openalex_active": "openalex-mcp" in active_mcp,
        "zotero_mcp_active": "zotero-mcp" in active_mcp,
    }


def project_sources_overview(project_root: str | Path) -> dict[str, Any]:
    base = Path(project_root) if project_root else Path()
    flags = _integration_detection_flags()
    if not project_root:
        return {
            "project_root": "",
            "project_exists": False,
            "canonical_files": [],
            "evidence_entry_count": 0,
            "material_entry_count": 0,
            "material_file_count": 0,
            "material_files": [],
            "ledger_health": [
                _status_row("台账文件", "未选择项目", "amber"),
                _status_row("schema 可读", "未选择项目", "amber"),
                _status_row("关键字段", "未选择项目", "amber"),
                _status_row("来源可追溯", "未选择项目", "amber"),
            ],
            **flags,
        }
    canonical = _project_file_status(base, ["material-passport.yaml", "evidence-ledger.yaml", "research-map.md", "findings-memory.md"])
    evidence_path = base / "evidence-ledger.yaml"
    material_path = base / "material-passport.yaml"
    material_files = _collect_project_files(
        base,
        ["materials", "sources", "data", "inputs", "documents", "docs"],
        (".pdf", ".md", ".txt", ".csv", ".xlsx", ".xls", ".json", ".yaml", ".yml", ".docx", ".ris", ".bib"),
    )
    return {
        "project_root": str(base),
        "project_exists": bool(project_root) and base.exists(),
        "canonical_files": canonical,
        "evidence_entry_count": _count_yaml_list_entries(evidence_path),
        "material_entry_count": _count_yaml_list_entries(material_path),
        "material_file_count": len(material_files),
        "material_files": material_files[:20],
        "ledger_health": _source_ledger_health(base),
        **flags,
    }


def project_analysis_overview(project_root: str | Path) -> dict[str, Any]:
    base = Path(project_root) if project_root else Path()
    skill_names = {item["name"] for item in inventory_skills()}
    method_skills = [
        {"name": name, "available": name in skill_names}
        for name in ["quant-analysis", "text-analysis", "network-analysis", "abm-simulation-lab", "figure-table-studio", "reproducibility-package"]
    ]
    if not project_root:
        return {
            "project_root": "",
            "project_exists": False,
            "script_count": 0,
            "data_file_count": 0,
            "output_count": 0,
            "scripts": [],
            "data_files": [],
            "outputs": [],
            "available_method_skills": method_skills,
            "current_stage": "",
            "completed_stage_count": 0,
            "gate_count": 0,
            "reproducibility_status": [
                _status_row("环境锁文件", "未选择项目", "amber"),
                _status_row("最近运行记录", "未选择项目", "amber"),
                _status_row("输出新鲜度", "未选择项目", "amber"),
                _status_row("复现包", "未选择项目", "amber"),
            ],
        }
    scripts = _collect_project_files(
        base,
        ["scripts", "analysis", "src", "notebooks", "code"],
        (".py", ".r", ".R", ".ipynb", ".qmd", ".do", ".jl", ".sql"),
    )
    data_files = _collect_project_files(
        base,
        ["data", "inputs", "datasets", "raw", "processed"],
        (".csv", ".tsv", ".xlsx", ".xls", ".json", ".jsonl", ".parquet", ".dta", ".sav", ".rds", ".sqlite", ".db", ".gexf", ".graphml"),
    )
    outputs = _collect_project_files(
        base,
        ["outputs", "reports", "figures", "tables", "logs"],
        (".md", ".txt", ".html", ".csv", ".xlsx", ".png", ".jpg", ".jpeg", ".svg", ".pdf", ".json"),
    )
    snapshot = load_project_snapshot(base) if base.exists() else {}
    current = snapshot.get("current_state", {}) if isinstance(snapshot, dict) else {}
    pipeline = snapshot.get("pipeline_state", {}) if isinstance(snapshot, dict) else {}
    return {
        "project_root": str(base),
        "project_exists": bool(project_root) and base.exists(),
        "script_count": len(scripts),
        "data_file_count": len(data_files),
        "output_count": len(outputs),
        "scripts": scripts[:20],
        "data_files": data_files[:20],
        "outputs": outputs[:20],
        "available_method_skills": method_skills,
        "current_stage": current.get("pipeline_stage") or pipeline.get("current_stage") or "",
        "completed_stage_count": len(pipeline.get("completed_stages", [])) if isinstance(pipeline, dict) else 0,
        "gate_count": len(pipeline.get("gate_decisions", {})) if isinstance(pipeline, dict) else 0,
        "reproducibility_status": _reproducibility_status(base, outputs),
    }


def project_writing_overview(project_root: str | Path) -> dict[str, Any]:
    base = Path(project_root) if project_root else Path()
    flags = _integration_detection_flags()
    if not project_root:
        return {
            "project_root": "",
            "project_exists": False,
            "writing_file_count": 0,
            "reference_file_count": 0,
            "report_count": 0,
            "writing_files": [],
            "reference_files": [],
            "reports": [],
            "writing_status": "missing",
            "checks": [],
            "zotero_detected": flags["zotero_detected"],
            "obsidian_detected": flags["obsidian_detected"],
            "zotero_mcp_active": flags["zotero_mcp_active"],
            "citation_chain_status": [
                _status_row("引用文件", "未选择项目", "amber"),
                _status_row("写作质量报告", "未选择项目", "amber"),
                _status_row("Zotero 桌面端", "可打开" if flags["zotero_detected"] else "待安装", "green" if flags["zotero_detected"] else "amber"),
                _status_row("Zotero MCP", "已启用" if flags["zotero_mcp_active"] else "未启用", "green" if flags["zotero_mcp_active"] else "amber"),
                _status_row("Obsidian", "可打开" if flags["obsidian_detected"] else "待安装", "green" if flags["obsidian_detected"] else "amber"),
                _status_row("端到端同步凭据", "未验证", "amber"),
            ],
        }
    writing_files = _collect_project_files(
        base,
        ["writing", "drafts", "paper", "manuscript", "outputs", "docs"],
        (".md", ".docx", ".tex", ".pdf", ".rtf", ".txt"),
    )
    reference_files = _collect_project_files(
        base,
        ["references", "bibliography", "zotero", "paper", "writing", "outputs"],
        (".bib", ".ris", ".json", ".yaml", ".yml", ".csv"),
    )
    reports = _collect_project_files(
        base,
        ["logs/quality-gates", "outputs/reports", "reports"],
        (".json", ".md", ".txt", ".html", ".pdf"),
    )
    snapshot = load_project_snapshot(base) if base.exists() else {}
    writing = snapshot.get("writing_quality", {}) if isinstance(snapshot, dict) else {}
    checks = writing.get("checks", {}) if isinstance(writing, dict) else {}
    check_rows: list[dict[str, Any]] = []
    if isinstance(checks, dict):
        for name, payload in checks.items():
            payload = payload if isinstance(payload, dict) else {}
            check_rows.append(
                {
                    "name": name,
                    "label": humanize_writing_check_name(name),
                    "decision": payload.get("decision", "pending"),
                    "notes": payload.get("notes", []),
                    "hits": payload.get("hits", []),
                }
            )
    return {
        "project_root": str(base),
        "project_exists": bool(project_root) and base.exists(),
        "writing_file_count": len(writing_files),
        "reference_file_count": len(reference_files),
        "report_count": len(reports),
        "writing_files": writing_files[:20],
        "reference_files": reference_files[:20],
        "reports": reports[:20],
        "writing_status": writing.get("status", "missing") if isinstance(writing, dict) and writing else "missing",
        "checks": check_rows,
        "zotero_detected": flags["zotero_detected"],
        "obsidian_detected": flags["obsidian_detected"],
        "zotero_mcp_active": flags["zotero_mcp_active"],
        "citation_chain_status": _citation_chain_status(base, reference_files, reports, flags),
    }


def project_header_metrics(project_root: str | Path) -> list[dict[str, str]]:
    snapshot = load_project_snapshot(project_root)
    current = snapshot.get("current_state", {}) if isinstance(snapshot, dict) else {}
    pipeline = snapshot.get("pipeline_state", {}) if isinstance(snapshot, dict) else {}
    writing = snapshot.get("writing_quality", {}) if isinstance(snapshot, dict) else {}
    blockers = current.get("blockers", []) if isinstance(current, dict) else []
    milestones = current.get("milestones", []) if isinstance(current, dict) else []
    gate_decisions = pipeline.get("gate_decisions", {}) if isinstance(pipeline, dict) else {}
    completed = pipeline.get("completed_stages", []) if isinstance(pipeline, dict) else []
    checks = writing.get("checks", {}) if isinstance(writing, dict) else {}
    passed_checks = 0
    if isinstance(checks, dict):
        passed_checks = sum(1 for item in checks.values() if isinstance(item, dict) and item.get("decision") == "pass")
    return [
        {
            "label": "当前阶段",
            "value": humanize_stage_id(str(current.get("pipeline_stage") or pipeline.get("current_stage") or "")),
        },
        {"label": "当前负责人", "value": str(current.get("current_owner_display_name") or current.get("current_owner_agent_id") or "unassigned")},
        {"label": "阻塞点", "value": str(len(blockers))},
        {"label": "里程碑", "value": str(len(milestones))},
        {"label": "已通过检查", "value": str(len(gate_decisions))},
        {"label": "写作检查", "value": f"{passed_checks}/{len(checks) if isinstance(checks, dict) else 0}"},
        {"label": "已完成阶段", "value": str(len(completed))},
    ]


def _append_unique_line(path: Path, line: str) -> None:
    if not path.exists():
        return
    content = path.read_text(encoding="utf-8", errors="replace")
    if line in content:
        return
    updated = content.rstrip() + "\n" + line + "\n"
    path.write_text(updated, encoding="utf-8")


def _annotate_project_type(project_root: Path, research_type: str) -> None:
    current_state_path = project_root / "logs" / "project-state" / "current.json"
    research_map_path = project_root / "research-map.md"
    material_passport_path = project_root / "material-passport.yaml"

    if current_state_path.exists():
        current_state = load_json(current_state_path)
        if isinstance(current_state, dict):
            current_state["research_type_hint"] = research_type
            current_state_path.write_text(
                json.dumps(current_state, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )

    if material_passport_path.exists():
        content = material_passport_path.read_text(encoding="utf-8", errors="replace")
        if "research_type_hint:" not in content:
            content = content.rstrip() + f"\nresearch_type_hint: {research_type}\n"
            material_passport_path.write_text(content, encoding="utf-8")

    _append_unique_line(research_map_path, f"- Research type hint: {research_type}")


def _ensure_codex_trust(project_path: Path) -> None:
    if not CONFIG_PATH.exists():
        raise FileNotFoundError(f"Codex config file was not found: {CONFIG_PATH}")
    config_text = CONFIG_PATH.read_text(encoding="utf-8")
    header = f"[projects.'{project_path}']"
    escaped_header = re.escape(header)
    trust_pattern = re.compile(rf"(?ms){escaped_header}\s*\r?\ntrust_level\s*=\s*\"[^\"]*\"")
    desired_block = f"{header}\ntrust_level = \"trusted\""

    if trust_pattern.search(config_text):
        config_text = trust_pattern.sub(desired_block, config_text)
    elif re.search(escaped_header, config_text):
        config_text = re.sub(escaped_header, desired_block, config_text)
    else:
        config_text = config_text.rstrip() + "\n\n" + desired_block + "\n"
    CONFIG_PATH.write_text(config_text, encoding="utf-8")


def _write_text_if_missing(path: Path, content: str) -> None:
    if not path.exists():
        path.write_text(content, encoding="utf-8")


def _write_json_if_missing(path: Path, payload: dict[str, Any]) -> None:
    if not path.exists():
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _portable_project_init(project_path: Path) -> None:
    git = shutil.which("git")
    if not git:
        raise RuntimeError("Git executable was not found in PATH.")

    root_agents_path = ROOT / "AGENTS.md"
    if not root_agents_path.exists():
        raise FileNotFoundError(f"Root AGENTS.md was not found: {root_agents_path}")

    project_name = project_path.name
    shared_venv = ENV_ROOT / ".venv"
    codex_dir = project_path / ".codex"
    project_agents_dir = codex_dir / "agents"
    dispatch_dir = codex_dir / "dispatch"
    context_packets_dir = codex_dir / "context-packets"
    agent_runs_dir = project_path / "outputs" / "agent-runs"
    handoff_logs_dir = project_path / "logs" / "agent-handoffs"
    gate_logs_dir = project_path / "logs" / "quality-gates"
    project_state_dir = project_path / "logs" / "project-state"
    method_passports_dir = project_path / "analysis" / "method-passports"

    project_path.mkdir(parents=True, exist_ok=True)
    for path in [
        codex_dir,
        project_agents_dir,
        dispatch_dir,
        context_packets_dir,
        agent_runs_dir,
        handoff_logs_dir,
        gate_logs_dir,
        project_state_dir,
        method_passports_dir,
    ]:
        path.mkdir(parents=True, exist_ok=True)

    if not (project_path / ".git").exists():
        subprocess.run([git, "init", "-b", "main", str(project_path)], check=True, capture_output=True, text=True)

    _write_text_if_missing(
        project_path / ".gitignore",
        ".venv/\n__pycache__/\n.ipynb_checkpoints/\noutputs/\n*.log\n*.tmp\n.env\n.env.*\n",
    )
    _write_text_if_missing(
        project_path / "README.md",
        (
            f"# {project_name}\n\n"
            "This project is initialized for Codex + Git + the V6.4 multi-agent research contract.\n\n"
            "## Default Python\n\n"
            "Use the shared research environment:\n\n"
            f"`{shared_venv}`\n\n"
            "## Next steps\n\n"
            "1. Add your project files.\n"
            "2. Review root `AGENTS.md`, project `AGENTS.md`, `.codex/agents/`, `material-passport.yaml` and `logs/quality-gates/pipeline-status.json`.\n"
            "2.1 Check `logs/project-state/current.json` to see the current owner, stage, blockers and milestones.\n"
            "3. Open the folder in Codex.\n"
            "4. Commit changes with your preferred Git client or git.\n"
        ),
    )
    _write_text_if_missing(
        project_path / "AGENTS.md",
        (
            "# AGENTS\n\n"
            "本项目继承当前研究环境 `skills/AGENTS.md` 的全局研究约束。\n"
            "本项目遵守研究型 Codex 多 agent contract。所有正式引用必须实时核验并包含有效 DOI；无 DOI 或真实性无法确认的文献不得作为正式引用。\n\n"
            "```yaml\n"
            "agent_constraints:\n"
            "  forbid_skills_mcp: []\n"
            "  forbid_write_roots: []\n"
            "  max_execution_mode: null\n"
            "  require_review_for:\n"
            "    - paper_draft\n"
            "    - revision_package\n"
            "    - submission_package\n"
            "    - figures_tables\n"
            "    - reproducibility_bundle\n"
            "    - literature_synthesis\n"
            "    - case_dataset\n"
            "    - project_map\n"
            "  project_truth_sources:\n"
            "    - research-map.md\n"
            "    - findings-memory.md\n"
            "    - material-passport.yaml\n"
            "    - evidence-ledger.yaml\n"
            "```\n"
        ),
    )
    _write_text_if_missing(
        project_path / "research-map.md",
        "# Research Map\n\n- Research question:\n- Current stage:\n- Active route:\n- Expected deliverables:\n",
    )
    _write_text_if_missing(
        project_path / "findings-memory.md",
        "# Findings Memory\n\n- Confirmed facts:\n- Rejected paths:\n- Pending verification:\n",
    )
    _write_text_if_missing(
        project_path / "material-passport.yaml",
        (
            f"project_name: {project_name}\n"
            "route_id: null\n"
            "current_stage: research_design\n"
            "data_access_level: public_open\n"
            "materials: []\n"
            "ethics_notes: []\n"
            "truth_sources:\n"
            "  - research-map.md\n"
            "  - findings-memory.md\n"
            "  - material-passport.yaml\n"
            "  - evidence-ledger.yaml\n"
        ),
    )
    _write_text_if_missing(project_path / "evidence-ledger.yaml", "entries: []\n")

    _write_json_if_missing(
        gate_logs_dir / "pipeline-status.json",
        {
            "route_id": None,
            "current_stage": "research_design",
            "completed_stages": [],
            "gate_decisions": {},
            "allowed_to_advance": False,
        },
    )
    _write_json_if_missing(
        gate_logs_dir / "writing-quality-report.json",
        {
            "status": "pending",
            "checked_deliverable": None,
            "target_paths": [],
            "checks": {
                "style_calibration": {"decision": "pending", "notes": []},
                "argument_chain_closure": {"decision": "pending", "notes": []},
                "citation_alignment": {"decision": "pending", "notes": []},
                "empty_phrase_scan": {"decision": "pending", "hits": [], "notes": []},
            },
            "banned_phrases": ["总而言之", "双刃剑", "多维度视角"],
            "generated_by": None,
            "updated_at": None,
        },
    )
    _write_json_if_missing(
        project_state_dir / "current.json",
        {
            "project_name": project_name,
            "route_id": None,
            "project_type": None,
            "dispatch_run_id": None,
            "dispatch_stage": "planning",
            "pipeline_stage": "research_design",
            "status": "initialized",
            "current_owner_agent_id": "project-manager",
            "current_owner_display_name": "项目经理智能体",
            "blockers": [],
            "next_quality_gates": [],
            "selected_agents": [],
            "selected_producers": [],
            "selected_reviewers": [],
            "review_agents": {},
            "milestones": [{"id": "project_initialized", "label": "项目已初始化", "status": "complete"}],
        },
    )
    _write_text_if_missing(project_state_dir / "history.md", "# Project State History\n\n- 项目初始化完成。\n")
    _write_text_if_missing(project_state_dir / "activity.jsonl", "")
    _write_text_if_missing(project_state_dir / "handoff-inbox.jsonl", "")

    project_agent_payloads = {
        "project-manager.json": {
            "agent_id": "project-manager",
            "display_name": "项目经理智能体",
            "preferred_model": None,
            "role": "manager",
            "enabled": True,
            "isolation_method": None,
            "parallel_safe": None,
            "integration_review_required": None,
            "capability_tags_subset": None,
            "allowed_skills_mcp_subset": ["research-stack-manager", "project-retrospective-evolver"],
            "write_scope_subset": ["outputs/agent-runs/<run_id>/<agent_id>/"],
            "max_execution_mode": "sequential_multi_agent_execution",
            "required_inputs": ["route_id", "clarification_card", "dispatch_contract"],
            "expected_outputs": ["summary.md", "result.json"],
            "review_gate": None,
        },
        "literature-producer.json": {
            "agent_id": "literature-producer",
            "display_name": "文献智能体",
            "preferred_model": None,
            "role": "producer",
            "enabled": False,
            "isolation_method": None,
            "parallel_safe": None,
            "integration_review_required": None,
            "capability_tags_subset": None,
            "allowed_skills_mcp_subset": None,
            "write_scope_subset": ["outputs/agent-runs/<run_id>/<agent_id>/"],
            "max_execution_mode": None,
            "required_inputs": ["clarification_card", "project_truth_sources"],
            "expected_outputs": ["summary.md", "result.json"],
            "review_gate": "mandatory-review-when-required",
        },
        "social-platform-producer.json": {
            "agent_id": "social-platform-producer",
            "display_name": "平台证据智能体",
            "preferred_model": None,
            "role": "producer",
            "enabled": False,
            "isolation_method": None,
            "parallel_safe": None,
            "integration_review_required": None,
            "capability_tags_subset": None,
            "allowed_skills_mcp_subset": None,
            "write_scope_subset": ["outputs/agent-runs/<run_id>/<agent_id>/"],
            "max_execution_mode": None,
            "required_inputs": ["clarification_card", "evidence_scope"],
            "expected_outputs": ["summary.md", "result.json"],
            "review_gate": "mandatory-review-when-required",
        },
        "analysis-producer.json": {
            "agent_id": "analysis-producer",
            "display_name": "分析智能体",
            "preferred_model": None,
            "role": "producer",
            "enabled": False,
            "isolation_method": None,
            "parallel_safe": None,
            "integration_review_required": None,
            "capability_tags_subset": None,
            "allowed_skills_mcp_subset": None,
            "write_scope_subset": ["outputs/agent-runs/<run_id>/<agent_id>/"],
            "max_execution_mode": None,
            "required_inputs": ["dataset_scope", "analysis_plan"],
            "expected_outputs": ["summary.md", "result.json"],
            "review_gate": "mandatory-review-when-required",
        },
        "writing-producer.json": {
            "agent_id": "writing-producer",
            "display_name": "写作智能体",
            "preferred_model": None,
            "role": "producer",
            "enabled": False,
            "isolation_method": None,
            "parallel_safe": None,
            "integration_review_required": None,
            "capability_tags_subset": None,
            "allowed_skills_mcp_subset": None,
            "write_scope_subset": ["outputs/agent-runs/<run_id>/<agent_id>/"],
            "max_execution_mode": None,
            "required_inputs": ["writing_scope", "verified_citations"],
            "expected_outputs": ["summary.md", "result.json"],
            "review_gate": "mandatory-review-when-required",
        },
        "reviewer.json": {
            "agent_id": "reviewer",
            "display_name": "审稿智能体",
            "preferred_model": None,
            "role": "reviewer",
            "enabled": True,
            "isolation_method": None,
            "parallel_safe": None,
            "integration_review_required": None,
            "capability_tags_subset": None,
            "allowed_skills_mcp_subset": [
                "citation-verifier",
                "academic-paper-review",
                "openalex-mcp",
                "semantic-scholar-mcp",
            ],
            "write_scope_subset": ["outputs/agent-runs/<run_id>/<agent_id>/"],
            "max_execution_mode": "sequential_multi_agent_execution",
            "required_inputs": ["target_agent_result", "target_agent_summary"],
            "expected_outputs": ["review.<target_agent_id>.md", "gate.<target_agent_id>.json"],
            "review_gate": "target-specific",
        },
    }
    for file_name, payload in project_agent_payloads.items():
        _write_json_if_missing(project_agents_dir / file_name, payload)

    _ensure_codex_trust(project_path)


def bootstrap_project(project_root: str | Path, research_type: str | None = None) -> dict[str, Any]:
    target_path = Path(project_root)
    target = str(target_path)
    if _is_windows():
        script_path = ROOT / "scripts" / "init-research-project.ps1"
        result = subprocess.run(
            [POWERSHELL, "-ExecutionPolicy", "Bypass", "-File", str(script_path), "-Path", target],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        if result.returncode == 0 and research_type:
            _annotate_project_type(target_path, research_type)
        return {
            "ok": result.returncode == 0,
            "returncode": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "path": target,
            "research_type": research_type,
        }

    try:
        _portable_project_init(target_path)
        if research_type:
            _annotate_project_type(target_path, research_type)
        return {
            "ok": True,
            "returncode": 0,
            "stdout": f"Research project initialized.\nProject path: {target_path}",
            "stderr": "",
            "path": target,
            "research_type": research_type,
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "ok": False,
            "returncode": 1,
            "stdout": "",
            "stderr": str(exc),
            "path": target,
            "research_type": research_type,
        }


def run_validator(name: str) -> dict[str, Any]:
    scripts = {
        "stack": ROOT / "scripts" / "validate_research_stack.py",
        "pipeline": ROOT / "scripts" / "validate_research_pipeline.py",
        "contract": ROOT / "scripts" / "validate_agents_contract.py",
        "registry": ROOT / "scripts" / "validate_subagent_registry.py",
    }
    if name not in scripts:
        return {
            "ok": False,
            "returncode": 2,
            "stdout": "",
            "stderr": f"Unsupported validator: {name}",
            "script": "",
        }
    script_path = scripts[name]
    try:
        result = subprocess.run(
            [str(VENV_PYTHON), str(script_path)],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=60,
        )
    except subprocess.TimeoutExpired as exc:
        return {
            "ok": False,
            "returncode": 124,
            "stdout": str(exc.stdout or ""),
            "stderr": f"Validator timed out after 60 seconds: {name}\n{exc.stderr or ''}",
            "script": str(script_path),
        }
    return {
        "ok": result.returncode == 0,
        "returncode": result.returncode,
        "stdout": result.stdout,
        "stderr": result.stderr,
        "script": str(script_path),
    }


def environment_overview() -> dict[str, Any]:
    return {
        "source_status": environment_source_status(),
        "summary": summarize_environment(),
        "metrics": collect_dashboard_metrics(),
        "readiness": manager_readiness_snapshot(),
        "recent_reports": list_recent_reports(),
        "trusted_projects": list_trusted_projects(),
    }


def route_preview(prompt: str) -> dict[str, Any]:
    preview = classify_task(prompt)
    return {
        "task_class": preview.task_class,
        "task_class_label": humanize_route_id(preview.task_class),
        "project_scope_class": preview.project_scope_class,
        "project_scope_label": humanize_scope_class(preview.project_scope_class),
        "task_type": preview.task_type,
        "task_type_label": humanize_task_type(preview.task_type),
        "data_access_level": preview.data_access_level,
        "data_access_label": humanize_data_access_level(preview.data_access_level),
        "quality_gate_required": preview.quality_gate_required,
        "quality_gate_labels": humanize_gate_ids(preview.quality_gate_required),
        "stage_scope": preview.stage_scope,
        "stage_scope_labels": humanize_stage_ids(preview.stage_scope),
        "subagent_allowed": preview.subagent_allowed,
        "profile": preview.profile,
        "profile_label": humanize_profile_name(preview.profile),
        "skills": preview.skills,
        "skill_labels": humanize_skill_names(preview.skills),
        "helper_skills": preview.helper_skills,
        "helper_skill_labels": humanize_skill_names(preview.helper_skills),
        "project_helper_skills": preview.project_helper_skills,
        "project_helper_skill_labels": humanize_skill_names(preview.project_helper_skills),
        "plugins": preview.plugins,
        "plugin_labels": [normalize_plugin_name(name) for name in preview.plugins],
        "mcp": preview.mcp,
        "mcp_labels": humanize_mcp_names(preview.mcp),
        "prepare_items": preparation_hints_for_route(preview.task_class),
        "excluded": preview.excluded,
        "rationale": preview.rationale,
        "next_step": preview.next_step,
        "explanation_card": render_explanation_card(prompt),
    }


def guided_install_profile() -> dict[str, Any]:
    python_candidates = [shutil.which("python3"), shutil.which("python")]
    return {
        "platform": platform_family(),
        "codex_app_present": any(item["label"] == "Codex App" for item in list_platform_apps()),
        "python_present": any(bool(item) for item in python_candidates),
        "git_present": shutil.which("git") is not None,
        "node_present": shutil.which("node") is not None,
        "zotero_present": any(item["label"] == "Zotero" for item in list_platform_apps()),
        "obsidian_present": any(item["label"] == "Obsidian" for item in list_platform_apps()),
        "guidance_mode": "detect_and_guide",
    }


def integrations_overview() -> dict[str, Any]:
    summary = summarize_environment()
    apps = list_platform_apps()
    found_labels = {item["label"] for item in apps}
    capabilities = [
        {
            "label": "Codex App",
            "kind": "app",
            "detected": "Codex App" in found_labels or CONFIG_PATH.exists(),
            "detail": "用于聊天、插件调用与项目协作的主入口。",
            "launchable": any(item["label"] == "Codex App" and item.get("launchable", True) for item in apps),
        },
        {
            "label": "Zotero",
            "kind": "app",
            "detected": "Zotero" in found_labels,
            "detail": "正式文献库与条目管理。",
            "launchable": any(item["label"] == "Zotero" for item in apps),
        },
        {
            "label": "Obsidian",
            "kind": "app",
            "detected": "Obsidian" in found_labels,
            "detail": "项目知识沉淀与研究笔记。",
            "launchable": any(item["label"] == "Obsidian" for item in apps),
        },
        {
            "label": "Git",
            "kind": "runtime",
            "detected": shutil.which("git") is not None,
            "detail": shutil.which("git") or "未探测到",
            "launchable": False,
        },
        {
            "label": "Python",
            "kind": "runtime",
            "detected": VENV_PYTHON.exists() or shutil.which("python3") is not None or shutil.which("python") is not None,
            "detail": str(VENV_PYTHON) if VENV_PYTHON.exists() else (shutil.which("python3") or shutil.which("python") or "未探测到"),
            "launchable": False,
        },
        {
            "label": "Node",
            "kind": "runtime",
            "detected": shutil.which("node") is not None,
            "detail": shutil.which("node") or "未探测到",
            "launchable": False,
        },
    ]
    return {
        "apps": apps,
        "capabilities": capabilities,
        "active_mcp": summary["active_mcp"],
        "disabled_mcp": summary["disabled_mcp"],
        "active_plugins": [normalize_plugin_name(name) for name in summary["active_plugins"]],
        "docs_dir": str(DOCS_DIR),
        "latest_report": latest_report_path(),
    }


def docs_tree() -> list[dict[str, Any]]:
    groups: dict[str, list[dict[str, str]]] = {}
    for item in list_all_docs():
        relative = Path(item["relative_path"])
        section = relative.parts[1] if len(relative.parts) > 1 else "root"
        groups.setdefault(section, []).append(item)
    rows: list[dict[str, Any]] = []
    for section in sorted(groups):
        rows.append({"section": section, "docs": groups[section]})
    return rows


def runtime_info() -> dict[str, str]:
    source_status = environment_source_status()
    return {
        "platform": host_platform(),
        "platform_family": platform_family(),
        "app_root": str(APP_ROOT),
        "app_env_root": str(APP_ENV_ROOT),
        "app_outputs_root": str(APP_OUTPUTS_DIR),
        "skills_root": str(ROOT),
        "active_skills_root": str(ROOT),
        "env_skills_root": str(ENV_SKILLS_ROOT),
        "snapshot_root": str(SNAPSHOT_ROOT),
        "snapshot_manifest_path": str(SNAPSHOT_MANIFEST_PATH),
        "environment_source_mode": str(source_status["mode"]),
        "environment_source_label": str(source_status["label"]),
        "environment_source_detail": str(source_status["detail"]),
        "snapshot_generated_at": str(source_status["snapshot_generated_at"]),
        "env_root": str(ENV_ROOT),
        "codex_home": str(CODEX_HOME),
        "config_path": str(CONFIG_PATH),
        "venv_python": str(VENV_PYTHON),
        "shell": HOST_SHELL,
        "powershell": str(POWERSHELL),
        "git": shutil.which("git") or "",
        "node": shutil.which("node") or "",
    }


def manager_distribution_summary() -> dict[str, Any]:
    return load_manager_distributions()


def distribution_targets() -> dict[str, Any]:
    return load_manager_distributions()


def build_manager_exe(skip_install: bool = False) -> dict[str, Any]:
    script_path = APP_ROOT / "scripts" / "build-codex-manager-exe.ps1"
    args = [POWERSHELL, "-ExecutionPolicy", "Bypass", "-File", str(script_path)]
    if skip_install:
        args.append("-SkipInstall")
    result = subprocess.run(
        args,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    exe_path = APP_OUTPUTS_DIR / "manager-app" / "dist" / "HELMLocalResearchBoard.exe"
    return {
        "ok": result.returncode == 0 and exe_path.exists(),
        "returncode": result.returncode,
        "stdout": result.stdout,
        "stderr": result.stderr,
        "script": str(script_path),
        "exe_path": str(exe_path),
    }


def build_manager_bundle(skip_exe_build: bool = False) -> dict[str, Any]:
    script_path = APP_ROOT / "scripts" / "build-codex-manager-bundle.ps1"
    args = [POWERSHELL, "-ExecutionPolicy", "Bypass", "-File", str(script_path)]
    if skip_exe_build:
        args.append("-SkipExeBuild")
    result = subprocess.run(
        args,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    bundle_path = APP_OUTPUTS_DIR / "manager-app" / "macos-guided" / "HELM-LocalResearchBoard-macOS"
    archive_path = APP_OUTPUTS_DIR / "manager-app" / "macos-guided" / "HELM-LocalResearchBoard-macOS.tar.gz"
    return {
        "ok": result.returncode == 0 and bundle_path.exists(),
        "returncode": result.returncode,
        "stdout": result.stdout,
        "stderr": result.stderr,
        "script": str(script_path),
        "bundle_path": str(bundle_path),
        "archive_path": str(archive_path),
    }


def build_macos_guided_bundle(skip_exe_build: bool = False) -> dict[str, Any]:
    return build_manager_bundle(skip_exe_build=skip_exe_build)


def path_summary() -> dict[str, str]:
    return {
        "app_root": str(APP_ROOT),
        "app_env_root": str(APP_ENV_ROOT),
        "env_root": str(ENV_ROOT),
        "skills_root": str(ROOT),
        "env_skills_root": str(ENV_SKILLS_ROOT),
        "snapshot_root": str(SNAPSHOT_ROOT),
        "docs_root": str(DOCS_DIR),
        "outputs_root": str(OUTPUTS_DIR),
        "app_outputs_root": str(APP_OUTPUTS_DIR),
        "config_path": str(CONFIG_PATH),
    }


def create_launch_entry(shortcut_path: str | Path | None = None) -> dict[str, Any]:
    if _is_windows():
        exe_path = APP_OUTPUTS_DIR / "manager-app" / "dist" / "HELMLocalResearchBoard.exe"
        if not exe_path.exists():
            return {"ok": False, "error": f"未找到 exe：{exe_path}"}

        desktop = Path.home() / "Desktop"
        target_shortcut = Path(shortcut_path) if shortcut_path else desktop / "HELM 本地科研看板.lnk"
        script = (
            "$WScriptShell = New-Object -ComObject WScript.Shell\n"
            f"$Shortcut = $WScriptShell.CreateShortcut('{str(target_shortcut)}')\n"
            f"$Shortcut.TargetPath = '{str(exe_path)}'\n"
            f"$Shortcut.WorkingDirectory = '{str(APP_ENV_ROOT)}'\n"
            f"$Shortcut.IconLocation = '{str(exe_path)},0'\n"
            "$Shortcut.Save()\n"
        )
        result = subprocess.run(
            [POWERSHELL, "-NoProfile", "-Command", script],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        return {
            "ok": result.returncode == 0 and target_shortcut.exists(),
            "returncode": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "shortcut_path": str(target_shortcut),
        }

    desktop = Path.home() / "Desktop"
    target_entry = Path(shortcut_path) if shortcut_path else desktop / "HELM Local Research Board.command"
    launcher = APP_ENV_ROOT / "Launch HELM Local Research Board.command"
    if not launcher.exists():
        python_candidates = [
            APP_ENV_ROOT / ".venv" / "bin" / "python3",
            APP_ENV_ROOT / ".venv" / "bin" / "python",
            ENV_ROOT / ".venv" / "bin" / "python3",
            ENV_ROOT / ".venv" / "bin" / "python",
        ]
        python_entry = next((item for item in python_candidates if item.exists()), None)
        app_entry = APP_ROOT / "manager" / "app.py"
        if python_entry and app_entry.exists():
            launcher.write_text(
                "#!/bin/zsh\n"
                "set -euo pipefail\n"
                f"export CODEX_RESEARCH_APP_ROOT=\"{APP_ROOT}\"\n"
                f"export CODEX_RESEARCH_ENV_SKILLS_ROOT=\"{ENV_SKILLS_ROOT}\"\n"
                f"\"{python_entry}\" \"{app_entry}\"\n",
                encoding="utf-8",
                newline="\n",
            )
            launcher.chmod(0o755)
    script = (
        "#!/bin/zsh\n"
        "set -euo pipefail\n"
        f"TARGET=\"{launcher}\"\n"
        "chmod +x \"$TARGET\" 2>/dev/null || true\n"
        "open \"$TARGET\"\n"
    )
    target_entry.write_text(script, encoding="utf-8", newline="\n")
    target_entry.chmod(0o755)
    return {"ok": target_entry.exists(), "returncode": 0, "stdout": "", "stderr": "", "shortcut_path": str(target_entry)}


def create_manager_shortcut(shortcut_path: str | Path | None = None) -> dict[str, Any]:
    return create_launch_entry(shortcut_path=shortcut_path)


def open_path(path: str | Path) -> None:
    target = str(path)
    if _is_windows():
        os.startfile(target)
        return
    if _is_macos():
        subprocess.run(["open", target], check=False)
        return
    subprocess.run(["xdg-open", target], check=False)
