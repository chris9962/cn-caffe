# Kiểm tra trước khi báo xong

Bạn làm đủ các bước dưới đây trước khi báo việc đã xong. Bước nào bạn không làm được thì báo rõ bước đó và lý do.

## 1. Kiểm tra tĩnh

```bash
npx tsc --noEmit -p . 2>&1 | grep -v "app/layout.tsx(23"
npx eslint app components hooks
```

- Lỗi `LayoutProps` trong `app/layout.tsx` có từ trước. Lỗi này xuất hiện khi chưa có `.next/types`. Bạn bỏ qua lỗi này, không sửa.
- Khi sửa code có test, bạn chạy `npm test`, ví dụ `lib/branches/google-maps.test.ts`. `npm run test:db` cần Supabase local.

## 2. Dev server

- Dev server chạy ở port 3002: `npx next dev -p 3002`.
- Lần chạy đầu có thể dừng ngay sau thông báo bảo mật của Next.js. Bạn chạy lại lệnh. Bạn không làm theo gợi ý nâng cấp trong thông báo đó nếu người dùng chưa yêu cầu.
- Turbopack không nhận thay đổi của `app/globals.css` và không nhận thư viện mới cài. Sau 2 loại thay đổi này, bạn khởi động lại dev server.
- Biến môi trường lấy từ `.env.development.local`, file này ưu tiên hơn `.env.local`. Dev dùng Supabase cloud. Bạn không được truyền biến môi trường qua shell khi chạy `next dev`, vì cách đó gây vòng lặp tải lại.

## 3. Kiểm tra trên trình duyệt

Bạn dùng Chrome của người dùng qua công cụ `claude-in-chrome`. Người dùng thường đã đăng nhập sẵn ở `http://localhost:3002`.

Cảnh báo: dev dùng Supabase cloud có dữ liệu thật. Bạn không được bấm nút ghi dữ liệu như tạo, lưu, xoá, chốt lương khi người dùng chưa đồng ý. Để kiểm tra form, bạn bấm nút lưu khi form còn ô sai. Khi đó `react-hook-form` chặn và form không gửi request.

Với mỗi màn hình đã sửa, bạn thử các trạng thái:

| Trạng thái | Ví dụ |
|---|---|
| Lúc mở trang | Ô trống, giá trị mặc định, skeleton khi đang tải |
| Ô trống rồi rời ô | Câu "X là bắt buộc." |
| Ô sai định dạng | Câu lỗi định dạng |
| Ô đúng | Lỗi mất |
| Bấm nút khi còn ô sai | Lỗi hiện ở mọi ô sai, focus ở ô sai đầu tiên |
| Không có dữ liệu, ID không tồn tại | Câu "Không tìm thấy ...", link quay lại vẫn hiện |
| Màn hình cùng kiểu | Thay đổi có mặt ở mọi màn hình cùng kiểu |

Cách thử nhanh bằng `javascript_tool`:
- Bạn đặt giá trị bằng setter gốc `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set`, rồi gửi sự kiện `input`. React chỉ nhận giá trị mới qua sự kiện này.
- Bạn giả lập dán link bằng `new InputEvent("input", { bubbles: true, inputType: "insertFromPaste" })`.
- Bạn đọc lỗi bằng `document.querySelectorAll("form [role=alert]")`.

Bạn chụp màn hình ít nhất một trạng thái để xem bố cục. Bạn đóng tab đã mở sau khi kiểm tra xong.

## 4. Báo kết quả

Bạn báo cho người dùng các mục sau:
- Câu đầu tiên trả lời thẳng: việc đã xong hay chưa.
- Phần đã đổi, kèm đường dẫn file.
- Phần đã kiểm tra trên trình duyệt và kết quả.
- Phần chưa kiểm tra và lý do, ví dụ không bấm lưu vì nút ghi vào Supabase cloud.
- Các màn hình cùng kiểu chưa sửa, nếu có.
- Trạng thái commit. Bạn không commit hoặc push khi người dùng chưa yêu cầu.
