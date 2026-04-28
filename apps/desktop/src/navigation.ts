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
    label: "可信度",
    title: "可信度",
    subtitle: "显示引用、材料、证据和复现链的本地证据状态。",
    weight: "primary",
    icon: ShieldCheck,
  },
  {
    key: "next-step",
    label: "下一步",
    title: "下一步",
    subtitle: "生成一份带依据、缺口和禁止声称内容的项目交接单。",
    weight: "primary",
    icon: Signpost,
  },
  {
    key: "deliverables",
    label: "交付物",
    title: "交付物",
    subtitle: "浏览已有文稿、图表、复现包和投稿材料，不自动生成。",
    weight: "secondary",
    icon: Archive,
  },
  {
    key: "environment",
    label: "环境",
    title: "环境",
    subtitle: "检查当前项目继续推进所需的最低本地条件。",
    weight: "secondary",
    icon: Wrench,
  },
];

export function pageByKey(key: PageKey): PageDefinition {
  return PAGES.find((page) => page.key === key) ?? PAGES[0];
}
