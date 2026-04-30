import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { PageKey } from "../types";
import { ActionButton } from "./ActionButton";

interface TourStep {
  id: string;
  page?: PageKey;
  target: string;
  title: string;
  body: string;
}

export function GuidedTour({
  open,
  activePage,
  onSelectPage,
  onClose,
  onDismissPermanently,
  onDismissPreferenceChange,
}: {
  open: boolean;
  activePage: PageKey;
  onSelectPage: (page: PageKey) => void;
  onClose: () => void;
  onDismissPermanently: () => void;
  onDismissPreferenceChange: (dismissed: boolean) => void;
}) {
  const steps = useMemo<TourStep[]>(
    () => [
      {
        id: "brand",
        target: "app-brand",
        title: "这是 HELM",
        body: "先把它理解成“本机项目仪表盘”：它帮你看项目是否接入、材料是否读到、文件在哪里、下一步要交给 Codex 什么。真正推进研究仍然回到 Codex 完成。",
      },
      {
        id: "project-selector",
        page: "project",
        target: "project-selector",
        title: "先确认当前项目",
        body: "这里显示 HELM 现在正在看的项目。如果不是你要看的项目，先在这里切换；如果列表里没有，去“项目”页复制接入说明交给 Codex。",
      },
      {
        id: "copy-intake",
        page: "project",
        target: "copy-project-intake",
        title: "需要接入项目时，复制接入说明",
        body: "第一次使用、换电脑、或想添加另一个项目时，用这个按钮。它只复制一段说明，不会改动你的项目文件。",
      },
      {
        id: "open-codex",
        target: "open-codex",
        title: "回到 Codex 接入项目",
        body: "把接入说明粘贴给 Codex，再告诉 Codex 真实项目路径。Codex 准备好本地项目资料后，HELM 才能读到状态。",
      },
      {
        id: "refresh",
        target: "refresh-dashboard",
        title: "接入后回到 HELM 刷新",
        body: "刷新会重新读取这台电脑上的项目状态。刚让 Codex 更新过项目、或者看不到最新文件时，先点这里。",
      },
      {
        id: "navigation",
        target: "main-navigation",
        title: "五个页面按这个顺序看",
        body: "项目：选项目和看缺口；证据：看依据是否读到；交给 Codex：复制继续说明；文件：打开已有内容；本机：排查电脑和工具状态。",
      },
      {
        id: "copy-codex",
        page: "next-step",
        target: "copy-codex-instruction",
        title: "需要继续时，复制给 Codex 的说明",
        body: "当你不知道下一步怎么推进时，到这里复制说明，再粘贴到 Codex。HELM 只帮你整理状态，不会自动执行研究。",
      },
      {
        id: "help",
        target: "support-button",
        title: "不知道页面含义时，打开帮助",
        body: "帮助里可以按“我想做什么”查入口，也能重新打开这套向导。以后忘记某个页面是干什么的，先点这里。",
      },
    ],
    [],
  );
  const [index, setIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const popoverRef = useRef<HTMLElement>(null);
  const step = steps[index] ?? steps[0];

  useEffect(() => {
    if (!open) return;
    setIndex((value) => Math.min(value, steps.length - 1));
  }, [open, steps.length]);

  useEffect(() => {
    if (!open || !step?.page || step.page === activePage) return;
    onSelectPage(step.page);
  }, [activePage, onSelectPage, open, step]);

  useEffect(() => {
    if (!open) return;
    const update = (scrollToTarget = false) => {
      const element = document.querySelector<HTMLElement>(`[data-tour-id="${step.target}"]`);
      if (!element || element.offsetParent === null) {
        setTargetRect(null);
        return;
      }
      if (scrollToTarget) {
        element.scrollIntoView({ block: "center", inline: "nearest" });
        window.setTimeout(() => setTargetRect(element.getBoundingClientRect()), 80);
        return;
      }
      setTargetRect(element.getBoundingClientRect());
    };
    const timeout = window.setTimeout(() => update(true), 140);
    const updateWithoutScroll = () => update(false);
    window.addEventListener("resize", updateWithoutScroll);
    window.addEventListener("scroll", updateWithoutScroll, true);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("resize", updateWithoutScroll);
      window.removeEventListener("scroll", updateWithoutScroll, true);
    };
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setIndex((value) => Math.min(value + 1, steps.length - 1));
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setIndex((value) => Math.max(value - 1, 0));
      }
      if (event.key === "Tab") {
        const focusable = popoverRef.current
          ? Array.from(
              popoverRef.current.querySelectorAll<HTMLElement>(
                "button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex='-1'])",
              ),
            ).filter((item) => item.offsetParent !== null)
          : [];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open, steps.length]);

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => {
      const target = popoverRef.current?.querySelector<HTMLElement>("[data-tour-primary]") ?? popoverRef.current;
      target?.focus();
    }, 40);
    return () => window.clearTimeout(timeout);
  }, [index, open]);

  if (!open) return null;

  const isLast = index === steps.length - 1;
  const popoverStyle = createPopoverStyle(targetRect);
  const spotlightStyle = targetRect
    ? {
        left: targetRect.left - 8,
        top: targetRect.top - 8,
        width: targetRect.width + 16,
        height: targetRect.height + 16,
      }
    : undefined;

  const finish = () => {
    if (dontShowAgain) onDismissPermanently();
    else onClose();
  };

  return (
    <div className="tour-overlay" aria-live="polite">
      {targetRect ? <div className="tour-spotlight" style={spotlightStyle} /> : null}
      <section
        className={`tour-popover ${targetRect ? "" : "centered"}`}
        ref={popoverRef}
        style={popoverStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="helm-tour-title"
        tabIndex={-1}
      >
        <div className="tour-progress">
          <span>{index + 1} / {steps.length}</span>
          <button type="button" onClick={onClose}>稍后再看</button>
        </div>
        <h2 id="helm-tour-title">{step.title}</h2>
        <p>{step.body}</p>
        <label className="tour-dismiss">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(event) => {
              setDontShowAgain(event.target.checked);
              try {
                window.localStorage.setItem("helm.firstRunGuide.dismissed.v1", event.target.checked ? "true" : "false");
              } catch {
                // The user setting still works for this session if localStorage is unavailable.
              }
              onDismissPreferenceChange(event.target.checked);
            }}
          />
          不再显示
        </label>
        <div className="tour-actions">
          <ActionButton variant="ghost" disabled={index === 0} onClick={() => setIndex((value) => Math.max(value - 1, 0))}>
            上一步
          </ActionButton>
          <ActionButton variant="ghost" onClick={finish}>
            完成
          </ActionButton>
          <ActionButton
            variant="primary"
            data-tour-primary
            onClick={() => {
              if (isLast) finish();
              else setIndex((value) => Math.min(value + 1, steps.length - 1));
            }}
          >
            {isLast ? "完成" : "下一步"}
          </ActionButton>
        </div>
      </section>
    </div>
  );
}

function createPopoverStyle(rect: DOMRect | null): CSSProperties {
  if (!rect) return {};
  const width = 360;
  const margin = 18;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const preferRight = rect.right + width + margin < viewportWidth;
  const preferLeft = rect.left - width - margin > 0;
  const left = preferRight
    ? rect.right + margin
    : preferLeft
      ? rect.left - width - margin
      : Math.min(Math.max(margin, rect.left), viewportWidth - width - margin);
  const top = Math.min(Math.max(margin, rect.top), viewportHeight - 280 - margin);
  return { left, top, width };
}
