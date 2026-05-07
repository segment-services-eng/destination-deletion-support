import type { DeletionStatus } from "./types";

const isNonCommentLine = (line: string): boolean =>
  line.trim().length > 0 && !/^\s*\/\//.test(line);

const isDelegatedToNamedFunction = (line: string): boolean =>
  /onDelete:\s*(?!async)\w+\s*[,;]/.test(line);

const hasImplementation = (block: string, onDeleteLine: string): boolean => {
  if (isDelegatedToNamedFunction(onDeleteLine)) return true;

  const codeLines = block.split("\n").filter(isNonCommentLine);
  const codeBlock = codeLines.join("\n");

  return (
    /request\s*\(/.test(codeBlock) ||
    /payload\.(userId|anonymousId)/.test(codeBlock) ||
    /payload\[/.test(codeBlock) ||
    /fetch\s*\(/.test(codeBlock) ||
    /\.delete\s*\(/.test(codeBlock) ||
    /\.post\s*\(/.test(codeBlock) ||
    /\.put\s*\(/.test(codeBlock)
  );
};

export interface ClassificationResult {
  readonly status: DeletionStatus;
  readonly lineNumber: number | undefined;
}

export const classifyDestination = (content: string): ClassificationResult => {
  const lines = content.split("\n");
  const onDeleteIdx = lines.findIndex(
    (line) => /onDelete/.test(line) && !/^\s*\/\//.test(line)
  );

  if (onDeleteIdx === -1) {
    return { status: "commented-out", lineNumber: undefined };
  }

  const block = lines.slice(onDeleteIdx, onDeleteIdx + 15).join("\n");
  const onDeleteLine = lines[onDeleteIdx];
  const lineNumber = onDeleteIdx + 1;

  const status = hasImplementation(block, onDeleteLine) ? "active" : "noop";
  return { status, lineNumber };
};
