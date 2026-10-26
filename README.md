This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

Nguyên tắc code của project nằm trong [AGENTS.md](AGENTS.md). Bạn phải đọc file này trước khi viết code.

## Chạy local với Supabase

Project chạy Supabase local trong Docker qua Supabase CLI. Supabase CLI nằm trong `devDependencies`, bạn không phải cài riêng.

Bạn phải bật Docker Desktop trước khi chạy các lệnh dưới đây. Lần chạy đầu tiên tải khoảng 5 GB image, nên ổ đĩa phải còn ít nhất 10 GB trống.

### Thiết lập lần đầu

> ⚠️ Supabase CLI 2.120.0–2.122.0 không chạy migration và seed ở lần `db:start` đầu tiên khi dùng Docker 28.5. Bạn phải chạy `npm run db:reset` ngay sau `db:start` đầu tiên. Chi tiết ở mục [Lỗi đã biết](#lỗi-đã-biết).

```bash
npm install
cp .env.example .env.local
npm run db:start
npm run db:reset
npm run dev
```

Sau `npm run dev`, bạn làm tiếp mục [Chấm công](#chấm-công) để tạo tài khoản admin và đăng nhập vào ứng dụng.

## Chấm công

> ⚠️ `npm run db:reset` xoá cả tài khoản đăng nhập. Sau mỗi lần reset, bạn chạy lại bước 2.

> ⚠️ Cổng 3000 có thể đã bị chiếm, ví dụ bởi Docker Desktop. Khi đó bạn chạy `npx next dev -p 3002` và dùng cổng 3002 ở bước 3.

1. Bạn lấy `SECRET_KEY` từ `npm run db:status`. Bạn điền giá trị này vào `SUPABASE_SECRET_KEY` trong `.env.local` (file copy từ `.env.example`). Các route admin và `npm test` cần key này.
2. Bạn tạo admin đầu tiên: `npm run admin:create -- <phone> <password> "<name>"`.
3. Bạn mở `http://localhost:3000/login`. Bạn đăng nhập bằng số điện thoại và mật khẩu của bước 2.

Test gồm hai lệnh:

- `npm test` chạy test của route handler trên Supabase local.
- `npm run test:db` chạy test pgTAP cho schema và RLS.

> ⚠️ Camera chỉ chạy trên HTTPS hoặc `localhost`. Trên điện thoại mở qua `http://` trong mạng LAN, trình duyệt chặn camera và ứng dụng hiện "Không mở được camera".

Khi triển khai production:

1. Bạn tắt đăng ký công khai trong project Supabase: Authentication settings, tắt "Allow new users to sign up".
2. Bạn phục vụ ứng dụng qua HTTPS.

### Tính lương

1. Bạn nhập mức lương cho từng nhân viên ở **Nhân viên → chi tiết → Mức lương**. Mỗi mức có loại (bán thời gian theo giờ, toàn thời gian theo tháng) và ngày bắt đầu hiệu lực.
2. Bạn đặt khung tăng ca và lương tăng ca ở **Cấu hình tháng**. Tháng chưa có cấu hình thì tự chép từ tháng trước.
3. Trong tháng, **Bảng lương** hiện lương tạm tính. Bạn thêm khoản thưởng hoặc khoản trừ ở đây, mỗi khoản cần lý do.
4. Khi tháng đã kết thúc và không còn ca đang làm, thiếu check out hoặc chờ duyệt, bạn bấm **Chốt lương tháng**. Sau khi chốt, ca, cấu hình và khoản cộng trừ của tháng đó bị khoá.
5. Bạn tải file Excel của tháng đã chốt. Khi cần sửa, bạn mở lại tháng kèm lý do rồi chốt lại; phiên bản cũ vẫn xem được.

Nhân viên xem lương ở **Lương của tôi**: tạm tính khi tháng còn mở, phiếu lương khi tháng đã chốt. Quản lý chỉ xem được bảng lương khi admin bật quyền "Xem bảng lương" cho họ, và chỉ xem: không chốt, mở lại hay sửa khoản nào.

### Lệnh hằng ngày

> ⚠️ `npm run db:reset` xoá toàn bộ dữ liệu trong database local.

| Lệnh | Tác dụng |
|---|---|
| `npm run db:start` | Khởi động Supabase local. Dữ liệu từ lần chạy trước giữ nguyên. |
| `npm run db:stop` | Dừng container. Dữ liệu giữ nguyên. |
| `npm run db:status` | In URL và key của Supabase local. |
| `npm run db:reset` | Tạo lại database local, chạy migration trong `supabase/migrations/`, rồi chạy `supabase/seed.sql`. |

### Địa chỉ local

| Service | Địa chỉ |
|---|---|
| Next.js | http://localhost:3000 |
| Supabase API | http://127.0.0.1:54321 |
| Supabase Studio | http://127.0.0.1:54323 |
| Mailpit, hộp thư nhận email do Auth gửi | http://127.0.0.1:54324 |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

### Thay đổi schema

1. Bạn chạy `npx supabase migration new <tên>` để tạo file migration.
2. Bạn viết SQL vào file mới trong `supabase/migrations/`.
3. Bạn chạy `npm run db:reset` để áp dụng migration.

Bảng mới trong schema `public` không tự mở qua Data API. Migration phải có lệnh `grant` cho role `anon` hoặc `authenticated`. Migration cũng phải bật RLS và tạo policy. Xem ví dụ trong `supabase/migrations/`.

### Lỗi đã biết

Supabase CLI 2.120.0–2.122.0 kiểm tra volume database bằng chuỗi lỗi `no such volume`. Docker 28.5 trả về chuỗi khác: `volume <tên> not found`. CLI hiểu sai rằng database đã tồn tại. CLI in `Starting database from backup...` rồi bỏ qua khởi tạo schema, migration và seed.

Lỗi này chỉ xảy ra khi volume database chưa tồn tại: lần `db:start` đầu tiên, hoặc sau `npx supabase stop --no-backup`. Khi Supabase sửa lỗi này trong CLI, project không cần bước `db:reset` ở lần thiết lập đầu.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
