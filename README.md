# Segment Destination Deletion Support

Automated tracking of which [Twilio Segment](https://segment.com) destinations support user deletion requests (GDPR/CCPA).

## Why?

The [official Segment docs](https://www.twilio.com/docs/segment/privacy/faq#which-destinations-can-i-send-deletion-requests-to) list a subset of destinations that support deletion, but that list is not comprehensive. This tool scans the actual source code in Segment's open-source repos to produce a complete, up-to-date list.

## Generated Output

- [`deletion-support.md`](./deletion-support.md) — full context with summary, legend, and source links
- [`deletion-support.csv`](./deletion-support.csv) — sortable/searchable table in GitHub's UI

## Prerequisites

- [Node.js](https://nodejs.org/) >= 22
- [GitHub CLI (`gh`)](https://cli.github.com/) authenticated with access to `segmentio` repos
- A `SEGMENTIO_TOKEN` GitHub Actions secret (required for CI/CD generation). To create:
  1. Go to GitHub Settings → Developer settings → Fine-grained personal access tokens
  2. Set **Resource owner** to the `segmentio` org
  3. Under **Repository access**, select `segmentio/action-destinations` and `segmentio/integrations`
  4. Under **Permissions**, grant **Contents: Read-only**
  5. Add the token as a secret named `SEGMENTIO_TOKEN` in this repo's Settings → Secrets → Actions

## Usage

```bash
npm install
npm run generate
```

## Development

```bash
npm run test           # Run tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with 100% coverage enforcement
npm run lint           # Type check
npm run build          # Compile TypeScript
```

## CI/CD

- **CI** (`ci.yml`) runs on every PR: type checks and tests with 100% coverage enforcement
- **Daily generation** (`generate-deletion-support.yml`) runs at 8:00 UTC, creates a PR with updated output, and auto-merges after CI passes
- The generation workflow fails hard if results appear incomplete (no action destinations, no legacy integrations, or fewer than 30 supported destinations detected)

---

## Detection Logic (How It Works)

The scanner searches two GitHub repositories and classifies each destination into one of four statuses: **Supported**, **Stub/No-Op**, **Commented Out**, or **Not Detected**.

### Source Repositories

| Repository | What we look for |
|------------|------------------|
| `segmentio/action-destinations` | `onDelete` handlers in `packages/destination-actions/src/destinations/*/index.ts` |
| `segmentio/integrations` | `prototype.delete`, `exports.delete`, `delete(event)` class methods, and `createDirectIntegration` entries |

### Step 1: Discovery

We use the GitHub Code Search API to find all files that reference deletion handlers:

- **Action Destinations**: Search for `onDelete` in `index.ts` files within the destinations path
- **Legacy Integrations**: Four patterns are searched:
  1. `prototype.delete` in integration source files
  2. `exports.delete` in mapper files
  3. `delete(event)` class methods in index files
  4. `createDirectIntegration` entries in `integrations/index.js` (these all share a common delete handler via `Direct.prototype.delete = request`)

The `not-implemented` placeholder integration is excluded from results.

### Step 2: Classification (Action Destinations only)

For each action destination found, we fetch its `index.ts` and classify the `onDelete` handler:

#### Commented Out
If no uncommented `onDelete` line exists in the file (i.e., every occurrence is preceded by `//`), the destination is classified as **Commented Out**. These are destinations where the template was scaffolded but deletion was never implemented.

#### Supported
A destination is classified as **Supported** if its `onDelete` handler contains actual implementation logic. We detect this by checking the first 15 lines after the `onDelete` declaration (ignoring comment lines) for any of these patterns:

| Pattern | What it indicates |
|---------|-------------------|
| `onDelete: functionName,` (not `async`) | Handler is delegated to a named function defined elsewhere |
| `request(` | Makes an HTTP request via the Segment request client |
| `payload.userId` or `payload.anonymousId` | Accesses user identity from the deletion payload |
| `payload[` | Bracket-notation access to payload properties |
| `fetch(` | Uses the Fetch API directly |
| `.delete(` | Calls a DELETE method on a client |
| `.post(` | Calls a POST method (many deletion APIs use POST) |
| `.put(` | Calls a PUT method |

#### Stub/No-Op
If `onDelete` is declared (uncommented) but none of the above patterns are found in the implementation body, it's classified as **Stub/No-Op**. These are destinations that technically declare the handler but don't actually perform any deletion.

### Step 3: Deduplication

Many destinations exist in both `action-destinations` (newer) and `integrations` (legacy). To avoid double-counting:

1. Exact slug matches are deduplicated (e.g., `amplitude` in both repos)
2. Normalized slug matches are deduplicated — slugs are compared after stripping all non-alphanumeric characters (e.g., `customerio` matches `customer.io`)

Legacy destinations that have a corresponding action destination are excluded from the final list.

### Step 4: Display Name Resolution

Destination slugs are converted to human-readable display names using:
1. A lookup table of known special names (e.g., `customerio` → "Customer.io", `iqm` → "IQM")
2. A fallback that splits on hyphens and capitalizes each word (e.g., `my-dest` → "My Dest")

### Limitations & Future Improvements

- **GitHub Code Search API limits**: Results are capped at 100 items per query. If the number of destinations with `onDelete` exceeds 100, pagination will need to be added.
- **Heuristic-based classification**: The regex patterns may miss unconventional implementations (e.g., a destination that calls a helper function which internally makes the request).
- **Legacy repo access**: The `segmentio/integrations` repo may not be publicly accessible; the script requires appropriate `gh` authentication.
- **Static catalog fallback**: The catalog list is hardcoded and must be manually updated when new destinations are added to Segment's catalog.

---

## Sources

- [Segment Action Destinations](https://github.com/segmentio/action-destinations)
- [Segment Legacy Integrations](https://github.com/segmentio/integrations)
- [Segment Destination Catalog](https://www.twilio.com/docs/segment/connections/destinations/catalog/index-all)
- [Segment Privacy FAQ](https://www.twilio.com/docs/segment/privacy/faq#which-destinations-can-i-send-deletion-requests-to)
