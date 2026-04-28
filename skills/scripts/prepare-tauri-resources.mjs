import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..", "..");
const desktopRoot = path.join(repoRoot, "apps", "desktop");
const resourceRoot = path.join(desktopRoot, "runtime-resources");
const resourceSkills = path.join(resourceRoot, "skills");

function ensureInside(child, parent) {
  const relative = path.relative(parent, child);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to modify path outside desktop root: ${child}`);
  }
}

function copyIfExists(name) {
  const source = path.join(repoRoot, "skills", name);
  if (!fs.existsSync(source)) return;
  fs.cpSync(source, path.join(resourceSkills, name), {
    recursive: true,
    force: true,
    filter: (src) => {
      const normalized = src.replaceAll("\\", "/");
      return !(
        normalized.includes("/outputs/") ||
        normalized.includes("/docs/90-personal/") ||
        normalized.endsWith("/docs/90-personal") ||
        normalized.includes("/environment-snapshot/docs/") ||
        normalized.endsWith("/environment-snapshot/docs") ||
        normalized.includes("/environment-snapshot/plugins/") ||
        normalized.endsWith("/environment-snapshot/plugins") ||
        normalized.includes("/__pycache__/") ||
        normalized.endsWith("/__pycache__") ||
        normalized.includes("/.pytest_cache/") ||
        normalized.endsWith("/.pytest_cache") ||
        normalized.endsWith(".pyc") ||
        normalized.endsWith(".pyo")
      );
    },
  });
}

function removeIfExists(relativePath) {
  const target = path.join(resourceSkills, ...relativePath.split("/"));
  if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
}

function legacyBridgeRelativePath(prefix = "scripts") {
  return `${prefix}/${["private", "_app", "_bridge", ".py"].join("")}`;
}

function pruneGeneratedFiles(root) {
  if (!fs.existsSync(root)) return;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__pycache__" || entry.name === ".pytest_cache") {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        pruneGeneratedFiles(fullPath);
      }
      continue;
    }
    if (entry.name.endsWith(".pyc") || entry.name.endsWith(".pyo")) {
      fs.rmSync(fullPath, { force: true });
    }
  }
}

ensureInside(resourceRoot, desktopRoot);
if (fs.existsSync(resourceRoot)) fs.rmSync(resourceRoot, { recursive: true, force: true });
fs.mkdirSync(resourceSkills, { recursive: true });

const roots = [
  "AGENTS.md",
  "README.md",
  "catalog",
  "environment-snapshot",
  "manager",
  "profiles",
  "schemas",
  "scripts",
  "snapshot-manifest.json",
];

for (const root of roots) copyIfExists(root);

for (const target of [
  "outputs",
  "docs",
  "plugins",
  "docs/90-personal",
  "environment-snapshot/docs",
  "environment-snapshot/plugins",
  "environment-snapshot/docs/90-personal",
  "scripts/cleanup-windows-powershell51-modules.ps1",
  "scripts/set-codex-shell-defaults.ps1",
  "scripts/setup_omx_wsl.ps1",
  "scripts/sync-git-proxy.ps1",
  "scripts/create_zotero_obsidian_config_repo.ps1",
  "scripts/install_zotero_research_addons.ps1",
  "environment-snapshot/scripts/cleanup-windows-powershell51-modules.ps1",
  "environment-snapshot/scripts/set-codex-shell-defaults.ps1",
  "environment-snapshot/scripts/setup_omx_wsl.ps1",
  "environment-snapshot/scripts/sync-git-proxy.ps1",
  "environment-snapshot/scripts/create_zotero_obsidian_config_repo.ps1",
  "environment-snapshot/scripts/install_zotero_research_addons.ps1",
  legacyBridgeRelativePath("scripts"),
  legacyBridgeRelativePath("environment-snapshot/scripts"),
]) {
  removeIfExists(target);
}

pruneGeneratedFiles(resourceSkills);

fs.writeFileSync(
  path.join(resourceRoot, "runtime-resource-manifest.json"),
  JSON.stringify(
    {
      package: "HELM Local Research Board Tauri resources",
      generated_at: new Date().toISOString(),
      source_repo: "<APP_REPO_ROOT>",
      resource_root: "runtime-resources",
      copied_roots: roots,
    },
    null,
    2,
  ),
  "utf8",
);

console.log(resourceRoot);
