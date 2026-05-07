# Project Guidelines

## Architecture

This is a TypeScript CLI tool that scans Segment's GitHub repos for deletion handler implementations and produces a comprehensive report. It runs daily via GitHub Actions.

## Key Principles

- **Functional programming**: No `for` loops, no mutation. Use `map`, `filter`, `reduce`, `Array.from`, spread operators.
- **100% test coverage**: Enforced via vitest with v8 provider. All thresholds at 100%.
- **No direct pushes to main**: All changes require a PR with CI passing and conversations resolved.
- **Fail hard**: The generator exits with an error if results look incomplete rather than publishing partial data.

## Code Style

- TypeScript with `ReadonlyArray<T>` for arrays, `Readonly<Record<K,V>>` for maps
- `type` over `interface` for type aliases
- No comments unless explaining a non-obvious "why"
- No default exports

## Testing

- Vitest with `describe`/`it`/`expect`
- Mock GitHub API via `createMockClient` pattern (see `scanner.test.ts`)
- Wallaby configured for continuous testing

## Workflows

- `ci.yml`: Runs on PRs — type check + tests with coverage
- `generate-deletion-support.yml`: Daily at 8:00 UTC — generates output, creates PR, reports `test` status, auto-merges
  - Uses `SEGMENTIO_TOKEN` to read from `segmentio` repos
  - Uses `GITHUB_TOKEN` to create PRs (can't use PAT — scoped to different org)
  - Reports commit status directly because `GITHUB_TOKEN` actions don't trigger other workflows

## Common Tasks

- **Add a new detection pattern**: Update `src/classifier.ts` (for action destinations) or `src/scanner.ts` (for legacy integrations). Add tests.
- **Update the catalog**: Edit `FALLBACK_CATALOG` in `src/catalog.ts`. Keep it sorted alphabetically (`localeCompare`).
- **Add a name mapping**: Edit `SPECIAL_NAMES` in `src/names.ts` or `CATALOG_TO_SLUG_ALIASES` in `src/scanner.ts`.
- **Add a manual override**: Edit `MANUAL_OVERRIDES` in `src/overrides.ts` for destinations that can't be auto-detected.
