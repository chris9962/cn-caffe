<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Nguyên tắc code của project

Mọi người và mọi AI agent làm việc trên repo này phải tuân theo các nguyên tắc dưới đây. Trang `/instruments` là ví dụ mẫu áp dụng đủ 4 nguyên tắc.

## 1. Truy vấn database chỉ nằm trong Route Handler

- Mọi truy vấn Supabase phải nằm trong `app/api/**/route.ts`. Truy vấn gồm `.from()`, `.rpc()`, `.storage` và `.auth`.
- Page, layout, component, hook và Server Action không được import `@/lib/supabase/*` hoặc `@supabase/*`. ESLint báo lỗi khi gặp các import này.
- FE lấy dữ liệu bằng `fetch("/api/...")` qua hook `useFetch`.
- Route Handler gọi `createClient()` từ `@/lib/supabase/server` trong từng request. Route Handler không được lưu client vào biến toàn cục.
- Khi thành công, Route Handler trả JSON chứa dữ liệu.
- Khi lỗi, Route Handler ghi lỗi gốc bằng `console.error`, rồi trả `{ error: string }` với status 4xx hoặc 5xx.
- Route Handler không được trả thông báo lỗi gốc của database cho client.
- Project không có Supabase client trên trình duyệt. Đăng nhập và đăng xuất cũng phải đi qua Route Handler.
- Secret key và `service_role` key chỉ được dùng trong Route Handler. Biến môi trường chứa các key này không được có tiền tố `NEXT_PUBLIC_`.
- Mỗi bảng mới trong schema `public` phải có `grant`, RLS và policy trong migration.

## 2. Component chia nhỏ để dùng lại

- Mọi component nằm trong `components/`, chia theo feature: `components/<feature>/`.
- Component dùng chung, không thuộc feature nào, nằm trong `components/ui/`.
- `page.tsx` và `layout.tsx` chỉ ghép component. Logic và markup dài phải nằm trong component.
- Một component làm một việc.
- Bạn tách component khi một phần UI dùng ở 2 nơi trở lên, hoặc khi component chứa nhiều phần độc lập, ví dụ form và bảng.
- Không tách phần JSX chỉ có 1–2 dòng thành component riêng.
- Tên file dùng kebab-case: `instrument-list.tsx`. Tên component dùng PascalCase: `InstrumentList`.
- Component dùng named export. Chỉ file đặc biệt của Next.js như `page.tsx` và `layout.tsx` dùng default export.
- Chỉ component cần state, event handler hoặc hook mới có `"use client"`. Bạn đặt `"use client"` ở component nhỏ nhất cần nó.
- Component phải đạt WCAG AA: HTML ngữ nghĩa, input có `label`, ảnh có `alt`, icon button có `aria-label`, dùng được bằng bàn phím.

## 3. Logic dùng chung viết thành hook

- Logic dùng ở 2 component trở lên phải tách thành hook trong `hooks/`.
- Tên file dùng dạng `use-<tên>.ts`. Tên hàm dùng dạng `use<Tên>`.
- Component lấy dữ liệu bằng `useFetch` trong `hooks/use-fetch.ts`. Component không được tự gọi `fetch` trong `useEffect`.
- `useEffect` chỉ dùng để đồng bộ với hệ thống bên ngoài: network, DOM, subscription. Mỗi `useEffect` phải có cleanup.
- Giá trị suy ra được từ props hoặc state thì tính trực tiếp khi render, không lưu vào state.
- Event handler xử lý tương tác của người dùng. Không xử lý tương tác trong `useEffect`.

## 4. Code đơn giản

- Code chỉ giải quyết yêu cầu hiện có. Không thêm abstraction, option hay lớp trung gian cho nhu cầu chưa xuất hiện.
- Không thêm thư viện khi vài dòng code làm được việc đó. Thư viện mới phải cài với `--save-exact`.
- Tên biến và tên hàm phải rõ nghĩa. Comment chỉ giải thích lý do, không mô tả lại code.
- Kiểu dữ liệu dùng chung giữa Route Handler và FE nằm trong `types/`.

## Cấu trúc thư mục

| Thư mục | Nội dung |
|---|---|
| `app/api/<resource>/route.ts` | Route Handler. Nơi duy nhất truy vấn Supabase. |
| `app/<route>/page.tsx` | Page. Chỉ ghép component. |
| `components/ui/` | Component dùng chung. |
| `components/<feature>/` | Component của từng feature. |
| `hooks/` | Hook dùng chung. |
| `lib/supabase/` | Supabase client cho Route Handler và proxy. |
| `types/` | Kiểu dữ liệu dùng chung. |
| `supabase/migrations/` | Migration SQL. |

## Ví dụ mẫu: `/instruments`

| File | Vai trò |
|---|---|
| `app/api/instruments/route.ts` | Truy vấn bảng `instruments`. |
| `types/instrument.ts` | Kiểu `Instrument`. |
| `hooks/use-fetch.ts` | Gọi API, trả về `data`, `error`, `isLoading`. |
| `components/instruments/instrument-list.tsx` | Hiện danh sách, trạng thái loading và lỗi. |
| `app/instruments/page.tsx` | Ghép tiêu đề và `InstrumentList`. |
