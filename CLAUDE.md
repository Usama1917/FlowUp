# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

FlowUp is an **Arabic-first (RTL default, English secondary)** internal task-delivery & communication app — a polished React **prototype** that replaces messy Telegram hand-offs between supervisors and designers with structured chats, task cards, and governance. **It is UI-only: no backend, no database.** All data starts as in-memory mock data, but the mutable state (users, base rooms, messages, tasks, audit logs, departments, subjects) is **persisted to localStorage** so user-entered data survives a refresh — see the persistence layer in `AppContext.tsx` (keys under `flowup_*`, gated by `DATA_VERSION`; bump it when the seed shape changes to drop stale data and re-seed). `resetData()` (Settings → البيانات) wipes it back to seed. Language / dark mode / current user also persist.

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

**The data model lives in `src/data/mockData.ts`** — its interfaces (User, Department, SubDepartment, Subject, Room, Task, Message, AuditLog) are the de-facto future DB schema. Seed arrays and the room/format helpers live here too.

### Sub-departments = work stages (read this first)

A `Department` has **`subDepartments`** (a.k.a. stages): the Design dept is seeded with `التصميم / الرسم / التدقيق / الكتابة` (each `{id, name, nameEn, memberLabel?}` — `memberLabel` is the plural name of the people who do it, e.g. التصميم → المصممين). Managed in AdminPage's department form (add/edit/remove). **A subject "passes through" every stage**, so a subject chat exists once per *(subject × designer × stage)*. A **designer is assigned to specific stages** via `User.subDepartmentIds`; they only get chats for those stages. Editable in the member form ("المراحل المكلّف بها").

### Rooms are partly stored, partly derived (the most important concept)

`allRooms` in AppContext = `[...feedRooms, ...assignmentRooms, ...supervisorMergeRooms, ...baseRooms]`, then a final pass adds **auto-membership**: every `manager` is put into *every* group/subject room, and each `design_supervisor` into the group/subject rooms of *their own department*.

- **baseRooms** — the only *stateful* rooms (`setBaseRooms`): groups, department rooms, and 1-to-1 direct chats. New direct chats are appended here by `startDirectChat`.
- **assignmentRooms** — *derived* via `buildAssignmentRooms(subjects, users, departments)`. One chat **per (subject × designer × stage)**, id `asg_${subjectId}_${designerId}_${stageId}`, type `'subject'`, carries `subDepartmentId`. Only built for the stages in that designer's `subDepartmentIds`. Participants = the designer + the subject's scientific supervisor (matched by `user.employeeCode === subject.scientificSupervisorCode`) + all design supervisors + managers.
- **feedRooms** — *derived* via `buildFeedRooms(users, departments)`. Read-only aggregates pinned at the top, participants `[designerId]`. One **per (designer × stage)** (`feed_${designerId}_${stageId}`, named "جروب {stage} - {designer}") aggregating that designer's subject chats *in that stage*; **plus** one all-stages **"التفاعل"** feed (`feed_${designerId}_all`, no `subDepartmentId`) when the designer has >1 stage. `ChatPage` aggregates messages tinted by subject color; the التفاعل feed groups by stage with dashed stage dividers.
- **supervisorMergeRooms** — *derived* via `buildSupervisorMergeRooms(viewer, subjects, users, departments)`, **only for a scientific_supervisor viewer**. The "by designer" view: one merged chat **per (designer × stage)** (`smrg_${viewerId}_${designerId}_${stageId}`, type `'subject_merge'`) aggregating all the supervisor's subjects that designer does in that stage. Toggle with `sciViewMode` ('subject' | 'designer').

Because assignment/feed/merge rooms are derived, you **never create them manually**. To assign a designer to a subject, mutate `subject.designerIds`; to assign their stages, mutate `User.subDepartmentIds` (both via the member edit form or the subject form) — the rooms follow automatically.

**Stage filter:** `RoomList` has a folder dropdown (the stages of the user's dept, or just a designer's assigned stages — shown only when >1) that scopes the subject/feed/merge rooms to one stage; "الكل" shows every stage (sorted newest-first) and surfaces the "التفاعل" feed. While searching, the default scope widens to all stages unless a stage was explicitly picked.

### Per-role behavior (drive off role, don't hardcode)

- **`getRoomDisplayName(room, viewer, lang, users, subjects, departments)`** returns a *different label per viewer*, **stage-prefixed**: a designer sees `{stage} {subject}` (e.g. `تدقيق الأحياء…`, Arabic strips the leading "ال"); the scientific supervisor sees `designer · {stage} subject` (and for a merge room `designer · {stage}`); manager/design-supervisor see `designer · subject`; direct chats show the other participant. Use it anywhere a room title is rendered (`RoomList`, `ChatPage` header).
- **Designer is locked down** (`RoomList`, `ChatPage`, `FloatingNav`): sees only subject chats + their feed; no other groups; no private chats (button hidden, and designers are excluded from everyone's private-chat picker); top nav shows only Chat / Tasks / Settings. (They *do* get the stage folder-filter when assigned to >1 stage.)
- **AdminPage** is open to `manager` AND `design_supervisor` (identical access), gated out for others. Tabs: departments, members, rooms, subjects, permissions (permissions UI is visual only — not enforced).
- Task actions gate on `currentRole` + `task.status` (`TaskDetailsPanel`); each action does `updateTaskStatus` + `sendMessage` + `addAuditLog` + toast.
- **Composer (`ChatPage`)**: auto-growing textarea + circular Telegram-style send. The `+` menu (image/video → native file picker; task → `SendTaskModal`) shows for every role *but designers get image/video only*; hidden in the read-only feed. Outgoing messages carry WhatsApp-style delivery ticks (`Message.deliveryStatus`: sending→sent→delivered→read, simulated on a timer in `sendMessage`).
- **Aggregate views (feed/merge)**: a message is click-to-jump (feed: left-click; merge: right-click → "الانتقال لأصل الرسالة") to its real chat — `jumpToSource` clears every filter (`clearRoomFilters()` + `sciViewMode='subject'`) and flashes the target. Consecutive same-subject runs render as one connected gradient band.

### Roles & testing

4 roles: `designer`, `scientific_supervisor`, `design_supervisor`, `manager`. The **RoleSwitcher** (fixed, bottom-`start` = bottom-right in RTL) swaps the current user with no login — the primary way to test role-specific behavior.

## Conventions you must follow (each fixed a real bug)

- **All numbers / dates / times render in Latin digits.** Never format with the `ar-SA` locale (it emits Arabic-Indic digits ٠١٢٣). Use `en-GB` for dates and **`formatTime12(date, lang)`** (in `mockData.ts`) for clock time — 12-hour, Latin digits, `ص/م` (Arabic) or `AM/PM` (English).
- **i18n is type-safe.** Add every new key to **both** `t.ar` and `t.en` in `src/i18n/translations.ts` or `tsc` fails. Access via `getTranslations(lang)`.
- **RTL via logical properties.** Use `ps/pe`, `ms/me`, `start/end`, `border-s/border-e` so layouts mirror automatically. Wrap codes/emails/filenames in the `.ltr-value` class to keep them LTR inside Arabic text.
- **Chat bubbles are physically fixed** (sender = right, received = left, regardless of language): `MessageItem` forces `dir="ltr"` on each row + `justify-end/start` + physical corner classes `rounded-br-sm`/`rounded-bl-sm`, with `dir="auto"` on the text so Arabic still reads correctly. The `Switch` UI component is forced `dir="ltr"` for the same reason (its thumb broke in RTL).
- **Never use Framer Motion `whileHover={{ backgroundColor }}` on an element that also has a background class** — it leaves an inline style that overrides selected/active backgrounds after hover. Use CSS `hover:` classes instead.
- Running requires `PORT` and `BASE_PATH`; the app mounts under `BASE_URL` via Wouter's `base`.

## Product context (intent not visible in the code)

First department is Design. "Subjects" (مواد/كتب, e.g. "الأحياء أسئلة وتدريبات") each get a color and become the designers' chats. Each book moves through the dept's **stages** (التصميم/الرسم/التدقيق/الكتابة) — a separate chat per stage — and each worker is assigned the stage(s) they do (a مصمم does التصميم, a مدقق does التدقيق, …). A subject-stage chat is a group of {that stage's worker, scientific supervisor, manager, design supervisor}. Designers communicate only inside their subject-stage groups plus a personal read-only feed per stage (and the التفاعل feed); supervisors/managers get full chat + governance (departments + sub-departments, members, rooms, subjects, permissions, audit, dashboard).
