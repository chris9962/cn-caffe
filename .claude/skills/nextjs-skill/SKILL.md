---
name: nextjs-skill
description: Quy tắc bắt buộc cho mọi việc code trong repo cn, app chấm công và tính lương Ấm Manual Coffee chạy Next.js 16, React 19 và Supabase. Skill gồm cấu trúc code của AGENTS.md, quy tắc UI/UX và form người dùng đã duyệt, và cách kiểm tra trước khi báo xong. Phần cấu trúc code gồm Supabase chỉ trong Route Handler, component theo feature, hook và useFetch. Phần form gồm react-hook-form, zod, TextField, lỗi dưới ô, toast lỗi, dấu * và link quay lại. Dùng skill này mỗi khi người dùng muốn thêm trang, sửa component, form, Route Handler hoặc migration, sửa lỗi giao diện hay review code trong repo cn. Dùng cả khi người dùng chỉ mô tả lỗi trên màn hình hoặc không nhắc tên skill.
---

# nextjs-skill

Skill này gom mọi quy tắc của repo cn vào một chỗ:
- Cấu trúc code trong `AGENTS.md`.
- Feedback UI/UX người dùng đưa ra khi duyệt app ngày 2026-11-20.
- Các điểm riêng của Next.js 16 trong project.

Người dùng phát hiện từng lỗi giao diện bằng cách tự bấm thử app. Mục tiêu của skill: bạn giao màn hình đã hoàn chỉnh, để người dùng không phải chỉ ra từng trường hợp.

## Quy trình cho mỗi việc

### 1. Trước khi viết code

- Bạn đọc tài liệu Next.js 16 liên quan trong `node_modules/next/dist/docs/`. Next.js 16 khác kiến thức cũ, ví dụ `proxy.ts`, Cache Components và `export const instant`. Bảng chỉ mục nằm ở `references/code-rules.md`.
- Bạn tìm code mẫu có sẵn trước khi viết mới. Trang `/instruments` là mẫu cho cấu trúc. Thư mục `components/ui/` và `hooks/` chứa phần dùng chung.
- Bạn liệt kê mọi màn hình cùng kiểu với màn hình cần sửa. Một thay đổi phải áp dụng cho tất cả màn hình đó. Ví dụ: thêm link quay lại cho trang chi tiết chi nhánh thì phải thêm cho trang chi tiết nhân viên và chi tiết ca.

### 2. Khi viết code

Bạn theo 3 file tham chiếu:

| File | Đọc khi |
|---|---|
| `references/code-rules.md` | Mọi việc code: chỗ đặt file, Route Handler, component, hook, Next.js 16 |
| `references/ui-ux.md` | Việc có giao diện: trang, nút, trạng thái tải, thông báo, điều hướng |
| `references/forms.md` | Việc có form hoặc ô nhập |

### 3. Trước khi báo xong

Bạn làm đủ các bước trong `references/verification.md`:
- Chạy TypeScript và ESLint.
- Mở màn hình trên trình duyệt và thử từng trạng thái.
- Báo rõ phần đã kiểm tra và phần chưa kiểm tra.

Bạn không được báo xong khi chưa tự thao tác trên trình duyệt. Lý do: phần lớn lỗi người dùng gặp trong phiên ngày 2026-11-20 chỉ thấy được khi bấm thử.

## Quy tắc cốt lõi

Danh sách này là bản tóm tắt. Chi tiết và ví dụ nằm trong các file tham chiếu.

**Cấu trúc code**
- Truy vấn Supabase chỉ nằm trong `app/api/`. Page, component, hook không được import `@/lib/supabase/*` hoặc `@supabase/*`.
- FE lấy dữ liệu bằng `useFetch`. FE ghi dữ liệu bằng `useMutation`.
- Component nằm trong `components/<feature>/`. Phần dùng chung nằm trong `components/ui/`. `page.tsx` chỉ ghép component.
- `useEffect` chỉ dùng để đồng bộ với hệ thống bên ngoài và phải có cleanup. Giá trị suy ra được thì tính khi render.
- Code không có ternary lồng nhau. Code dùng `if` hoặc hàm nhỏ có tên rõ nghĩa.

**Giao diện**
- Không dùng ô ngày, giờ, tháng mặc định của trình duyệt. Dùng `DateField`, `TimeField`, `MonthPicker`.
- Mỗi thao tác có phản hồi ngay chỗ thao tác: đang xử lý, thành công, thất bại kèm lý do.
- Việc app tự làm được thì không bắt người dùng bấm nút.
- Trạng thái tải dùng skeleton, không dùng chữ "Đang tải...".
- Trang chi tiết và trang thêm mới có `BackLink` về danh sách.
- Chữ trên giao diện ngắn. Không thêm câu giải thích thừa.

**Form**
- Form dùng `react-hook-form` và `zod`, ô văn bản dùng `TextField`.
- Ô bắt buộc chỉ có dấu `*` đỏ. Không thêm câu "Mục có dấu * là bắt buộc".
- Ô nhập số có `inputMode` để mở bàn phím số. Ô nhập tiền dùng `MoneyField`, tự định dạng `100.000` khi gõ.
- Lỗi hiện dưới ô khi người dùng rời ô, rồi cập nhật theo từng ký tự.
- Ô trống báo "X là bắt buộc.". Ô sai định dạng nói rõ định dạng đúng.
- Lỗi server sau khi bấm nút hiện bằng toast lỗi, không hiện trong form.

## Khi quy tắc thay đổi

Người dùng có thể đưa feedback mới. Khi đó bạn cập nhật file tham chiếu liên quan trong skill này. Nếu quy tắc thuộc phần cấu trúc code, bạn cập nhật cả `AGENTS.md`, vì các AI agent khác chỉ đọc `AGENTS.md`.
