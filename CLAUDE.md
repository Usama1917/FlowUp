# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

FlowUp is an **Arabic-first (RTL default, English secondary)** internal task-delivery & communication app — a polished React **prototype** that replaces messy Telegram hand-offs between supervisors and designers with structured chats, task cards, and governance. **It is UI-only: no backend, no database.** All data is in-memory mock data; only language / dark mode / current user persist (localStorage) — everything else resets on refresh.

> An earlier Frappe/ERPNext implementation was abandoned; this React prototype is the active project. Fields like `erpStatus`, `employeeCode`, `item`, `project`, `scientificSupervisorCode` are placeholders for a future ERPNext integration — they are plain strings today.

## Where the code lives

This is a Replit pnpm monorepo, but **all real work is in `artifacts/flowup/`** (the React app). The other packages — `artifacts/api-server`, `lib/db`, `lib/api-spec`, `lib/api-zod`, `lib/api-client-react`, `artifacts/mockup-sandbox` — are an empty Replit scaffold (only a `/healthz` endpoint) and are **not used** by the app. Ignore them unless explicitly building the backend.

Stack: React 19, TypeScript 5.9, Vite 7, Tailwind CSS v4 (CSS-only config in `src/index.css`, no `tailwind.config`), shadcn/Radix UI, Framer Motion, Wouter (routing), Recharts.

## Commands

- **Run the app** (needs both env vars or Vite throws): `cd artifacts/flowup && PORT=5173 BASE_PATH=/ pnpm run dev`
- **Typecheck the app** (fast — run after every change): `cd artifacts/flowup && pnpm exec tsc -p tsconfig.json --noEmit`
- **Install deps**: `pnpm install` (pnpm only — npm/yarn are blocked)
- Full monorepo typecheck: `pnpm run typecheck` · Build: `pnpm run build`
- **There are no tests.**

**macOS (Apple Silicon) note:** `pnpm-workspace.yaml` normally strips all non-linux native binaries (Replit is linux-x64). The `darwin-arm64` overrides for rollup / esbuild / lightningcss / @tailwindcss/oxide are commented out so local Mac dev works — keep them commented or `pnpm run dev` won't start.

## Architecture — the parts you must understand

**Single source of state: `src/contexts/AppContext.tsx` (`useApp()`).** There is no data fetching (React Query is installed but unused). One provider holds all state and mutations; every component reads/writes through `useApp()`. This is the seam to replace when a backend is added.

**The data model lives in `src/data/mockData.ts`** — its interfaces (User, Department, Subject, Room, Task, Message, AuditLog) are the de-facto future DB schema. Seed arrays and the room/format helpers live here too.

### Rooms are partly stored, partly derived (the most important concept)

`allRooms` in AppContext = `[...feedRooms, ...assignmentRooms, ...baseRooms]`:

- **baseRooms** — the only *stateful* rooms (`setBaseRooms`): groups, department rooms, and 1-to-1 direct chats. New direct chats are appended here by `startDirectChat`.
- **assignmentRooms** — *derived* via `buildAssignmentRooms(subjects, users)` (a `useMemo`). One chat **per (subject × designer)**, id `asg_${subjectId}_${designerId}`, type `'subject'`. Participants = the designer + the subject's scientific supervisor (matched by `user.employeeCode === subject.scientificSupervisorCode`) + all design supervisors + managers.
- **feedRooms** — *derived* via `buildFeedRooms(users)`. One **read-only aggregate** per designer, id `feed_${designerId}`, type `'feed'`, participants `[designerId]` only, pinned at the top. `ChatPage` aggregates every message from that designer's subject chats into it, each message tinted by its subject color.

Because assignment/feed rooms are derived, you **never create them manually**. To assign a designer to a subject, mutate `subject.designerIds` (via `setDesignerSubjects(designerId, subjectIds)` from the member edit form, or the subject form's designer multi-select) — the rooms follow automatically.

### Per-role behavior (drive off role, don't hardcode)

- **`getRoomDisplayName(room, viewer, lang, users, subjects)`** returns a *different label per viewer*: a designer sees `تصميم {subject}`; the scientific supervisor sees the *designer's name*; manager/design-supervisor see `designer · subject`; direct chats show the other participant. Use it anywhere a room title is rendered (`RoomList`, `ChatPage` header).
- **Designer is locked down** (`RoomList`, `ChatPage`, `FloatingNav`): sees only subject chats + their feed; no other groups; no private chats (button hidden, and designers are excluded from everyone's private-chat picker); top nav shows only Chat / Tasks / Settings.
- **AdminPage** is open to `manager` AND `design_supervisor` (identical access), gated out for others. Tabs: departments, members, rooms, subjects, permissions (permissions UI is visual only — not enforced).
- Task actions gate on `currentRole` + `task.status` (`TaskDetailsPanel`); each action does `updateTaskStatus` + `sendMessage` + `addAuditLog` + toast.

### Roles & testing

4 roles: `designer`, `scientific_supervisor`, `design_supervisor`, `manager`. The **RoleSwitcher** (fixed, bottom-right) swaps the current user with no login — the primary way to test role-specific behavior.

## Conventions you must follow (each fixed a real bug)

- **All numbers / dates / times render in Latin digits.** Never format with the `ar-SA` locale (it emits Arabic-Indic digits ٠١٢٣). Use `en-GB` for dates and **`formatTime12(date, lang)`** (in `mockData.ts`) for clock time — 12-hour, Latin digits, `ص/م` (Arabic) or `AM/PM` (English).
- **i18n is type-safe.** Add every new key to **both** `t.ar` and `t.en` in `src/i18n/translations.ts` or `tsc` fails. Access via `getTranslations(lang)`.
- **RTL via logical properties.** Use `ps/pe`, `ms/me`, `start/end`, `border-s/border-e` so layouts mirror automatically. Wrap codes/emails/filenames in the `.ltr-value` class to keep them LTR inside Arabic text.
- **Chat bubbles are physically fixed** (sender = right, received = left, regardless of language): `MessageItem` forces `dir="ltr"` on each row + `justify-end/start` + physical corner classes `rounded-br-sm`/`rounded-bl-sm`, with `dir="auto"` on the text so Arabic still reads correctly. The `Switch` UI component is forced `dir="ltr"` for the same reason (its thumb broke in RTL).
- **Never use Framer Motion `whileHover={{ backgroundColor }}` on an element that also has a background class** — it leaves an inline style that overrides selected/active backgrounds after hover. Use CSS `hover:` classes instead.
- Running requires `PORT` and `BASE_PATH`; the app mounts under `BASE_URL` via Wouter's `base`.

## Product context (intent not visible in the code)

First department is Design. "Subjects" (مواد, e.g. "الأحياء أسئلة وتدريبات") each get a color and become the designers' chats. A subject chat is a group of {scientific supervisor, designer, manager, design supervisor}. Designers communicate only inside these subject groups plus a personal read-only feed; supervisors/managers get full chat + governance (departments, members, rooms, subjects, permissions, audit, dashboard).
