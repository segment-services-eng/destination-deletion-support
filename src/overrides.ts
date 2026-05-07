import type { Destination } from "./types";

// Destinations documented as supporting deletion in official Segment docs
// but where no onDelete/prototype.delete/createDirectIntegration handler
// is found in source code. These may be handled at the platform level.
// Add entries here only after verifying they cannot be detected automatically.
export const MANUAL_OVERRIDES: ReadonlyArray<Destination> = [];
