import { Archive, FolderOpen, ShieldCheck, Signpost, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PageKey } from "./types";

export interface PageDefinition {
  key: PageKey;
  label: string;
  title: string;
  subtitle: string;
  weight: "primary" | "secondary";
  icon: LucideIcon;
}

export const PAGES: PageDefinition[] = [
  {
    key: "project",
    label: "项目",
    title: "当前项目",
    subtitle: "只看研究身份、阶段、材料、产物和缺口。",
    weight: "primary",
    icon: FolderOpen,
  },
  {
    key: "credibility",
    label: "证据",
    title: "证据是否够用",
    subtitle: "查看材料、证据和检查记录是否足够支撑后续判断。",
    weight: "primary",
    icon: ShieldCheck,
  },
  {
    key: "next-step",
    label: "交给 Codex",
    title: "交给 Codex",
    subtitle: "复制一份包含依据、缺口和提醒事项的说明，带回 Codex 继续。",
    weight: "primary",
    icon: Signpost,
  },
  {
    key: "deliverables",
    label: "文件",
    title: "已有文件",
    subtitle: "打开已有文稿、图表、报告和整理包；这里不生成新内容。",
    weight: "secondary",
    icon: Archive,
  },
  {
    key: "environment",
    label: "本机",
    title: "本机状态",
    subtitle: "运行本地检查，确认电脑状态是否影响继续工作。",
    weight: "secondary",
    icon: Wrench,
  },
];

export function pageByKey(key: PageKey): PageDefinition {
  return PAGES.find((page) => page.key === key) ?? PAGES[0];
}
