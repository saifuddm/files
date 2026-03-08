# files

Early monorepo for a filesystem-aware application stack.

## Workspace Layout

```text
apps/
  web/       placeholder for the future Next.js dashboard
  watcher/   filesystem watcher and file-event producer
  worker/    scan and context-generation workers
packages/
  shared/    shared constants, queue contracts, types, and schemas
  db/        shared Drizzle schema and database helpers
```