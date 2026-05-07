import type { CommandExecutor } from "./types";

export const createGitHubClient = (execute: CommandExecutor) => ({
  searchCode: (query: string, jqExpr: string): ReadonlyArray<string> => {
    const result = execute(
      `api search/code -X GET -f q="${query}" -f per_page=100 --jq '${jqExpr}'`
    );
    return result ? result.split("\n").filter(Boolean) : [];
  },

  getFileContent: (repo: string, path: string): string =>
    execute(
      `api "repos/${repo}/contents/${path}" --jq '.content | @base64d'`
    ),
});

export type GitHubClient = ReturnType<typeof createGitHubClient>;
