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

Bạn mở `http://localhost:3000/instruments`. Trang hiện 3 dòng `violin`, `viola`, `cello` nghĩa là Next.js đã kết nối tới Supabase local.

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
