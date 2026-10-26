# Attendance Foundation Implementation Plan (Plan 1 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build accounts, branches, manager access, check in / check out with location and live photo, and shift review/editing, so the company can record real working hours.

**Architecture:** Postgres (Supabase) holds every business rule: RLS decides who sees what, and `SECURITY DEFINER` SQL functions perform every shift write with explicit permission checks and audit logging. Next.js Route Handlers under `app/api/` stay thin: authenticate, call the table or SQL function, map rows to camelCase JSON. Client components fetch with `useFetch` / `useMutation`.

**Tech Stack:** Next.js 16.4.3 (App Router), React 19.3.0, Tailwind CSS 4, Supabase (Postgres 17, Auth, Storage) via `@supabase/ssr` 0.12.7 and `@supabase/supabase-js` 2.118.0, Supabase CLI 2.122.0, Vitest 5.0.5, pgTAP (`supabase test db`).

**Spec:** `docs/superpowers/specs/2026-10-25-staff-attendance-payroll-design.md`

**Not in this plan (Plan 2 — payroll):** employment type (part time / full time — the spec stores it on each pay rate, section 8.1) and the "manager is full time" rule, pay rates, monthly config UI, overtime calculation, pay adjustments, payslips, month close/reopen/versions and the month lock on shift edits, Excel export, "Lương của tôi". Plan 1 creates the `monthly_configs` table only because check out needs `max_shift_minutes`.

## Global Constraints

- Follow `AGENTS.md`. Task 1 extends rule 1 so `app/api/_lib/`, `tests/` and `scripts/` may use Supabase.
- Install every new package with `--save-exact`. The only new package in this plan is `vitest@5.0.5` (dev).
- Business time zone is `Asia/Ho_Chi_Minh` (UTC+7). Store instants as `timestamptz`. A shift's `work_date` is the local date of its check in.
- Local Postgres grants ALL on new `public` tables to `anon` and `authenticated` by default. Every migration must `revoke all on <table> from anon, authenticated;` and then grant only what the task lists. Every table has RLS enabled.
- Every `SECURITY DEFINER` function: `set search_path = ''`, `revoke execute on function ... from public, anon;`, `grant execute ... to authenticated;`, and checks `auth.uid()` inside. RLS helper functions live in schema `private` (not exposed by the Data API).
- Phone numbers are stored normalized as `84` + 9 digits, e.g. `84901234567`. The internal Auth email is `<normalized phone>@nhanvien.local`, created with `email_confirm: true`. No SMS.
- Locked accounts: `employees.is_active = false` plus Auth `ban_duration: "876000h"`. Unlock sets `ban_duration: "none"`.
- API errors are `{ "error": string }` in Vietnamese. Never return a raw database message.
- All UI copy is Vietnamese. Components meet WCAG AA (semantic HTML, labels, keyboard, `role="alert"` for errors, `role="status"` for progress).
- Create migrations with `npx supabase migration new <name>`; apply with `npm run db:reset`; run SQL tests with `npm run test:db`; run TS tests with `npm test`. Integration tests need local Supabase running (`npm run db:start`) and `SUPABASE_SECRET_KEY` in `.env.local` (value from `npm run db:status`, key `SECRET_KEY`).

## Review Focus

1. **Locked employee with a still-valid session.** Locking does not revoke existing tokens. Every Route Handler must reject an inactive employee with 401 even when the session cookie is valid. Test in Task 5.
2. **Phone typed in different formats.** `0901 234 567`, `+84901234567` and `84901234567` must log in to the same account, and creating a second employee with any of these formats must return 409. Test in Task 7.
3. **Double tap on "Check in".** Two requests at once must create one open shift; the second request gets 409, not 500. Test in Task 3 (unique index) and Task 12 (409 mapping).
4. **Location permission denied or timed out.** Check in must still succeed with reason `location_unavailable`; the UI must not get stuck. Test in Task 12; UI handling in Task 13.
5. **Wrong photo file.** A non-JPEG body, an empty file, or a file over 2 MB must return 400 with a Vietnamese message and must not leave an object in Storage. Test in Task 12.

---

## File Structure

| Path | Responsibility |
|---|---|
| `vitest.config.ts`, `tests/setup.ts`, `tests/helpers/*` | Test runner config, `next/headers` cookie mock, fixtures that create and clean up users, branches, shifts. |
| `supabase/migrations/*_access.sql` | Enums, `employees`, `branches`, `manager_branches`, `manager_permissions`, `private` helper functions, RLS, `set_manager_access`, `mark_password_changed`. |
| `supabase/migrations/*_shifts.sql` | `monthly_configs`, `shifts`, `audit_logs`, `private.config_for_month`, `private.distance_m`, attendance SQL functions. |
| `supabase/migrations/*_shift_photos.sql` | Storage bucket `shift-photos` and its policies. |
| `supabase/tests/*.test.sql` | pgTAP tests for RLS and SQL functions. |
| `lib/auth/phone.ts` | Phone normalization and internal email. |
| `lib/branches/google-maps.ts` | Parse coordinates from Google Maps URLs; resolve short links. |
| `lib/date.ts` | Month ranges, VN-time conversions, duration formatting. |
| `lib/shifts/labels.ts` | Vietnamese labels for statuses and fail reasons. |
| `lib/supabase/admin.ts` | Secret-key client for the Auth Admin API only. |
| `app/api/_lib/auth.ts`, `errors.ts`, `mappers.ts` | Shared Route Handler helpers. |
| `app/api/**/route.ts` | Endpoints listed per task. |
| `types/employee.ts`, `types/branch.ts`, `types/shift.ts` | API response types shared with FE. |
| `hooks/use-fetch.ts` (modify), `hooks/use-mutation.ts` | Data hooks. |
| `components/ui/*`, `components/<feature>/*` | UI components per AGENTS.md. |
| `app/login`, `app/(app)/**` | Pages that only compose components. |
| `scripts/create-admin.mjs` | Bootstrap the first admin account. |

---

### Task 1: Test runner, rule update, phone helpers

**Files:**
- Create: `vitest.config.ts`, `tests/setup.ts`, `tests/helpers/server-only.ts`, `lib/auth/phone.ts`, `lib/auth/phone.test.ts`
- Modify: `package.json` (scripts), `eslint.config.mjs` (ignores), `AGENTS.md` (rule 1), `.env.example`, `.env.local`

**Interfaces:**
- Produces: `normalizePhone(input: string): string | null`, `phoneToEmail(normalizedPhone: string): string`, `INTERNAL_EMAIL_DOMAIN = "nhanvien.local"`. npm scripts `test` = `vitest run`, `test:db` = `supabase test db`.

- [ ] **Step 1: Install Vitest and wire config**

Run: `npm install --save-dev --save-exact vitest@5.0.5`

`vitest.config.ts`: `environment: "node"`, `setupFiles: ["./tests/setup.ts"]`, `env: loadEnv("test", process.cwd(), "")` (from `vite`, loads `.env.local`), `fileParallelism: false`, alias `@` → repo root, alias `server-only` → `tests/helpers/server-only.ts` (empty module). `tests/setup.ts` is empty in this task; Task 5 adds the cookie mock.

Add scripts: `"test": "vitest run"`, `"test:db": "supabase test db"`.

- [ ] **Step 2: Extend rule 1 and the ESLint ignore list**

`eslint.config.mjs`: add `"tests/**"`, `"scripts/**"` to the `ignores` of the Supabase `no-restricted-imports` block. `app/api/**` already covers `app/api/_lib/`.

`AGENTS.md` rule 1, first bullet becomes: "Mọi truy vấn Supabase phải nằm trong `app/api/`: Route Handler `route.ts` và helper dùng chung trong `app/api/_lib/`." Add a bullet: "Test trong `tests/` và script trong `scripts/` được dùng Supabase để chuẩn bị dữ liệu."

`.env.example`: add `SUPABASE_SECRET_KEY=` with comment `# Server only. Local value: npm run db:status (SECRET_KEY). Never prefix with NEXT_PUBLIC_.` Put the real local value in `.env.local`.

- [ ] **Step 3: Write the failing test `lib/auth/phone.test.ts`**

```ts
describe("normalizePhone", () => {
  it.each([
    ["0901234567", "84901234567"],
    ["0901 234 567", "84901234567"],
    ["090.123.4567", "84901234567"],
    ["+84901234567", "84901234567"],
    ["84901234567", "84901234567"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(["", "abc", "0123", "09012345678", "+1 555 0100"])("rejects %s", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});

it("builds the internal email", () => {
  expect(phoneToEmail("84901234567")).toBe("84901234567@nhanvien.local");
});
```

- [ ] **Step 4: Run** `npm test -- lib/auth/phone.test.ts` → FAIL (module not found).

- [ ] **Step 5: Implement `lib/auth/phone.ts`**

Strip spaces, dots, dashes, parentheses. `+84…` → `84…`; leading `0` → `84` + rest. Result must match `/^84\d{9}$/`, otherwise `null`.

- [ ] **Step 6: Run** `npm test` → PASS. Run `npm run lint` → no errors.

- [ ] **Step 7: Commit** `git add -A && git commit -m "chore: add vitest and phone helpers"`

---

### Task 2: Access schema — employees, branches, manager access

**Files:**
- Create: `supabase/migrations/<ts>_access.sql`, `supabase/tests/access.test.sql`

**Interfaces:**
- Produces (SQL):
  - Enums `public.employee_role` (`admin`, `director`, `manager`, `staff`), `public.manager_permission` (`shifts.view`, `shifts.review`, `shifts.edit`).
  - `public.employees(id uuid pk references auth.users on delete cascade, full_name text not null, phone text not null unique, role employee_role not null default 'staff', is_active boolean not null default true, end_date date, must_change_password boolean not null default true, created_at timestamptz not null default now())`.
  - `public.branches(id uuid pk default gen_random_uuid(), name text not null, address text not null default '', google_maps_url text, latitude double precision not null check (latitude between -90 and 90), longitude double precision not null check (longitude between -180 and 180), radius_m integer not null default 100 check (radius_m > 0), is_active boolean not null default true, created_at timestamptz not null default now())`.
  - `public.manager_branches(manager_id uuid references employees, branch_id uuid references branches, primary key both)`, `public.manager_permissions(manager_id uuid references employees, permission manager_permission, primary key both)`.
  - `private.current_employee_role() returns public.employee_role` — role of `auth.uid()` when active, else `null`.
  - `private.is_admin() returns boolean` — role in (`admin`, `director`) and active.
  - `private.has_branch_permission(p_branch_id uuid, p_permission public.manager_permission) returns boolean` — `is_admin()` OR (active manager assigned to the branch AND holding the permission).
  - `public.set_manager_access(p_manager_id uuid, p_branch_ids uuid[], p_permissions public.manager_permission[]) returns void`.
  - `public.mark_password_changed() returns void`.
  - Table `public.audit_logs(id bigint generated always as identity pk, actor_id uuid, action text not null, table_name text not null, row_id text not null, before jsonb, after jsonb, created_at timestamptz not null default now())` — no FK on `actor_id`.

**Rules the migration must implement:**

| Object | Policy / grant |
|---|---|
| `employees` | grant `select, insert, update` to authenticated. SELECT: `id = auth.uid()` or `is_admin()` or `current_employee_role() = 'manager'`. INSERT/UPDATE: `is_admin()`. |
| `branches` | grant `select, insert, update`. SELECT: `is_admin()` or (`is_active` and `current_employee_role() is not null`). INSERT/UPDATE: `is_admin()`. |
| `manager_branches`, `manager_permissions` | grant `select` only. SELECT: `is_admin()` or `manager_id = auth.uid()`. |
| `audit_logs` | grant `select` only. SELECT: `is_admin()` (Task 3 extends it for shifts). |
| `private` schema | `grant usage on schema private to authenticated`; grant execute on the three helpers to authenticated. |

`set_manager_access`: `SECURITY DEFINER`. Raise errcode `42501` unless `is_admin()`. Raise message `not_a_manager` (errcode `P0001`) when the target's role is not `manager`. Replace the target's rows in both tables. Insert one `audit_logs` row: action `manager_access.set`, table `employees`, `before`/`after` = `{"branch_ids": [...], "permissions": [...]}`.

`mark_password_changed`: `SECURITY DEFINER`; sets `must_change_password = false` for `auth.uid()`.

- [ ] **Step 1: Create the empty migration** `npx supabase migration new access`.

- [ ] **Step 2: Write `supabase/tests/access.test.sql`**

Set up as `postgres` inside the test transaction: insert `auth.users(id, email)` rows and matching `employees` for admin A, director D, manager M, staff S, inactive staff X; branches B1, B2 active and B3 inactive. Switch user with `set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', '<uuid>', 'role', 'authenticated')::text, true);` and back with `reset role;`.

Assertions (pgTAP):
- as S: `select count(*) from employees` = 1; `select count(*) from branches` = 2.
- as M: employees count = 5; as A: branches count = 3.
- as X: employees count = 0; `private.current_employee_role()` is null.
- as S: `insert into branches(...)` → `throws_ok(..., '42501')`.
- as anon (`set local role anon`): `select * from employees` → `throws_ok(..., '42501')`.
- as A: `set_manager_access(M, array[B2], array['shifts.review'])` → M's branch list = {B2}, permissions = {shifts.review}; one audit row with action `manager_access.set`.
- as M after that: `private.has_branch_permission(B2, 'shifts.review')` true; `(B1, 'shifts.review')` false; `(B2, 'shifts.view')` false.
- as A: `private.has_branch_permission(B1, 'shifts.edit')` true.
- as S: `set_manager_access(...)` → throws `42501`; as A on target S → throws `not_a_manager`.
- as S: `mark_password_changed()` → S's `must_change_password` is false.

- [ ] **Step 3: Run** `npm run db:reset && npm run test:db` → FAIL (relations and functions do not exist).

- [ ] **Step 4: Write the migration SQL** described above.

- [ ] **Step 5: Run** `npm run db:reset && npm run test:db` → all `access.test.sql` assertions PASS.

- [ ] **Step 6: Run** `npx supabase db advisors --local` → no security issues.

- [ ] **Step 7: Commit** `git commit -m "feat(db): employees, branches and manager access with RLS"`

---

### Task 3: Shift schema and attendance SQL functions

**Files:**
- Create: `supabase/migrations/<ts>_shifts.sql`, `supabase/tests/shifts.test.sql`

**Interfaces:**
- Consumes: Task 2 tables and `private` helpers.
- Produces (SQL):
  - Enums `public.shift_status` (`open`, `missing_checkout`, `pending_review`, `valid`, `rejected`), `public.shift_source` (`check_in`, `manual`).
  - `public.monthly_configs(month date pk check (extract(day from month) = 1), overtime_start time not null default '23:00', overtime_end time not null default '06:00', overtime_hourly_rate integer not null default 0 check (>= 0), max_shift_minutes integer not null default 960 check (> 0), updated_at timestamptz not null default now(), updated_by uuid)`.
  - `public.shifts(id uuid pk default gen_random_uuid(), employee_id uuid not null references employees, branch_id uuid not null references branches, work_date date not null, status shift_status not null, source shift_source not null, check_in_at timestamptz not null, check_in_latitude double precision, check_in_longitude double precision, check_in_accuracy_m double precision, check_in_distance_m double precision, check_in_photo_path text, check_out_at timestamptz, check_out_latitude …, check_out_longitude …, check_out_accuracy_m …, check_out_distance_m …, check_out_photo_path text, fail_reasons text[] not null default '{}' check (fail_reasons <@ array['outside_radius','location_unavailable','too_long']), reviewed_by uuid, reviewed_at timestamptz, created_by uuid not null, created_at timestamptz not null default now(), check (check_out_at is null or check_out_at > check_in_at))`.
  - `create unique index shifts_one_open_per_employee on public.shifts(employee_id) where status = 'open';` plus indexes on `(branch_id, work_date)` and `(employee_id, work_date)`.
  - `private.distance_m(lat1, lng1, lat2, lng2 double precision) returns double precision` — haversine, Earth radius 6371000 m.
  - `private.config_for_month(p_month date) returns public.monthly_configs` — returns the row for `p_month`; if missing, inserts a copy of the latest earlier month's values (or table defaults when none) and returns it.
  - `public.branches_by_distance(p_latitude double precision, p_longitude double precision) returns table(id uuid, name text, address text, google_maps_url text, latitude double precision, longitude double precision, radius_m integer, is_active boolean, distance_m double precision)` — `SECURITY INVOKER`, active branches visible to the caller, ordered by distance.
  - `public.check_in(p_branch_id uuid, p_latitude double precision, p_longitude double precision, p_accuracy_m double precision, p_photo_path text, p_start_new boolean default false) returns public.shifts`
  - `public.check_out(p_latitude double precision, p_longitude double precision, p_accuracy_m double precision, p_photo_path text) returns public.shifts`
  - `public.review_shift(p_shift_id uuid, p_decision text) returns public.shifts` — `p_decision` in (`approve`, `reject`).
  - `public.edit_shift_times(p_shift_id uuid, p_check_in_at timestamptz, p_check_out_at timestamptz) returns public.shifts`
  - `public.add_manual_shift(p_employee_id uuid, p_branch_id uuid, p_check_in_at timestamptz, p_check_out_at timestamptz) returns public.shifts`
  - Error messages (errcode `P0001`): `open_shift_exists`, `no_open_shift`, `invalid_photo`, `branch_not_found`, `invalid_status`, `invalid_times`, `overlap`. Permission failures use errcode `42501`.

**Grants and policies:** `shifts` — revoke all, grant `select` only; SELECT: `employee_id = auth.uid()` or `private.has_branch_permission(branch_id, 'shifts.view')`. `monthly_configs` — grant `select, insert, update`; SELECT: `current_employee_role() is not null`; INSERT/UPDATE: `is_admin()`. Extend `audit_logs` SELECT: `is_admin()` or (`table_name = 'shifts'` and `exists (select 1 from public.shifts s where s.id::text = row_id)`).

**Function rules** (all `SECURITY DEFINER` except `branches_by_distance`):

| Function | Rules |
|---|---|
| `check_in` | Caller must be an active employee (`42501`). `p_photo_path` must start with `auth.uid()::text \|\| '/'` (`invalid_photo`). Branch must exist and be active (`branch_not_found`). If the caller has an `open` shift: without `p_start_new` raise `open_shift_exists`; with it, set that shift to `missing_checkout` and audit `shift.abandoned`. Reasons: `location_unavailable` when latitude or longitude is null, else `outside_radius` when distance > `radius_m`. Insert `status = 'open'`, `source = 'check_in'`, `check_in_at = now()`, `work_date = (now() at time zone 'Asia/Ho_Chi_Minh')::date`, `created_by = auth.uid()`. A `unique_violation` on the open-shift index re-raises as `open_shift_exists`. |
| `check_out` | Caller's `open` shift (`no_open_shift`). Same photo-path rule. Add location reasons against the shift's branch. Add `too_long` when minutes between `check_in_at` and `now()` > `private.config_for_month(date_trunc('month', work_date)::date).max_shift_minutes`. `status = 'valid'` when `fail_reasons` is empty, else `pending_review`. |
| `review_shift` | Requires `has_branch_permission(branch, 'shifts.review')` and (shift owner ≠ caller or `is_admin()`) — else `42501`. `approve`: status must be `pending_review` and `check_out_at` not null, else `invalid_status`; sets `valid`. `reject`: any status except `rejected`, else `invalid_status`; sets `rejected`. Sets `reviewed_by`, `reviewed_at`. Audit `shift.approved` / `shift.rejected` with before/after rows. |
| `edit_shift_times` | Requires `shifts.edit` on the shift's branch and (owner ≠ caller or `is_admin()`). `p_check_out_at > p_check_in_at` else `invalid_times`. Overlap with another non-`rejected` shift of the same employee → `overlap`. Recompute `work_date` from `p_check_in_at` in VN time. Keep existing reasons; add `too_long` when the new duration exceeds the month's `max_shift_minutes`. Status: `rejected` stays `rejected`; otherwise `valid` when no reasons, else `pending_review`. Audit `shift.edited`. |
| `add_manual_shift` | Requires `shifts.edit` on `p_branch_id` and (employee ≠ caller or `is_admin()`). Same `invalid_times` and `overlap` rules. `source = 'manual'`, no photos, `created_by = auth.uid()`. Reasons: `too_long` only when over the max. Status `valid` or `pending_review` accordingly. Audit `shift.created_manually`. |

- [ ] **Step 1: Create the empty migration** `npx supabase migration new shifts`.

- [ ] **Step 2: Write `supabase/tests/shifts.test.sql`**

Fixtures: branch B1 at (10.7769, 106.7009) radius 100, branch B2 elsewhere; staff S, staff T, manager M with B1 + all three permissions, manager N with B1 + only `shifts.view`, admin A. Photo path for S: `'<S uuid>/a.jpg'`.

Assertions:
- S `check_in(B1, 10.7769, 106.7009, 10, '<S>/a.jpg')` → status `open`, `fail_reasons = '{}'`, `check_in_distance_m < 1`, `work_date = (now() at time zone 'Asia/Ho_Chi_Minh')::date`.
- second `check_in` without start_new → `throws_ok(..., 'open_shift_exists')`.
- `check_in(..., p_start_new => true)` → previous shift status `missing_checkout`; new shift `open`; audit row `shift.abandoned` exists.
- as postgres: inserting a second `open` row for S directly → `throws_ok(..., '23505')`.
- `check_in` with null latitude/longitude → `fail_reasons = '{location_unavailable}'`.
- `check_in(B1, 10.7814, 106.7009, …)` (≈500 m) → `fail_reasons = '{outside_radius}'`.
- photo path `'<T uuid>/a.jpg'` used by S → `invalid_photo`; inactive branch → `branch_not_found`.
- `check_out` at B1 coords → `valid`; at ≈500 m → `pending_review` with `outside_radius`; with no open shift → `no_open_shift`.
- open shift inserted by postgres with `check_in_at = now() - interval '17 hours'`, then `check_out` → `fail_reasons @> '{too_long}'`, status `pending_review`.
- M `review_shift(pending, 'approve')` → `valid`, `reviewed_by = M`; approve a `valid` shift → `invalid_status`; approve a shift without check out → `invalid_status`; reject a `valid` shift → `rejected`.
- N (view only) review → `42501`; M reviewing own shift → `42501`; M reviewing a B2 shift → `42501`; A reviewing A's own shift → allowed.
- M `edit_shift_times` on a `missing_checkout` shift with no reasons → `valid`; on a shift with `outside_radius` → stays `pending_review`; on `rejected` → stays `rejected`; 17-hour span → adds `too_long`; check out ≤ check in → `invalid_times`; overlapping another S shift → `overlap`.
- `edit_shift_times(…, '2026-11-01T00:30:00+07:00', '2026-11-01T03:00:00+07:00')` → `work_date = '2026-11-01'`; `'2026-10-31T23:59:00+07:00'` start → `work_date = '2026-10-31'`.
- M `add_manual_shift(S, B1, …)` → `source = 'manual'`, `valid`, photo paths null; overlap → `overlap`; M adding for M → `42501`.
- RLS: S sees only S's shifts; N sees B1 shifts and no B2 shifts; S `insert into shifts` → `42501`; S can read audit rows of S's shifts; T cannot.
- `branches_by_distance(10.7769, 106.7009)` → first row B1 with `distance_m < 1`.
- `config_for_month`: insert `monthly_configs('2026-09-01', max_shift_minutes 600)`; `private.config_for_month('2026-10-01')` returns `max_shift_minutes = 600` and a `2026-10-01` row now exists.

- [ ] **Step 3: Run** `npm run db:reset && npm run test:db` → `shifts.test.sql` FAILS.

- [ ] **Step 4: Write the migration SQL** described above.

- [ ] **Step 5: Run** `npm run db:reset && npm run test:db` → all assertions PASS.

- [ ] **Step 6: Run** `npx supabase db advisors --local` → no security issues.

- [ ] **Step 7: Commit** `git commit -m "feat(db): shifts, check in/out and review functions"`

---

### Task 4: Storage bucket for shift photos

**Files:**
- Create: `supabase/migrations/<ts>_shift_photos.sql`, `supabase/tests/shift_photos.test.sql`

**Interfaces:**
- Produces: private bucket `shift-photos` (`file_size_limit` 2097152, `allowed_mime_types` `{image/jpeg}`); object names `<employee uuid>/<uuid>.jpg`.

Policies on `storage.objects` for `authenticated`, all scoped to `bucket_id = 'shift-photos'`:
- INSERT: `(storage.foldername(name))[1] = auth.uid()::text`.
- SELECT: `exists (select 1 from public.shifts s where s.check_in_photo_path = name or s.check_out_photo_path = name)` — this inherits `shifts` RLS — OR the object is in the caller's own folder and not yet referenced by any shift.
- DELETE: own folder AND `not exists` a shift referencing `name`.

- [ ] **Step 1: Create the empty migration** `npx supabase migration new shift_photos`.

- [ ] **Step 2: Write `supabase/tests/shift_photos.test.sql`** — as S insert object `'<S>/x.jpg'` → ok; `'<T>/x.jpg'` → `42501`; after a shift of S references `'<S>/x.jpg'`: S selects it (1 row), N with `shifts.view` on that branch selects it (1 row), T selects 0 rows, S `delete` affects 0 rows.

- [ ] **Step 3: Run** `npm run db:reset && npm run test:db` → `shift_photos.test.sql` FAILS.

- [ ] **Step 4: Write the migration SQL** (insert into `storage.buckets` + the three policies).

- [ ] **Step 5: Run** `npm run db:reset && npm run test:db` → PASS.

- [ ] **Step 6: Commit** `git commit -m "feat(db): shift photo bucket and policies"`

---

### Task 5: Auth Route Handlers and test harness

**Files:**
- Create: `lib/supabase/admin.ts`, `app/api/_lib/auth.ts`, `app/api/_lib/errors.ts`, `app/api/_lib/mappers.ts`, `types/employee.ts`, `app/api/auth/login/route.ts`, `app/api/auth/logout/route.ts`, `app/api/auth/change-password/route.ts`, `app/api/me/route.ts`, `scripts/create-admin.mjs`, `tests/helpers/cookie-jar.ts`, `tests/helpers/fixtures.ts`, `tests/helpers/route.ts`, `app/api/auth/auth.test.ts`
- Modify: `tests/setup.ts`, `package.json` (script `admin:create`)

**Interfaces:**
- Consumes: `normalizePhone`, `phoneToEmail` (Task 1); tables and `mark_password_changed` (Task 2).
- Produces:
  - `createAdminClient()` in `lib/supabase/admin.ts` — `import "server-only"`, `createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } })`. Use only for `auth.admin.*`.
  - `types/employee.ts`: `EmployeeRole`, `ManagerPermission`, `Employee = { id: string; fullName: string; phone: string; role: EmployeeRole; isActive: boolean; endDate: string | null; mustChangePassword: boolean }`, `CurrentUser = Employee & { managerBranchIds: string[]; permissions: ManagerPermission[] }`.
  - `app/api/_lib/auth.ts`: `type AuthResult = { supabase: ServerClient; employee: Employee } | { response: Response }`; `requireEmployee(): Promise<AuthResult>` (401 `"Bạn cần đăng nhập."` when no claims, or employee missing / inactive); `requireAdmin(): Promise<AuthResult>` (403 when role not admin/director).
  - `app/api/_lib/errors.ts`: `dbErrorResponse(error: { code?: string; message: string }): Response` with the table below; `errorResponse(status: number, message: string): Response`.
  - `app/api/_lib/mappers.ts`: `toEmployee(row)`; later tasks add `toBranch`, `toShift`, `toAuditLog`.
  - Endpoints: `POST /api/auth/login {phone, password}` → 200 `{ ok: true }` / 400 invalid phone / 401 `"Số điện thoại hoặc mật khẩu không đúng."`; `POST /api/auth/logout` → 200; `POST /api/auth/change-password {password}` → 200 / 400 when length < 8 (`"Mật khẩu phải có ít nhất 8 ký tự."`); `GET /api/me` → 200 `CurrentUser`.
  - Test helpers: `createTestEmployee(opts?: { role?: EmployeeRole; password?: string; fullName?: string; isActive?: boolean }): Promise<{ id: string; phone: string; password: string }>` (random `84` phone), `createTestBranch(opts?: { latitude?: number; longitude?: number; radiusM?: number; isActive?: boolean }): Promise<{ id: string }>`, `grantManagerAccess(managerId, branchIds, permissions)`, `cleanupFixtures(): Promise<void>` (deletes created shifts, storage objects, manager rows, employees, branches, auth users), `signInAs(user: { phone: string; password: string }): Promise<void>`, `signOut(): void`, `callRoute(handler, init: { method?: string; url?: string; json?: unknown; formData?: FormData; params?: Record<string, string> }): Promise<Response>`.
  - `tests/setup.ts`: `vi.mock("next/headers", () => ({ cookies: async () => cookieJar }))`.
  - `npm run admin:create -- <phone> <password> "<full name>"` → `node --env-file=.env.local scripts/create-admin.mjs`.

**Error mapping (`dbErrorResponse`):**

| Code / message | Status | Message |
|---|---|---|
| `42501` | 403 | Bạn không có quyền thực hiện thao tác này. |
| `open_shift_exists` | 409 | Bạn đang có một ca chưa check out. |
| `no_open_shift` | 409 | Bạn chưa check in. |
| `invalid_photo` | 400 | Ảnh không hợp lệ. |
| `branch_not_found` | 404 | Không tìm thấy chi nhánh. |
| `invalid_status` | 409 | Trạng thái của ca không cho phép thao tác này. |
| `invalid_times` | 400 | Giờ check out phải sau giờ check in. |
| `overlap` | 409 | Ca này trùng giờ với một ca khác của nhân viên. |
| `not_a_manager` | 400 | Nhân viên này không có vai trò quản lý. |
| other | 500 | Có lỗi xảy ra. Bạn thử lại sau. (and `console.error(error)`) |

- [ ] **Step 1: Write `app/api/auth/auth.test.ts`**

```ts
it("logs in with any phone format", async () => {
  const user = await createTestEmployee({ password: "Init1234" });
  const local = "0" + user.phone.slice(2);
  const res = await callRoute(loginPOST, { method: "POST", json: { phone: local.replace(/(\d{4})(\d{3})/, "$1 $2 "), password: "Init1234" } });
  expect(res.status).toBe(200);
  expect(cookieJar.getAll().some((c) => c.name.startsWith("sb-"))).toBe(true);
});
it("rejects a wrong password with 401", …);            // body.error === "Số điện thoại hoặc mật khẩu không đúng."
it("returns the current user", …);                     // GET /api/me → role, mustChangePassword true, managerBranchIds [], permissions []
it("returns 401 without a session", …);                // signOut(); GET /api/me → 401
it("returns 401 for a locked employee with a valid session", …); // signInAs, then admin sets is_active=false; GET /api/me → 401
it("changes the password and clears the flag", …);    // POST change-password {password:"NewPass123"} → 200; /api/me mustChangePassword false
it("rejects a short password", …);                     // {password:"short"} → 400
```
`afterAll(cleanupFixtures)`.

- [ ] **Step 2: Run** `npm test -- app/api/auth` → FAIL (handlers missing).

- [ ] **Step 3: Implement the helpers, handlers and test harness listed above.** `/api/me` reads `employees` for the caller plus own rows of `manager_branches` and `manager_permissions`. `change-password` calls `supabase.auth.updateUser({ password })` then `rpc("mark_password_changed")`. `create-admin.mjs` creates the Auth user with `email_confirm: true` and inserts the `employees` row with role `admin` and `must_change_password = false`, using the secret key.

- [ ] **Step 4: Run** `npm test` → PASS. `npm run lint` → clean.

- [ ] **Step 5: Commit** `git commit -m "feat(api): phone login, current user and password change"`

---

### Task 6: Login page, app shell, data hooks

**Files:**
- Create: `hooks/use-mutation.ts`, `components/ui/error-message.tsx`, `components/ui/loading.tsx`, `components/auth/login-form.tsx`, `components/auth/change-password-form.tsx`, `components/layout/app-shell.tsx`, `components/layout/app-nav.tsx`, `app/login/page.tsx`, `app/(app)/layout.tsx`
- Modify: `hooks/use-fetch.ts` (add `reload`), `lib/supabase/proxy.ts` (redirect), `app/page.tsx` (redirect to `/check-in`), `app/layout.tsx` (`lang="vi"`, title)

**Interfaces:**
- Consumes: Task 5 endpoints, `CurrentUser`.
- Produces:
  - `useFetch<T>(url: string | null)` returns `{ data: T | null; error: string | null; isLoading: boolean; reload: () => void }`. `url = null` skips the request. Key the stored result by `url` + a reload counter.
  - `useMutation<TResult = unknown>()` returns `{ mutate: (url: string, options: { method: "POST" | "PATCH" | "PUT" | "DELETE"; body?: unknown }) => Promise<TResult>; isPending: boolean; error: string | null }`. `FormData` bodies pass through; other bodies are JSON. Non-2xx throws `Error(body.error)` and sets `error`.
  - `<ErrorMessage message={string} />` (`role="alert"`), `<Loading label={string} />` (`role="status"`).
  - `<AppShell>`: fetches `/api/me`; renders `<ChangePasswordForm />` instead of children when `mustChangePassword`; otherwise `<AppNav user={…} />` + children. Nav items: everyone → "Check in" `/check-in`, "Ca của tôi" `/my-shifts`; `permissions` includes `shifts.view` or admin/director → "Quản lý ca" `/manage/shifts`; admin/director → "Nhân viên" `/admin/employees`, "Chi nhánh" `/admin/branches`; "Đăng xuất" button.
  - Proxy: no claims and path not `/login` and not `/api/*` → redirect to `/login`.

- [ ] **Step 1: Implement the files above.** `LoginForm`: labelled inputs "Số điện thoại" (`inputMode="tel"`, `autoComplete="username"`) and "Mật khẩu" (`autoComplete="current-password"`), submit "Đăng nhập", on success `router.replace("/")`. `ChangePasswordForm`: "Mật khẩu mới", "Nhập lại mật khẩu mới"; mismatch shows "Hai mật khẩu không khớp." without a request; on success `reload()` the shell's `/api/me`.

- [ ] **Step 2: Verify**

Run: `npm run lint && npx tsc --noEmit && npm run build` → no errors.
Run: `npm run admin:create -- 0900000001 Admin1234 "Admin"`, `npm run dev`. In Chrome: `/check-in` without session redirects to `/login`; login with `0900 000 001` / `Admin1234` lands on `/check-in` with admin nav; "Đăng xuất" returns to `/login`. Keyboard: Tab reaches every input and button with a visible focus ring.

- [ ] **Step 3: Commit** `git commit -m "feat(ui): login, app shell and data hooks"`

---

### Task 7: Employee admin API

**Files:**
- Create: `app/api/admin/employees/route.ts`, `app/api/admin/employees/[id]/route.ts`, `app/api/admin/employees/[id]/reset-password/route.ts`, `app/api/admin/employees/employees.test.ts`
- Modify: `app/api/_lib/mappers.ts`

**Interfaces:**
- Consumes: `requireAdmin`, `createAdminClient`, `normalizePhone`, `phoneToEmail`, `toEmployee`.
- Produces:
  - `GET /api/admin/employees` → `Employee[]` ordered by `full_name`.
  - `POST /api/admin/employees {fullName, phone, role, password}` → 201 `Employee`. Creates the Auth user (`email_confirm: true`), then inserts `employees` with the session client; deletes the Auth user if the insert fails. 400 invalid phone / password < 8 / empty name; 409 `"Số điện thoại đã được dùng."` when the normalized phone exists.
  - `PATCH /api/admin/employees/[id] {fullName?, phone?, role?, isActive?, endDate?}` → 200 `Employee`. Phone change updates the Auth email. `isActive: false` bans the Auth user; `true` unbans and clears nothing else.
  - `POST /api/admin/employees/[id]/reset-password {password}` → 200; sets `must_change_password = true`.

- [ ] **Step 1: Write `employees.test.ts`**

```ts
it("forbids staff", …);                                   // staff session → GET 403
it("creates an employee who can log in", …);              // admin POST {fullName:"Nguyễn Văn A", phone:"0912 345 678", role:"staff", password:"Init1234"} → 201, phone "84912345678"; login → 200
it.each(["0912345678", "+84912345678", "84912345678"])("rejects duplicate phone %s", …); // → 409, body.error "Số điện thoại đã được dùng."
it("locks and unlocks an employee", …);                   // PATCH {isActive:false, endDate:"2026-10-31"} → login 401; PATCH {isActive:true} → login 200
it("changes the phone used to log in", …);                // PATCH {phone:"0987654321"} → login with new phone 200, old phone 401
it("resets the password", …);                             // POST reset-password {password:"Reset1234"} → login with it 200; /api/me mustChangePassword true
```

- [ ] **Step 2: Run** `npm test -- app/api/admin/employees` → FAIL.

- [ ] **Step 3: Implement the three route files.**

- [ ] **Step 4: Run** `npm test` → PASS.

- [ ] **Step 5: Commit** `git commit -m "feat(api): employee administration"`

---

### Task 8: Employee admin UI

**Files:**
- Create: `components/employees/employee-list.tsx`, `components/employees/employee-form.tsx`, `components/employees/reset-password-form.tsx`, `app/(app)/admin/employees/page.tsx`, `app/(app)/admin/employees/new/page.tsx`, `app/(app)/admin/employees/[id]/page.tsx`
- Create: `lib/employees/labels.ts` (`ROLE_LABELS: Record<EmployeeRole, string>` = Admin / Giám đốc / Quản lý / Nhân viên)

**Interfaces:**
- Consumes: Task 7 endpoints, `useFetch`, `useMutation`.
- Produces: `<EmployeeForm employee?: Employee onSaved: (e: Employee) => void />` (create when `employee` is undefined; create mode shows "Mật khẩu ban đầu"). The `[id]` page renders `EmployeeForm`, a lock/unlock button with "Ngày nghỉ việc" date input, `ResetPasswordForm`, and — when role is `manager` — the slot where Task 11 mounts `ManagerAccessForm`.

- [ ] **Step 1: Implement.** List columns: Họ tên, Số điện thoại (displayed as `0` + last 9 digits), Vai trò, Trạng thái ("Đang làm" / "Đã khoá"). Row links to `/admin/employees/[id]`. "Thêm nhân viên" links to `/new`.

- [ ] **Step 2: Verify** `npm run lint && npx tsc --noEmit && npm run build`. In Chrome as admin: create "Nguyễn Văn A" / `0912345678` / staff; log out; log in as that user → forced to change password → lands on `/check-in` with staff nav only. As admin lock the user → the user's next page load goes to an error state and login fails.

- [ ] **Step 3: Commit** `git commit -m "feat(ui): employee administration"`

---

### Task 9: Branch API and Google Maps link parsing

**Files:**
- Create: `lib/branches/google-maps.ts`, `lib/branches/google-maps.test.ts`, `types/branch.ts`, `app/api/branches/route.ts`, `app/api/admin/branches/route.ts`, `app/api/admin/branches/[id]/route.ts`, `app/api/admin/branches/resolve-map-link/route.ts`, `app/api/branches/branches.test.ts`
- Modify: `app/api/_lib/mappers.ts` (`toBranch`)

**Interfaces:**
- Produces:
  - `types/branch.ts`: `Branch = { id: string; name: string; address: string; googleMapsUrl: string | null; latitude: number; longitude: number; radiusM: number; isActive: boolean }`, `BranchWithDistance = Branch & { distanceM: number }`.
  - `parseGoogleMapsCoordinates(url: string): { latitude: number; longitude: number } | null`. Accept hosts `google.com`, `www.google.com`, `google.com.vn`, `www.google.com.vn`, `maps.google.com`, `maps.google.com.vn`. Pattern priority: `!3d<lat>!4d<lng>` → `@<lat>,<lng>` → query `q` / `query` / `ll` = `<lat>,<lng>` → path `/search/<lat>,+?<lng>`. Reject out-of-range values.
  - `resolveGoogleMapsUrl(url: string, fetchImpl: typeof fetch = fetch): Promise<string>` — for hosts `maps.app.goo.gl` and `goo.gl`, `fetchImpl(url, { redirect: "follow" })` and return `response.url`; other URLs return unchanged. Throw `Error("invalid_map_link")` for non-Google hosts.
  - `GET /api/branches?lat=&lng=` → active `BranchWithDistance[]` sorted by distance (via `rpc("branches_by_distance")`); without lat/lng → `Branch[]` by name. Any active employee.
  - `GET /api/admin/branches` → all `Branch[]` incl. inactive. `POST /api/admin/branches {name, address, googleMapsUrl, latitude, longitude, radiusM}` → 201. `PATCH /api/admin/branches/[id]` (same fields + `isActive`) → 200.
  - `POST /api/admin/branches/resolve-map-link {url}` → 200 `{ latitude, longitude, resolvedUrl }` / 400 `"Link không có toạ độ. Bạn mở Google Maps, chọn đúng quán, bấm Chia sẻ rồi copy link."`

- [ ] **Step 1: Write `google-maps.test.ts`**

```ts
it("prefers the pin over the viewport", () => {
  expect(parseGoogleMapsCoordinates(
    "https://www.google.com/maps/place/Ben+Thanh/@10.7720,106.6980,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d10.772463!4d106.698017"
  )).toEqual({ latitude: 10.772463, longitude: 106.698017 });
});
it.each([
  ["https://www.google.com/maps/@10.7769,106.7009,15z", 10.7769, 106.7009],
  ["https://maps.google.com/?q=10.7769,106.7009", 10.7769, 106.7009],
  ["https://www.google.com/maps/search/10.7769,+106.7009", 10.7769, 106.7009],
  ["https://www.google.com.vn/maps/@-33.8688,151.2093,12z", -33.8688, 151.2093],
])("parses %s", …);
it.each([
  "https://www.google.com/maps/place/Ben+Thanh",
  "https://example.com/maps/@10.7,106.7,15z",
  "https://www.google.com/maps/@95.0,106.7,15z",
  "not a url",
])("returns null for %s", …);
it("follows a short link", async () => {
  const fake = vi.fn(async () => ({ url: "https://www.google.com/maps/place/X/@1,2,3z" }) as Response);
  await expect(resolveGoogleMapsUrl("https://maps.app.goo.gl/abc", fake)).resolves.toBe("https://www.google.com/maps/place/X/@1,2,3z");
});
it("rejects non-Google hosts", …); // rejects.toThrow("invalid_map_link")
```

- [ ] **Step 2: Write `branches.test.ts`** — staff GET `?lat=10.7769&lng=106.7009` → first item is the fixture branch at those coords with `distanceM < 1`; staff POST admin route → 403; admin POST → 201 then GET admin list includes it; `resolve-map-link` with the long URL above → `{ latitude: 10.772463, longitude: 106.698017 }`; with a short link and `vi.spyOn(globalThis, "fetch")` resolving to `{ url: <long URL> }` → same coordinates; with `"https://www.google.com/maps/place/Ben+Thanh"` → 400 with the message above.

- [ ] **Step 3: Run** `npm test -- lib/branches app/api/branches` → FAIL.

- [ ] **Step 4: Implement.**

- [ ] **Step 5: Run** `npm test` → PASS.

- [ ] **Step 6: Commit** `git commit -m "feat(api): branches and Google Maps coordinates"`

---

### Task 10: Branch admin UI

**Files:**
- Create: `components/branches/branch-list.tsx`, `components/branches/branch-form.tsx`, `app/(app)/admin/branches/page.tsx`, `app/(app)/admin/branches/new/page.tsx`, `app/(app)/admin/branches/[id]/page.tsx`

**Interfaces:**
- Consumes: Task 9 endpoints.
- Produces: `<BranchForm branch?: Branch onSaved: (b: Branch) => void />` matching the spec's form (section 6.1): Tên, Địa chỉ, Link Google Maps + button "Lấy toạ độ từ link", read-only toạ độ with an "Nhập toạ độ bằng tay" toggle that reveals Vĩ độ / Kinh độ inputs, Bán kính (m, default 100), "Đang hoạt động" checkbox in edit mode, "Lưu". "Lưu" is disabled until coordinates exist.

- [ ] **Step 1: Implement.** List shows Tên, Địa chỉ, Bán kính, Trạng thái, and a link "Mở bản đồ" to `https://www.google.com/maps?q=<lat>,<lng>`.

- [ ] **Step 2: Verify** lint, typecheck, build. In Chrome as admin: paste a real Google Maps share link for any address → coordinates appear → save → list shows the branch; "Mở bản đồ" opens the same place.

- [ ] **Step 3: Commit** `git commit -m "feat(ui): branch administration"`

---

### Task 11: Manager access API and form

**Files:**
- Create: `app/api/admin/managers/[id]/access/route.ts`, `app/api/admin/managers/managers.test.ts`, `components/managers/manager-access-form.tsx`, `lib/employees/permission-labels.ts`
- Modify: `app/(app)/admin/employees/[id]/page.tsx` (mount the form for managers)

**Interfaces:**
- Produces: `GET /api/admin/managers/[id]/access` → `{ branchIds: string[]; permissions: ManagerPermission[] }`; `PUT` same body → 200 via `rpc("set_manager_access")`. `PERMISSION_LABELS`: `shifts.view` "Xem ca", `shifts.review` "Duyệt và từ chối ca", `shifts.edit` "Sửa ca và thêm ca bằng tay". `<ManagerAccessForm managerId: string />` — branch checkboxes and permission checkboxes in two `fieldset`s with `legend`s.

- [ ] **Step 1: Write `managers.test.ts`** — admin PUT `{branchIds:[B1], permissions:["shifts.view","shifts.review"]}` → 200; GET returns the same; the manager's `/api/me` shows them; staff PUT → 403; PUT on a staff target → 400 `"Nhân viên này không có vai trò quản lý."`.

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** `npm test` → PASS.

- [ ] **Step 5: Verify UI** in Chrome: set an employee's role to "Quản lý", tick a branch and "Xem ca", save, log in as that manager → nav shows "Quản lý ca".

- [ ] **Step 6: Commit** `git commit -m "feat: manager branch access and permissions"`

---

### Task 12: Attendance API

**Files:**
- Create: `types/shift.ts`, `lib/date.ts`, `lib/date.test.ts`, `app/api/attendance/current/route.ts`, `app/api/attendance/check-in/route.ts`, `app/api/attendance/check-out/route.ts`, `app/api/shifts/mine/route.ts`, `app/api/attendance/attendance.test.ts`
- Modify: `app/api/_lib/mappers.ts` (`toShift`)

**Interfaces:**
- Consumes: Task 3 functions, Task 4 bucket, `requireEmployee`.
- Produces:
  - `types/shift.ts`: `ShiftStatus`, `FailReason`, `Shift = { id: string; employeeId: string; employeeName: string; branchId: string; branchName: string; workDate: string; status: ShiftStatus; source: "check_in" | "manual"; checkInAt: string; checkOutAt: string | null; checkInDistanceM: number | null; checkInAccuracyM: number | null; checkOutDistanceM: number | null; checkOutAccuracyM: number | null; checkInLatitude: number | null; checkInLongitude: number | null; checkOutLatitude: number | null; checkOutLongitude: number | null; failReasons: FailReason[]; checkInPhotoUrl: string | null; checkOutPhotoUrl: string | null }`. Photo URLs are signed URLs (300 s) or `null`.
  - `lib/date.ts`: `monthRange(month: string): { from: string; to: string } | null`, `currentMonth(now?: Date): string` (VN time), `toVietnamIso(localDateTime: string): string`, `toVietnamLocalInput(iso: string): string`, `formatDateTime(iso: string): string`, `formatDuration(minutes: number): string`.
  - `POST /api/attendance/check-in` multipart: `photo` (File), `branchId`, `latitude?`, `longitude?`, `accuracyM?`, `startNew?` (`"true"`). Validates photo: `type === "image/jpeg"`, size 1 B–2 MB, else 400 `"Ảnh phải là ảnh JPEG chụp từ camera, tối đa 2 MB."`. Uploads to `shift-photos/<uid>/<randomUUID>.jpg`, calls `rpc("check_in")`; on any rpc error removes the uploaded object, then `dbErrorResponse`. 409 `open_shift_exists` body adds `openShift: Shift`. 201 `Shift`.
  - `POST /api/attendance/check-out` multipart: `photo`, `latitude?`, `longitude?`, `accuracyM?` → 200 `Shift`; same photo and cleanup rules.
  - `GET /api/attendance/current` → `{ shift: Shift | null }` (caller's `open` shift).
  - `GET /api/shifts/mine?month=YYYY-MM` → caller's `Shift[]` in that month by `work_date`, newest first; default month `currentMonth()`; 400 for a bad month.

- [ ] **Step 1: Write `lib/date.test.ts`**

```ts
expect(monthRange("2026-10")).toEqual({ from: "2026-10-01", to: "2026-11-01" });
expect(monthRange("2026-12")).toEqual({ from: "2026-12-01", to: "2027-01-01" });
expect(monthRange("2026-13")).toBeNull();
expect(currentMonth(new Date("2026-10-31T17:30:00Z"))).toBe("2026-11");
expect(toVietnamIso("2026-10-25T08:30")).toBe("2026-10-25T08:30:00+07:00");
expect(toVietnamLocalInput("2026-10-25T01:30:00Z")).toBe("2026-10-25T08:30");
expect(formatDuration(330)).toBe("5 giờ 30 phút");
expect(formatDuration(45)).toBe("45 phút");
```

- [ ] **Step 2: Write `attendance.test.ts`** (JPEG fixture: `new File([Uint8Array.from([0xff, 0xd8, 0xff, 0xd9])], "a.jpg", { type: "image/jpeg" })`)
  - check-in at the branch coords → 201, `status "open"`, `failReasons []`, `checkInPhotoUrl` starts with `http`.
  - second check-in → 409, `body.openShift.id` equals the first shift; with `startNew=true` → 201 and the first shift is `missing_checkout` in `/api/shifts/mine`.
  - two parallel check-ins (`Promise.all`) for a fresh employee → statuses sorted equal `[201, 409]`.
  - check-in without latitude/longitude → 201 with `failReasons ["location_unavailable"]`.
  - PNG file, empty file, 2 MB + 1 B file → 400 with the photo message; the employee's Storage folder stays empty (`admin.storage.from("shift-photos").list(uid)` length 0).
  - check-in at an inactive branch → 404 and the folder stays empty.
  - check-out at the branch → 200 `status "valid"`; check-out again → 409 `"Bạn chưa check in."`.
  - `GET current` → `{ shift: null }` after check-out; `GET mine?month=bad` → 400.

- [ ] **Step 3: Run** `npm test -- lib/date app/api/attendance` → FAIL. **Step 4: Implement.** **Step 5: Run** `npm test` → PASS.

- [ ] **Step 6: Commit** `git commit -m "feat(api): check in and check out with photo"`

---

### Task 13: Check-in screen and "Ca của tôi"

**Files:**
- Create: `lib/shifts/labels.ts`, `components/attendance/check-in-panel.tsx`, `components/attendance/camera-capture.tsx`, `components/attendance/branch-picker.tsx`, `components/attendance/my-shift-list.tsx`, `components/ui/month-picker.tsx`, `app/(app)/check-in/page.tsx`, `app/(app)/my-shifts/page.tsx`

**Interfaces:**
- Consumes: Task 12 endpoints, `GET /api/branches?lat&lng`, `useFetch`, `useMutation`, `lib/date.ts`.
- Produces:
  - `STATUS_LABELS: Record<ShiftStatus, string>` = Đang làm / Thiếu check out / Chờ duyệt / Hợp lệ / Từ chối. `FAIL_REASON_LABELS: Record<FailReason, string>` = Ngoài bán kính chi nhánh / Không lấy được vị trí / Ca dài hơn thời lượng tối đa.
  - `<CameraCapture onCapture: (photo: Blob) => void />` — `getUserMedia({ video: { facingMode: "user" }, audio: false })` in a `useEffect` that stops all tracks on cleanup; `<video>` preview; "Chụp ảnh" draws to a canvas (max width 720 px) and `toBlob("image/jpeg", 0.8)`; "Chụp lại". No file input anywhere. Camera denied → `ErrorMessage` "Bạn cần cho phép dùng camera để check in."
  - `<BranchPicker branches: Array<Branch | BranchWithDistance> value: string onChange />` — labelled `select`; options "Tên — 35 m" when `distanceM` exists, otherwise "Tên". Without coordinates the panel loads `/api/branches` (sorted by name) and preselects nothing, so the employee must choose.
  - `<MonthPicker value: string onChange />` — labelled `input type="month"`.
  - `<CheckInPanel />` flow: load `/api/attendance/current`. Primary button "Check in" (or "Check out" when a shift is open, showing branch and check-in time). Pressing it calls `navigator.geolocation.getCurrentPosition` with `{ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }` from the click handler. On error or timeout continue without coordinates and show "Không lấy được vị trí. Ca sẽ chờ quản lý duyệt." For check in, fetch nearby branches and preselect the first. Then show the camera; "Xác nhận check in/out" submits `FormData`. Result in a `role="status"` region: "Đã check in lúc 08:02." or "Đã check in lúc 08:02, chờ quản lý duyệt: Ngoài bán kính chi nhánh." When a shift is open, a secondary button "Quên check out ca trước, bắt đầu ca mới" runs the check-in flow with `startNew=true`.
  - `<MyShiftList />` — `MonthPicker` + table: Ngày, Chi nhánh, Giờ vào, Giờ ra, Thời lượng, Trạng thái, Lý do.

- [ ] **Step 1: Implement.**

- [ ] **Step 2: Verify** lint, typecheck, build. In Chrome on `localhost` (camera and location allowed only there or on HTTPS), with Chrome DevTools Sensors set to the branch coordinates: check in → "Đã check in lúc …"; reload → "Check out" shown; check out → "Hợp lệ" row in `/my-shifts`. Set DevTools location to 1 km away → check in → "chờ quản lý duyệt: Ngoài bán kính chi nhánh". Block the location permission → check in still succeeds with "Không lấy được vị trí". Check every control works with the keyboard.

- [ ] **Step 3: Commit** `git commit -m "feat(ui): check in screen and my shifts"`

---

### Task 14: Shift management API

**Files:**
- Create: `app/api/shifts/route.ts`, `app/api/shifts/[id]/route.ts`, `app/api/shifts/[id]/review/route.ts`, `app/api/employees/route.ts`, `app/api/shifts/shifts.test.ts`
- Modify: `app/api/_lib/mappers.ts` (`toAuditLog`), `types/shift.ts` (`AuditLog`)

**Interfaces:**
- Consumes: Task 3 functions, `toShift`, `requireEmployee`, `monthRange`.
- Produces:
  - `AuditLog = { id: number; actorName: string | null; action: string; createdAt: string; before: unknown; after: unknown }`.
  - `GET /api/shifts?month=YYYY-MM&branchId=&status=` → `Shift[]` visible under RLS, excluding the caller's own shifts unless admin, ordered by `check_in_at` desc, with signed photo URLs (`createSignedUrls`, 300 s).
  - `GET /api/shifts/[id]` → `{ shift: Shift; auditLogs: AuditLog[] }`; 404 when not visible.
  - `POST /api/shifts/[id]/review {decision: "approve" | "reject"}` → 200 `Shift`.
  - `PATCH /api/shifts/[id] {checkInAt, checkOutAt}` (ISO with offset) → 200 `Shift`.
  - `POST /api/shifts {employeeId, branchId, checkInAt, checkOutAt}` → 201 `Shift`.
  - `GET /api/employees` → `{ id, fullName }[]` of active employees, for the manual-shift form (any caller allowed by `employees` RLS: admins and managers).

- [ ] **Step 1: Write `shifts.test.ts`** — fixtures: branches B1, B2; staff S with one `pending_review` shift at B1 (check in far away, check out) and one shift at B2; manager M on B1 with all permissions; manager N on B1 with `shifts.view` only.
  - M `GET /api/shifts?month=<current>` → contains the B1 shift only; `checkInPhotoUrl` starts with `http`; filter `status=pending_review` keeps it, `status=valid` drops it.
  - M `GET /api/shifts/[id]` → `auditLogs` is an array; S's B2 shift id → 404 for M.
  - M approve → 200 `status "valid"`; approve again → 409 `"Trạng thái của ca không cho phép thao tác này."`; N approve → 403.
  - M PATCH with `checkOutAt` before `checkInAt` → 400 `"Giờ check out phải sau giờ check in."`.
  - M POST manual shift for S overlapping the existing one → 409 `"Ca này trùng giờ với một ca khác của nhân viên."`; non-overlapping → 201 `source "manual"`.
  - M `GET /api/employees` → includes S; S `GET /api/employees` → only S.

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** `npm test` → PASS.

- [ ] **Step 5: Commit** `git commit -m "feat(api): shift review, editing and manual shifts"`

---

### Task 15: Shift management UI

**Files:**
- Create: `components/shifts/shift-board.tsx`, `components/shifts/shift-filters.tsx`, `components/shifts/shift-detail.tsx`, `components/shifts/shift-actions.tsx`, `components/shifts/shift-time-form.tsx`, `components/shifts/manual-shift-form.tsx`, `components/ui/status-badge.tsx`, `app/(app)/manage/shifts/page.tsx`, `app/(app)/manage/shifts/[id]/page.tsx`, `app/(app)/manage/shifts/new/page.tsx`

**Interfaces:**
- Consumes: Task 14 endpoints, `/api/me` permissions, `lib/date.ts`, `lib/shifts/labels.ts`.
- Produces:
  - `<StatusBadge status: ShiftStatus />` — text label plus colour; meaning never relies on colour alone.
  - `<ShiftBoard />` — `ShiftFilters` (MonthPicker, branch `select` from `me.managerBranchIds` or all branches for admin, status `select`) + table: ảnh check in (thumbnail `img` 48 px, `alt="Ảnh check in của <tên>"`), Nhân viên, Chi nhánh, Ngày, Giờ vào, Giờ ra, Trạng thái, Lý do. Row links to detail. "Thêm ca bằng tay" link when the user has `shifts.edit` or is admin.
  - `<ShiftDetail shiftId />` — large photos, distance and accuracy ("Cách chi nhánh 35 m, sai số 12 m"), link "Mở vị trí trên Google Maps" for each lat/lng, audit list; mounts `<ShiftActions>` ("Duyệt" for `pending_review`, "Từ chối" for any status except `rejected`; shown only with `shifts.review` or admin, hidden on the caller's own shift) and `<ShiftTimeForm>` (`datetime-local` inputs converted with `toVietnamIso`; shown with `shifts.edit` or admin). After each action call `reload()`.
  - `<ManualShiftForm />` — employee `select` from `/api/employees`, branch `select`, two `datetime-local` inputs, submit "Thêm ca".

- [ ] **Step 1: Implement.**

- [ ] **Step 2: Verify** lint, typecheck, build. In Chrome: as staff, check in from 1 km away and check out. As a manager with all permissions on that branch: the shift shows "Chờ duyệt" with a thumbnail; open detail → photos, distance, Google Maps link; "Duyệt" → "Hợp lệ" and an audit entry appears. Edit times of another shift → saved. Add a manual shift → listed with source "Nhập tay". Log in as a manager with only "Xem ca" → no "Duyệt", no time form.

- [ ] **Step 3: Run the full suite** `npm test && npm run test:db && npm run lint && npm run build` → all pass.

- [ ] **Step 4: Commit** `git commit -m "feat(ui): shift management for managers"`
