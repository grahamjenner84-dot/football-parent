// Minimal ambient types for node:sqlite - added in Node 22.5+, not present
// in this repo's pinned @types/node (^20). Scoped to just the API surface
// this codebase actually uses (DatabaseSync + prepared statements) rather
// than bumping @types/node repo-wide, which would change type-checking
// behaviour for the whole Next.js app for an unrelated reason. Remove this
// file if @types/node is ever upgraded to a version that ships its own
// node:sqlite types.
declare module "node:sqlite" {
  export type SQLInputValue = null | number | bigint | string | Uint8Array;
  export type SQLOutputValue = null | number | bigint | string | Uint8Array;

  export class StatementSync {
    // Bound params are typed `unknown` rather than the stricter
    // SQLInputValue: callers often bind values sourced from
    // Record<string, unknown> merges (see imports/article-tracker.ts,
    // imports/keyword-tracker.ts), and node:sqlite throws its own runtime
    // TypeError for genuinely unsupported JS types either way.
    run(...params: unknown[]): { lastInsertRowid: number | bigint; changes: number | bigint };
    get(...params: unknown[]): Record<string, SQLOutputValue> | undefined;
    all(...params: unknown[]): Record<string, SQLOutputValue>[];
  }

  export class DatabaseSync {
    constructor(location: string, options?: { open?: boolean; readOnly?: boolean });
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
    open(): void;
  }
}
