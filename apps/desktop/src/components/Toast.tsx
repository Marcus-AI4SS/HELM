export function Toast({ message, kind = "success" }: { message: string; kind?: "success" | "error" }) {
  if (!message) return null;
  return (
    <div className={`toast ${kind}`} role={kind === "error" ? "alert" : "status"} aria-live={kind === "error" ? "assertive" : "polite"}>
      {message}
    </div>
  );
}
