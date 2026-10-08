# Route 53 console – frontend

Next.js (App Router) + TypeScript. See the [root README](../README.md) for the full project documentation.

```bash
npm install
cp .env.example .env.local   # optional; defaults to http://localhost:8000
npm run dev                  # http://localhost:3000
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint (`--max-warnings 0` in CI) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest + Testing Library |

## Source layout

```
src/
  app/            routes only: thin pages that compose features and UI
  features/       hosted-zones/ and records/ – screens' domain components (forms, modals, tables)
  components/
    ui/           ServerTable (server-side search/sort/pagination), ConfirmModal, ComingSoon
    layout/       AppShell (Cloudscape AppLayout), top navigation, side navigation, breadcrumbs, notifications
  hooks/          useResource, useDebouncedValue, useHotkeys, useCrumbLabel
  lib/            typed API client (api/), navigation config, theme + breadcrumb stores
  context/        AppContext (session, theme, notifications)
```
