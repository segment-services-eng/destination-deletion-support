# Segment Destination Deletion Support

Automated tracking of which [Twilio Segment](https://segment.com) destinations support user deletion requests (GDPR/CCPA).

## Why?

The [official Segment docs](https://www.twilio.com/docs/segment/privacy/faq#which-destinations-can-i-send-deletion-requests-to) list a subset of destinations that support deletion, but that list is not comprehensive. This tool scans the actual source code in Segment's open-source repos to produce a complete, up-to-date list.

## Generated Output

See [`deletion-support.md`](./deletion-support.md) for the current list.

## How It Works

The script searches two GitHub repositories for deletion handler implementations:

1. **`segmentio/action-destinations`** — Looks for active `onDelete` handlers in destination `index.ts` files
2. **`segmentio/integrations`** — Looks for `prototype.delete` methods in legacy integration code

It classifies each destination as:
- **Active** — Has a working deletion handler that makes API calls
- **Stub/No-Op** — Declares an `onDelete` handler but does nothing
- **Commented Out** — Has the template code but commented out

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [GitHub CLI (`gh`)](https://cli.github.com/) authenticated with access to `segmentio` repos

## Usage

```bash
npm run generate
```

Or directly:

```bash
node generate-deletion-support.mjs
```

This will overwrite `deletion-support.md` with the latest data.

## Updating

Re-run the script periodically to capture newly added destinations. The output includes a timestamp so you know when it was last generated.

## Sources

- [Segment Action Destinations](https://github.com/segmentio/action-destinations)
- [Segment Legacy Integrations](https://github.com/segmentio/integrations)
- [Segment Destination Catalog](https://www.twilio.com/docs/segment/connections/destinations/catalog/index-all)
- [Segment Privacy FAQ](https://www.twilio.com/docs/segment/privacy/faq#which-destinations-can-i-send-deletion-requests-to)
