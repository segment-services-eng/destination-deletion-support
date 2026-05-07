export type DestinationType = "Action Destination" | "Legacy Integration" | "Catalog Only";

export type DeletionStatus = "active" | "noop" | "commented-out" | "unsupported";

export interface Destination {
  readonly slug: string;
  readonly name: string;
  readonly type: DestinationType;
  readonly repo: string;
  readonly sourceUrl: string;
  readonly status: DeletionStatus;
}

export interface GitHubCodeSearchItem {
  readonly path: string;
}

export interface GitHubCodeSearchResponse {
  readonly items: ReadonlyArray<GitHubCodeSearchItem>;
}

export interface GitHubContentResponse {
  readonly content: string;
}

export type CommandExecutor = (args: string) => string;
