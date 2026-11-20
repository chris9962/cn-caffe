# Quy tắc cấu trúc code

File này chép 4 nguyên tắc trong `AGENTS.md` và thêm các điểm riêng của Next.js 16 trong project. Khi `AGENTS.md` đổi, bạn cập nhật file này theo.

## Mục lục

1. Truy vấn database chỉ nằm trong Route Handler
2. Component chia nhỏ để dùng lại
3. Logic dùng chung viết thành hook
4. Code đơn giản
5. Cấu trúc thư mục và trang mẫu
6. Next.js 16 trong project
7. Tài liệu Next.js 16 cần đọc

## 1. Truy vấn database chỉ nằm trong Route Handler

- Mọi truy vấn Supabase phải nằm trong `app/api/`: Route Handler `route.ts` và helper trong `app/api/_lib/`. Truy vấn gồm `.from()`, `.rpc()`, `.storage` và `.auth`.
- Test trong `tests/` và script trong `scripts/` được dùng Supabase để chuẩn bị dữ liệu.
- Page, layout, component, hook và Server Action không được import `@/lib/supabase/*` hoặc `@supabase/*`. ESLint báo lỗi khi gặp các import này.
- Route Handler gọi `createClient()` từ `@/lib/supabase/server` trong từng request. Route Handler không được lưu client vào biến toàn cục.
- Khi thành công, Route Handler trả JSON chứa dữ liệu.
- Khi lỗi, Route Handler ghi lỗi gốc bằng `console.error`, rồi trả `{ error: string }` với status 4xx hoặc 5xx. Câu `error` viết bằng tiếng Việt, vì FE hiện nguyên câu này cho người dùng.
- Route Handler không được trả thông báo lỗi gốc của database cho client.
- Project không có Supabase client trên trình duyệt. Đăng nhập và đăng xuất cũng đi qua Route Handler.
- Secret key và `service_role` key chỉ dùng trong Route Handler. Biến môi trường chứa các key này không được có tiền tố `NEXT_PUBLIC_`.
- Mỗi bảng mới trong schema `public` phải có `grant`, RLS và policy trong migration.

## 2. Component chia nhỏ để dùng lại

- Component nằm trong `components/<feature>/`. Component dùng chung nằm trong `components/ui/`.
- `page.tsx` và `layout.tsx` chỉ ghép component. Logic và markup dài nằm trong component.
- Một component làm một việc.
- Bạn tách component khi một phần UI dùng ở 2 nơi trở lên, hoặc khi component chứa nhiều phần độc lập.
- Không tách phần JSX chỉ có 1–2 dòng thành component riêng.
- Tên file dùng kebab-case, ví dụ `branch-form.tsx`. Tên component dùng PascalCase, ví dụ `BranchForm`.
- Component dùng named export. Chỉ file đặc biệt của Next.js như `page.tsx` và `layout.tsx` dùng default export.
- Chỉ component cần state, event handler hoặc hook mới có `"use client"`. Bạn đặt `"use client"` ở component nhỏ nhất cần nó.
- Component phải đạt WCAG AA: HTML ngữ nghĩa, input có `label`, ảnh có `alt`, icon button có `aria-label`, dùng được bằng bàn phím.

## 3. Logic dùng chung viết thành hook

- Logic dùng ở 2 component trở lên phải nằm trong `hooks/use-<tên>.ts`, hàm tên `use<Tên>`.
- Component lấy dữ liệu bằng `useFetch` trong `hooks/use-fetch.ts`. Hook này trả `data`, `error`, `isLoading`, `reload`. Component không được tự gọi `fetch` trong `useEffect`.
- Component ghi dữ liệu bằng `useMutation` trong `hooks/use-mutation.ts`. `mutate()` ném `Error` có câu tiếng Việt khi lỗi.
- `useEffect` chỉ dùng để đồng bộ với hệ thống bên ngoài: network, DOM, subscription. Mỗi `useEffect` phải có cleanup.
- Giá trị suy ra được từ props hoặc state thì tính trực tiếp khi render, không lưu vào state.
- Event handler xử lý tương tác của người dùng. Không xử lý tương tác trong `useEffect`.
- Reset state theo prop bằng `key`, không dùng effect.
- Không đọc `ref.current` trong lúc render, kể cả qua hàm truyền cho children. ESLint rule `react-hooks/refs` báo lỗi này. Trong hàm gọi lúc render, bạn dùng `document.getElementById` hoặc `event.currentTarget`.

## 4. Code đơn giản

- Code chỉ giải quyết yêu cầu hiện có. Không thêm abstraction, option hay lớp trung gian cho nhu cầu chưa xuất hiện.
- Không thêm thư viện khi vài dòng code làm được việc đó. Ngoại lệ đã duyệt: form dùng `react-hook-form`, `zod`, `@hookform/resolvers`. Lịch dùng `react-day-picker`.
- Thư viện mới phải cài với `--save-exact`. Bạn chọn bản đã phát hành ít nhất 2 tuần.
- Tên biến và tên hàm phải rõ nghĩa.
- Không viết ternary lồng nhau. Bạn dùng `if`, `switch` hoặc hàm nhỏ.
- Comment chỉ giải thích lý do, ràng buộc hoặc chỗ dễ sai. Comment viết bằng tiếng Anh, theo code hiện có.
- Kiểu dữ liệu dùng chung giữa Route Handler và FE nằm trong `types/`.

## 5. Cấu trúc thư mục và trang mẫu

| Thư mục | Nội dung |
|---|---|
| `app/api/<resource>/route.ts` | Route Handler. Nơi duy nhất truy vấn Supabase |
| `app/api/_lib/` | Helper cho Route Handler: kiểm tra quyền, đọc input, map dữ liệu |
| `app/(app)/<route>/page.tsx` | Page sau khi đăng nhập. Chỉ ghép component |
| `components/ui/` | Component dùng chung |
| `components/<feature>/` | Component của từng feature: branches, employees, shifts, payroll, attendance |
| `hooks/` | Hook dùng chung |
| `lib/` | Hàm thuần không gọi Supabase, ví dụ `lib/auth/phone.ts`, `lib/branches/google-maps.ts` |
| `lib/supabase/` | Supabase client cho Route Handler và proxy |
| `types/` | Kiểu dữ liệu dùng chung |
| `supabase/migrations/` | Migration SQL |

Trang mẫu `/instruments`:

| File | Vai trò |
|---|---|
| `app/api/instruments/route.ts` | Truy vấn bảng `instruments` |
| `types/instrument.ts` | Kiểu `Instrument` |
| `hooks/use-fetch.ts` | Gọi API, trả `data`, `error`, `isLoading` |
| `components/instruments/instrument-list.tsx` | Hiện danh sách, trạng thái tải và lỗi |
| `app/instruments/page.tsx` | Ghép tiêu đề và `InstrumentList` |

## 6. Next.js 16 trong project

- Project dùng Next.js 16 với Turbopack, React 19 và `cacheComponents: true`.
- Middleware nằm trong `proxy.ts`, không nằm trong `middleware.ts`.
- Mỗi page trong `app/(app)/` có `export const instant = false;`. Lý do: `AppShell` lấy phiên đăng nhập ở client, nên segment không render trên server shell.
- Page có `params` bọc component bằng `Suspense`, kèm skeleton làm `fallback`.
- Next.js giữ page cũ trong bộ nhớ sau khi người dùng rời trang. Form tạo mới phải đổi `key` sau khi lưu để form trống lại, ví dụ `components/branches/branch-create.tsx`.
- Lệnh `next dev` tự thêm lại khối cảnh báo Next.js ở đầu `AGENTS.md`. Bạn không xoá khối đó.

## 7. Tài liệu Next.js 16 cần đọc

Tài liệu nằm trong `node_modules/next/dist/docs/01-app/`.

| Việc | File |
|---|---|
| Server và Client Component | `01-getting-started/05-server-and-client-components.md` |
| Route Handler | `01-getting-started/15-route-handlers.md` |
| Proxy | `01-getting-started/16-proxy.md` |
| Lấy và ghi dữ liệu | `01-getting-started/06-fetching-data.md`, `07-mutating-data.md` |
| Cache | `01-getting-started/08-caching.md`, `02-guides/migrating-to-cache-components.md` |
| Điều hướng tức thì, `instant` | `02-guides/instant-navigation.md` |
| Form | `02-guides/forms.md` |
| Biến môi trường | `02-guides/environment-variables.md` |
| Lỗi | `01-getting-started/10-error-handling.md` |
