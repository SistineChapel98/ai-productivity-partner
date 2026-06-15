## Scope

A clean Linear/Notion-style SaaS app with three AI modules, user accounts, and per-user saved history. Skipping Research Assistant and Chatbot for now.

## Stack

- TanStack Start (React) + Tailwind + shadcn/ui (already in template)
- Lovable Cloud for auth + Postgres
- Lovable AI Gateway (`google/gemini-3-flash-preview`) — replaces OpenAI; no key needed from user
- All AI calls go through `createServerFn` handlers

## Auth

- Lovable Cloud email/password + Google sign-in
- `/auth` public route (sign in / sign up)
- All app routes live under `_authenticated/` (integration-managed gate)

## Routes

```
/auth                                  sign in / sign up
/_authenticated/                       app shell with sidebar
  /                                    Dashboard (welcome, usage counts, recent activity)
  /email                               Smart Email Generator
  /notes                               Meeting Notes Summarizer
  /tasks                               AI Task Planner
  /settings                            account + sign out
```

Sidebar (shadcn `Sidebar`, collapsible to icon rail) with: Dashboard, Email, Notes, Tasks, Settings. Top bar holds `SidebarTrigger` + user menu.

## Features

**1. Email Generator (`/email`)**
- Form: recipient, purpose, tone (Formal / Friendly / Persuasive / Executive / Apologetic), notes
- Generates subject + body; editable textarea; copy button
- Saves each generation to `emails` table; left column lists history

**2. Meeting Summarizer (`/notes`)**
- Paste transcript → structured output: Executive Summary, Key Decisions, Action Items, Deadlines, Risks
- Title auto-derived; saved to `meeting_notes`; history list

**3. Task Planner (`/tasks`)**
- Inputs: task list (one per line), available hours, start time
- Output: prioritized time-blocked schedule with reasoning
- Saved to `task_plans`; history list

**Dashboard (`/`)**
- Cards: Emails Generated, Notes Summarized, Plans Created (counts from DB)
- Recent activity list (last 5 across types) linking back to each item
- Responsible AI disclaimer footer

## Data Model

```
profiles(id uuid pk → auth.users, display_name, created_at)
emails(id, user_id, recipient, purpose, tone, notes, subject, body, created_at)
meeting_notes(id, user_id, title, source_text, summary_json, created_at)
task_plans(id, user_id, input_tasks, available_hours, schedule_json, created_at)
```

- RLS on every table scoped to `auth.uid() = user_id`
- `profiles` auto-created via trigger on signup
- GRANT SELECT/INSERT/UPDATE/DELETE to `authenticated`

## Server Functions (in `src/lib/*.functions.ts`)

- `generateEmail`, `summarizeMeeting`, `planTasks` — call Lovable AI Gateway via AI SDK `generateText` + `Output.object` for structured fields, persist row, return result
- `listEmails`, `listNotes`, `listPlans`, `getDashboardStats`
- All use `requireSupabaseAuth`; handle 429/402 gracefully

## Design

Clean modern SaaS: light neutral background, single accent (indigo), Inter, generous whitespace, soft shadows, rounded-xl cards. Sidebar quiet/muted; active item with subtle accent fill. Responsive: sidebar collapses to icons on tablet, sheet drawer on mobile, grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` for dashboard cards.

## Out of scope (this iteration)

Research Assistant, Chatbot, calendar integration, drag-and-drop tasks, team/collab features. Easy to add later as new routes.

## Build order

1. Enable Lovable Cloud + configure Google auth + provision LOVABLE_API_KEY
2. DB migration (tables, RLS, grants, profile trigger)
3. App shell: sidebar layout under `_authenticated/`, `/auth` page
4. Email Generator (end-to-end) — proves the AI + persistence pattern
5. Meeting Summarizer
6. Task Planner
7. Dashboard stats + recent activity
8. Settings page + polish
