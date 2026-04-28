import { getCurrentWindow } from "@tauri-apps/api/window";

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function runWindowAction(
  action: (appWindow: ReturnType<typeof getCurrentWindow>) => Promise<void>,
) {
  if (!isTauriRuntime()) return;
  try {
    await action(getCurrentWindow());
  } catch (error) {
    console.error("Tauri window action failed", error);
  }
}
