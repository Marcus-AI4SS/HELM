import { displayFileTitle } from "../displayText";
import type { FileRow } from "../types";

export function PlainFileList({
  files,
  emptyTitle,
  limit = 4,
}: {
  files: FileRow[];
  emptyTitle: string;
  limit?: number;
}) {
  const visibleFiles = files.slice(0, limit);
  if (!visibleFiles.length) return <p className="muted-copy">{emptyTitle}</p>;
  return (
    <ul className="plain-file-list">
      {visibleFiles.map((file, index) => (
        <li key={`${file.path || file.name || file.label}-${index}`}>
          <strong title={file.path || file.name || file.label}>{displayFileTitle(file)}</strong>
          <span>{file.exists === false ? "暂未读到" : file.exists ? "已读取" : "待读取"}</span>
        </li>
      ))}
    </ul>
  );
}
