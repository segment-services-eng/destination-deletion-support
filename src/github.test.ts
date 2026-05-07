import { describe, it, expect } from "vitest";
import { createGitHubClient } from "./github";

describe("createGitHubClient", () => {
  describe("searchCode", () => {
    it("returns parsed lines from command output", () => {
      const execute = (args: string): string => {
        expect(args).toContain("api search/code");
        return "dest-a\ndest-b\ndest-c";
      };

      const client = createGitHubClient(execute);
      const result = client.searchCode("test query", ".items[].name");

      expect(result).toEqual(["dest-a", "dest-b", "dest-c"]);
    });

    it("returns empty array when command returns empty string", () => {
      const execute = (): string => "";
      const client = createGitHubClient(execute);

      expect(client.searchCode("query", "jq")).toEqual([]);
    });

    it("filters out empty lines", () => {
      const execute = (): string => "dest-a\n\ndest-b\n";
      const client = createGitHubClient(execute);

      expect(client.searchCode("query", "jq")).toEqual(["dest-a", "dest-b"]);
    });
  });

  describe("getFileContent", () => {
    it("calls gh api with correct repo and path", () => {
      const execute = (args: string): string => {
        expect(args).toContain("repos/org/repo/contents/path/to/file.ts");
        return "file content here";
      };

      const client = createGitHubClient(execute);
      const result = client.getFileContent("org/repo", "path/to/file.ts");

      expect(result).toBe("file content here");
    });

    it("returns empty string when command fails", () => {
      const execute = (): string => "";
      const client = createGitHubClient(execute);

      expect(client.getFileContent("org/repo", "missing.ts")).toBe("");
    });
  });
});
