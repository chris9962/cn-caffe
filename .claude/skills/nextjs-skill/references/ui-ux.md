# Quy tắc giao diện

Người dùng đưa ra các quy tắc này khi tự bấm thử app ngày 2026-11-20. Mỗi quy tắc có ví dụ lỗi gốc, để bạn hiểu lý do và áp dụng cho trường hợp mới.

## Mục lục

1. Component có sẵn
2. Phản hồi cho mỗi thao tác
3. Việc app tự làm được
4. Trạng thái tải
5. Thông báo: lỗi tại chỗ và toast
6. Điều hướng
7. Chữ trên giao diện
8. Tính nhất quán giữa các màn hình
9. Khả năng tiếp cận

## 1. Component có sẵn

Bạn dùng component trong `components/ui/` trước khi viết mới.

| Component | Dùng cho |
|---|---|
| `DateField` | Chọn ngày. Lịch `react-day-picker`, tiếng Việt, tuần bắt đầu từ thứ 2, có `min`, `max`, `clearLabel` |
| `MonthPicker` | Chọn tháng, lưới 12 tháng, đổi năm |
| `TimeField` | Nhập giờ `HH:mm`, bàn phím số trên điện thoại, tự chèn dấu `:` |
| `PickerPopover` | Khung popup cho các bộ chọn. Dùng Popover API và CSS anchor positioning |
| `TextField` | Ô văn bản trong form: label, dấu `*`, gợi ý, lỗi, ARIA |
| `MoneyField` | Ô nhập tiền. Tự thêm dấu chấm hàng nghìn khi gõ, ví dụ `100000` thành `100.000`. Mở bàn phím số. `value` chỉ chứa chữ số |
| `Switch` | Bật hoặc tắt một tuỳ chọn |
| `Modal`, `SideDrawer`, `Tabs` | Hộp thoại, ngăn bên, tab |
| `Skeleton`, `TableSkeleton`, `FormSkeleton`, `SkeletonRegion` | Trạng thái tải |
| `BackLink` | Link quay lại danh sách |
| `ErrorMessage` | Câu lỗi màu đỏ, `role="alert"`, có `id` để nối với `aria-describedby` |
| `useToast()` | Toast: `showToast(text)` cho thành công, `showToast(text, "error")` cho lỗi |

**Không dùng ô ngày, giờ, tháng mặc định của trình duyệt.** Bạn không được dùng `type="date"`, `type="time"`, `type="datetime-local"` hoặc `type="month"`. Người dùng đánh giá các ô này là xấu, và mỗi trình duyệt hiện mỗi kiểu. Ô nhập số phải mở bàn phím số trên điện thoại. Bạn đặt `inputMode="numeric"` cho số nguyên và `inputMode="decimal"` cho số lẻ. Ô nhập tiền dùng `MoneyField`, để người dùng đọc được số lớn khi gõ.

Một số form vẫn còn `select` mặc định. Khi bạn làm `select` mới, bạn hỏi người dùng có muốn component tuỳ biến hay không.

## 2. Phản hồi cho mỗi thao tác

Mỗi nút hoặc thao tác phải cho người dùng thấy 3 trạng thái, ngay tại chỗ thao tác:

| Trạng thái | Cách hiện |
|---|---|
| Đang xử lý | Nút đổi chữ, ví dụ "Đang lấy toạ độ từ link...". Nút bị khoá trong lúc chờ |
| Thành công | Dòng xanh lá có kết quả cụ thể, ví dụ "Đã lấy toạ độ 10.77250, 106.69800." |
| Thất bại | Dòng đỏ có lý do và cách sửa |

Lỗi gốc: nút "Lấy toạ độ" chạy đúng và server trả toạ độ. Toạ độ hiện ở đầu khung, nằm ngoài màn hình điện thoại. Người dùng nghĩ nút không làm gì.

Kết quả phải hiện gần chỗ người dùng đang nhìn. Kết quả hiện ở chỗ khác thì người dùng không thấy.

## 3. Việc app tự làm được

Nếu app tự làm được một bước, bạn không bắt người dùng bấm nút cho bước đó.

Lỗi gốc: form chi nhánh bắt người dùng dán link rồi bấm "Lấy toạ độ". Sau khi sửa, form tự lấy toạ độ khi người dùng dán link. Nếu người dùng gõ tay link, form lấy toạ độ khi người dùng rời ô.

## 4. Trạng thái tải

- Lần tải đầu của app dùng `AppLoading` trong `components/layout/app-loading.tsx`. Màn này hiện logo Ấm nhấp nháy giữa màn hình và chữ "Đang tải…" bên dưới. `AppShell` hiện màn này khi chờ `/api/me` và khi chuyển trang theo quyền. Người dùng yêu cầu màn này theo mẫu của mgst-app.
- Nội dung bên trong trang dùng skeleton có hình gần giống nội dung thật. Bạn không dùng chữ "Đang tải..." cho nội dung trong trang.
- Skeleton nằm trong `SkeletonRegion` có nhãn cho trình đọc màn hình.
- Page có `Suspense` dùng cùng skeleton với component làm `fallback`.

## 5. Thông báo: lỗi tại chỗ và toast

| Loại thông báo | Nơi hiện |
|---|---|
| Lỗi của một ô nhập | Dưới ô đó |
| Lỗi server sau khi bấm nút lưu, tạo, xoá | Toast lỗi `showToast(message, "error")`, nền đỏ, tự ẩn sau 6 giây |
| Lưu thành công | Toast `showToast("Đã lưu ...")`, tự ẩn sau 2,5 giây |
| Lỗi tải dữ liệu của cả trang | `ErrorMessage` tại vị trí nội dung |

Chỗ dễ sai: `Modal` dùng `<dialog>` ở lớp trên cùng của trang, nên che toast. Form trong modal cần toast hiện trên modal. Cách này chưa làm, nên form trong modal vẫn hiện lỗi server trong form.

## 6. Điều hướng

- Trang chi tiết và trang thêm mới có `BackLink` ở đầu trang, trên tiêu đề, ví dụ "‹ Danh sách chi nhánh".
- `BackLink` trỏ thẳng về đường dẫn danh sách, không dùng `router.back()`. Lý do: người dùng có thể mở trang chi tiết bằng cách dán URL, khi đó trang không có lịch sử để quay lại.
- `BackLink` nằm ngoài `Suspense`, để link hiện cả khi trang đang tải hoặc báo lỗi.

## 7. Chữ trên giao diện

- Chữ ngắn. Người dùng không muốn câu giải thích thừa. Lỗi gốc: dòng "Mục có dấu * là bắt buộc." bị yêu cầu bỏ.
- Chữ viết bằng tiếng Việt, câu chủ động, một ý một câu.
- Câu lỗi nói đúng loại lỗi. Ô trống báo "Số điện thoại là bắt buộc.". Bạn không viết "Bạn nhập số điện thoại.", vì câu này đọc như lỗi nhập sai.
- Câu lỗi về định dạng nói rõ định dạng đúng, ví dụ "Số điện thoại phải có 10 chữ số và bắt đầu bằng 0.".
- Khi app tự làm một bước, gợi ý nói rõ điều đó, ví dụ "Form tự lấy toạ độ sau khi bạn dán link.".

## 8. Tính nhất quán giữa các màn hình

Khi bạn sửa một màn hình, bạn tìm mọi màn hình cùng kiểu và sửa giống nhau.

Lỗi gốc: bản sửa đầu tiên chỉ thêm link quay lại cho trang chi nhánh. Người dùng phải hỏi thêm "tương tự cho những page khác như nhân viên?".

Cách tìm màn hình cùng kiểu:
- Trang chi tiết: `find app -path '*\[id\]*' -name page.tsx`.
- Trang thêm mới: `find app -path '*new*' -name page.tsx`.
- Form có `useMutation`: `grep -rln useMutation components`.

Nếu thay đổi lớn hơn khoảng 5 file, bạn sửa màn hình người dùng đang xem. Sau đó bạn liệt kê các màn hình còn lại và hỏi người dùng.

## 9. Khả năng tiếp cận

- Mục tiêu WCAG AA.
- Dùng HTML ngữ nghĩa: `button`, `nav`, `label`, `fieldset`, `legend`.
- Màu không phải là cách duy nhất để báo trạng thái. Lỗi có chữ, dấu `*` có `required` trên input.
- Mọi thao tác dùng được bằng bàn phím và có focus nhìn thấy được.
- Popup chọn ngày đưa focus vào ngày đang chọn khi mở, và trả focus về nút khi đóng.
