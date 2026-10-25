# Design: Hệ thống chấm công và tính lương nhân viên

- Ngày viết: 2026-10-25
- Trạng thái: đã duyệt ngày 2026-10-25
- Repo: `cn` (Next.js 16, Tailwind CSS 4, Supabase)

Tài liệu dùng 2 nhãn:

- **[Chủ dự án]**: chủ dự án đã quyết định. Người code không được đổi.
- **[Claude]**: Claude tự quyết định khi viết design. Chủ dự án có thể sửa khi duyệt.

## 1. Mục đích

Công ty có nhiều chi nhánh. Nhân viên part time và full time làm ở một hoặc nhiều chi nhánh trong tháng. Công ty cần 2 việc:

1. Ghi lại giờ làm thật của nhân viên, chống chấm công hộ và chấm công từ xa.
2. Tính lương hằng tháng từ giờ làm, chốt lương, và giữ nguyên lương các tháng đã chốt khi mức lương hoặc cấu hình thay đổi.

Check in và check out là chức năng cốt lõi. Tính lương dùng dữ liệu từ check in.

## 2. Mục tiêu, không làm, không được xảy ra

### 2.1 Mục tiêu

- Nhân viên check in và check out bằng web trên điện thoại cá nhân, kèm vị trí và ảnh chụp trực tiếp. **[Chủ dự án]**
- Một ngày có nhiều ca. Giờ làm của ca bằng giờ check out trừ giờ check in. **[Chủ dự án]**
- Hệ thống tính lương part time theo giờ. Giờ làm trong khung tăng ca nhận lương tăng ca theo giờ. **[Chủ dự án]**
- Hệ thống tính lương full time theo mức cố định hằng tháng. **[Chủ dự án]**
- Admin và Giám đốc thêm dòng + hoặc − lương cho từng nhân viên trong từng tháng. **[Chủ dự án]**
- Admin và Giám đốc chốt lương theo tháng, mở lại tháng đã chốt, và xuất bảng lương ra file Excel. **[Chủ dự án]**
- Nhân viên xem ca của mình, lương tạm tính của tháng đang mở và phiếu lương các tháng đã chốt. **[Chủ dự án]**

### 2.2 Không làm trong bản đầu

- App native iOS hoặc Android.
- Kiểm tra wifi. Trình duyệt không đọc được tên wifi, và chủ dự án không dùng IP mạng để thay thế. **[Chủ dự án]**
- Nhận diện khuôn mặt tự động. Quản lý xem ảnh bằng mắt.
- Xếp lịch ca trước, đăng ký ca.
- Ngày lễ, hệ số lương ngày lễ, nghỉ phép.
- Thuế thu nhập cá nhân, bảo hiểm xã hội.
- Tự tính tăng ca cho full time. **[Chủ dự án]**
- Gửi SMS, push notification, email.
- Check in khi không có mạng.
- Nhiều công ty trên cùng một hệ thống.
- Màn hình xem toàn bộ nhật ký thay đổi. Hệ thống vẫn lưu nhật ký, xem mục 9.4.

### 2.3 Không được xảy ra

Các trường hợp dưới đây là lỗi nghiêm trọng, kể cả khi mọi chức năng khác chạy đúng:

- Lương của tháng đã chốt thay đổi sau khi ai đó sửa mức lương, cấu hình hoặc ca làm.
- Quản lý xem được lương của nhân viên.
- Nhân viên xem được ca hoặc lương của người khác.
- Một ca chưa có giờ check out hoặc chưa được duyệt mà vẫn được tính lương.
- Client truy vấn database trực tiếp. Mọi truy vấn phải đi qua Route Handler, theo `AGENTS.md`.

## 3. Ràng buộc

- Code phải theo `AGENTS.md`: truy vấn Supabase chỉ nằm trong `app/api/**/route.ts`, component nằm trong `components/<feature>/`, logic dùng chung nằm trong `hooks/`, code đơn giản.
- Project chạy Supabase local bằng `npm run db:start`. Schema thay đổi qua migration trong `supabase/migrations/`.
- Múi giờ cho mọi quy tắc nghiệp vụ là `Asia/Ho_Chi_Minh` (UTC+7, không đổi giờ theo mùa). Database lưu thời điểm bằng `timestamptz`.
- Tiền là số nguyên, đơn vị đồng (VND).
- Camera và vị trí trên trình duyệt chỉ chạy trên HTTPS. `localhost` được phép khi dev.

## 4. Vai trò và quyền

### 4.1 Vai trò

| Vai trò | Mô tả |
|---|---|
| Admin | Toàn quyền trên hệ thống. **[Chủ dự án]** |
| Giám đốc | Toàn quyền trên hệ thống. **[Chủ dự án]** Quyền giống hệt Admin. **[Claude]** |
| Quản lý | Nhân viên full time được gán 1 hoặc nhiều chi nhánh. **[Chủ dự án]** |
| Nhân viên | Part time hoặc full time. **[Chủ dự án]** |

Mọi tài khoản đều là một nhân viên trong bảng nhân viên. Quản lý vẫn check in và nhận lương như nhân viên full time. **[Claude]**

### 4.2 Quyền của quản lý

Admin hoặc Giám đốc bật tắt từng quyền cho mỗi quản lý. Quyền áp dụng cho mọi chi nhánh quản lý đó phụ trách. **[Chủ dự án]**

Quản lý chỉ thấy và xử lý các ca diễn ra tại chi nhánh mình phụ trách. Quản lý không xem lương và không sửa thông tin nhân viên. **[Chủ dự án]**

| Mã quyền | Cho phép |
|---|---|
| `shifts.view` | Xem ca, ảnh và vị trí của các ca tại chi nhánh phụ trách. |
| `shifts.review` | Duyệt ca "chờ duyệt". Từ chối mọi ca của tháng đang mở. |
| `shifts.edit` | Nhập giờ check out cho ca thiếu, sửa giờ check in và check out, thêm ca bằng tay. |

**[Claude]** Danh sách 3 quyền trên.

**[Claude]** Quản lý không được duyệt, sửa hay thêm ca của chính mình. Admin hoặc Giám đốc xử lý các ca này.

### 4.3 Quyền của Admin và Giám đốc

Admin và Giám đốc làm được mọi việc, gồm:

- Tạo, sửa, khoá tài khoản nhân viên. Đặt lại mật khẩu.
- Nhập mức lương theo ngày hiệu lực.
- Tạo và sửa chi nhánh: tên, địa chỉ, link Google Maps, bán kính.
- Gán chi nhánh và bật tắt quyền cho quản lý.
- Xem, duyệt, sửa, thêm ca ở mọi chi nhánh.
- Sửa cấu hình tháng.
- Thêm và xoá dòng + − lương.
- Chốt tháng, mở lại tháng, xuất Excel.

### 4.4 Quyền của nhân viên

- Check in và check out.
- Xem ca của mình, gồm trạng thái và lý do "chờ duyệt".
- Xem lương tạm tính của tháng đang mở và phiếu lương các tháng đã chốt. **[Chủ dự án]**
- Đổi mật khẩu.

## 5. Tài khoản và đăng nhập

- Nhân viên đăng nhập bằng số điện thoại và mật khẩu. **[Chủ dự án]**
- Hệ thống không dùng SMS. Khi tạo tài khoản, hệ thống tạo email nội bộ từ số điện thoại, ví dụ `84901234567@nhanvien.local`, và xác nhận email đó ngay. Supabase Auth lưu tài khoản bằng email nội bộ này. **[Chủ dự án]**
- Người dùng không bao giờ thấy email nội bộ. Route Handler đăng nhập chuẩn hoá số điện thoại rồi đổi thành email nội bộ. **[Claude]**
- Khi Admin sửa số điện thoại của nhân viên, hệ thống cập nhật email nội bộ trong Supabase Auth theo số mới. **[Claude]**
- Admin hoặc Giám đốc tạo tài khoản với mật khẩu ban đầu. Nhân viên phải đổi mật khẩu ở lần đăng nhập đầu. **[Claude]**
- Khi nhân viên quên mật khẩu, Admin hoặc Giám đốc đặt lại mật khẩu. Hệ thống không gửi SMS. **[Claude]**
- Khi nhân viên nghỉ việc, Admin hoặc Giám đốc nhập ngày nghỉ việc và khoá tài khoản. Tài khoản bị khoá không đăng nhập được. Dữ liệu ca và lương giữ nguyên. **[Claude]**
- Mọi mức lương ngừng hiệu lực sau ngày nghỉ việc. **[Claude]**

Thông tin nhân viên: họ tên, số điện thoại, vai trò, loại nhân viên (part time hoặc full time), trạng thái hoạt động. **[Chủ dự án]**

## 6. Chi nhánh

Mỗi chi nhánh có:

- Tên và địa chỉ.
- Link Google Maps của quán. **[Chủ dự án]**
- Toạ độ (vĩ độ, kinh độ) lấy từ link Google Maps. **[Chủ dự án]**
- Bán kính cho phép. Bán kính mặc định là 100 m. **[Claude]**

### 6.1 Lấy toạ độ từ link Google Maps

1. Admin hoặc Giám đốc dán link Google Maps của quán vào form chi nhánh. Link dài và link rút gọn `maps.app.goo.gl/...` đều được. **[Chủ dự án]**
2. Route Handler mở link. Với link rút gọn, Route Handler đi theo redirect tới link đầy đủ. **[Claude]**
3. Route Handler lấy toạ độ của điểm ghim từ link đầy đủ. **[Claude]**
4. Form hiện toạ độ vừa lấy được. Admin kiểm tra rồi bấm lưu. **[Claude]**

**[Claude]** Khi link không chứa toạ độ của một điểm ghim, form báo lỗi và hướng dẫn Admin mở Google Maps, chọn đúng quán, bấm "Chia sẻ" rồi copy link. Admin cũng có thể nhập toạ độ bằng tay.

Form chi nhánh có dạng:

```
┌──────────────────────────────────┐
│ Chi nhánh: Quận 1                │
├──────────────────────────────────┤
│ Địa chỉ:  [12 Lê Lợi, Q1       ] │
│ Link Google Maps:                │
│ [https://maps.app.goo.gl/abc123] │
│ [     Lấy toạ độ từ link     ]   │
│                                  │
│ Toạ độ:   10.77690, 106.70090    │
│ Bán kính: [100] m                │
│                                  │
│ [           Lưu            ]     │
└──────────────────────────────────┘
```

Nhân viên không thuộc chi nhánh nào cố định. Nhân viên check in được ở mọi chi nhánh. **[Chủ dự án]**

## 7. Check in và check out

### 7.1 Quy trình check in

1. Nhân viên mở trang check in trên điện thoại.
2. Trình duyệt lấy vị trí của điện thoại.
3. Hệ thống chọn chi nhánh có toạ độ gần vị trí điện thoại nhất. Nhân viên có thể đổi sang chi nhánh khác trong danh sách. **[Claude]**
4. Trang mở camera trước của điện thoại ngay trong trang. Nhân viên chụp ảnh. Trang không có nút chọn ảnh từ thư viện. **[Chủ dự án]**
5. Nhân viên bấm "Check in".
6. Route Handler kiểm tra 2 điều kiện ở mục 7.3, lưu ca và ảnh, rồi trả kết quả.
7. Trang hiện kết quả: "Đã check in" hoặc "Đã check in, chờ quản lý duyệt" kèm lý do.

### 7.2 Quy trình check out

Check out có cùng các bước như check in. Hệ thống kiểm tra 2 điều kiện với chi nhánh của ca đó. **[Claude]**

### 7.3 Hai điều kiện kiểm tra

| Điều kiện | Cách kiểm tra | Khi không đạt |
|---|---|---|
| Vị trí | Khoảng cách từ vị trí điện thoại tới toạ độ chi nhánh nhỏ hơn hoặc bằng bán kính. **[Chủ dự án]** | Ca chuyển sang "chờ duyệt", lý do `outside_radius`. |
| Ảnh | Ảnh chụp trực tiếp từ camera trong trang. **[Chủ dự án]** | Không có ảnh thì không check in được. |

Hệ thống không kiểm tra wifi. **[Chủ dự án]**

Khi một điều kiện không đạt, hệ thống vẫn ghi ca và đánh dấu "chờ duyệt". Hệ thống không chặn check in. **[Chủ dự án]**

**[Claude]** Khi nhân viên từ chối quyền vị trí, hệ thống vẫn cho check in, với lý do `location_unavailable`. Khi nhân viên từ chối quyền camera, nhân viên không check in được, vì ảnh là bắt buộc.

Hệ thống lưu cho mỗi lần check in và check out: thời điểm, toạ độ, độ chính xác của toạ độ, khoảng cách tới chi nhánh, đường dẫn ảnh, danh sách lý do không đạt.

### 7.4 Trạng thái ca

| Trạng thái | Ý nghĩa | Tính lương |
|---|---|---|
| Đang làm | Có check in, chưa có check out. | Không |
| Thiếu check out | Ca không có check out, và nhân viên đã check in một ca mới. | Không |
| Chờ duyệt | Có ít nhất một lý do không đạt ở check in hoặc check out. | Không |
| Hợp lệ | Có check out và không còn lý do không đạt, hoặc đã được duyệt. | Có |
| Từ chối | Người có quyền đã từ chối ca. | Không |

Danh sách lý do không đạt: `outside_radius`, `location_unavailable`, `too_long`.

Quy tắc chuyển trạng thái:

- Nhân viên chỉ có tối đa một ca "đang làm". **[Claude]**
- Khi còn ca "đang làm", trang check in hiện nút chính "Check out". Trang có thêm nút phụ "Quên check out ca trước, bắt đầu ca mới". Nút phụ chuyển ca cũ sang "thiếu check out" rồi check in ca mới. **[Claude]**
- Khi ca dài hơn thời lượng tối đa của tháng, ví dụ 16 giờ, hệ thống thêm lý do `too_long` lúc check out. **[Claude]**
- Người có quyền `shifts.edit` nhập giờ check out, sửa giờ check in và check out. Thao tác sửa giờ không xoá lý do không đạt. Sau khi sửa, ca không có lý do không đạt thì là "hợp lệ", còn lý do thì là "chờ duyệt". Ca "từ chối" giữ nguyên "từ chối". **[Claude]**
- Người có quyền `shifts.review` duyệt ca "chờ duyệt" thành "hợp lệ". Ca phải có giờ check out mới duyệt được. **[Chủ dự án]**
- Người có quyền `shifts.review` từ chối mọi ca của tháng đang mở, kể cả ca "hợp lệ". Ví dụ: ảnh cho thấy người khác check in hộ. **[Claude]**
- Người có quyền `shifts.edit` thêm ca bằng tay. Ca thêm bằng tay có trạng thái "hợp lệ" và không có ảnh. **[Claude]**
- Mọi thao tác sửa, duyệt, từ chối, thêm bằng tay đều ghi vào nhật ký, xem mục 9.4.

### 7.5 Ca thuộc ngày nào

**[Claude]** Ca thuộc ngày và tháng của thời điểm check in, theo giờ `Asia/Ho_Chi_Minh`. Ví dụ: ca từ 2026-10-31 22:00 tới 2026-11-01 02:00 thuộc ngày 2026-10-31 và kỳ lương 2026-10.

## 8. Tính lương

### 8.1 Mức lương có ngày hiệu lực

Mỗi nhân viên có một danh sách mức lương. Mỗi mức lương có ngày bắt đầu hiệu lực. **[Chủ dự án]**

| Loại nhân viên | Mức lương |
|---|---|
| Part time | Lương theo giờ, ví dụ 25.000 đ/giờ. |
| Full time | Lương tháng cố định, ví dụ 9.000.000 đ/tháng. |

**[Claude]** Loại nhân viên nằm trong từng mức lương. Vì vậy, khi nhân viên chuyển từ part time sang full time giữa tháng, hệ thống tính mỗi đoạn theo đúng loại của đoạn đó.

Mức lương áp dụng cho một ca là mức có hiệu lực vào ngày của ca. **[Chủ dự án]**

### 8.2 Cấu hình theo tháng

Mỗi tháng có một bộ cấu hình riêng. **[Chủ dự án]**

| Cấu hình | Ví dụ |
|---|---|
| Giờ bắt đầu khung tăng ca | 23:00 **[Chủ dự án]** |
| Giờ kết thúc khung tăng ca, thuộc ngày hôm sau | 06:00 **[Chủ dự án]** |
| Lương tăng ca theo giờ, một mức chung cho mọi nhân viên | Ví dụ 30.000 đ/giờ. Admin nhập số thật. **[Chủ dự án]** |
| Thời lượng tối đa của một ca | 16 giờ **[Claude]** |

**[Claude]** Khi tháng mới chưa có cấu hình, hệ thống sao chép cấu hình của tháng gần nhất trước đó.

### 8.3 Công thức cho part time

Khung tăng ca là khoảng từ 23:00 tới 06:00 sáng hôm sau. Mọi phút làm việc nằm trong khung này là giờ tăng ca, bất kể ca bắt đầu lúc nào. **[Chủ dự án]**

Với mỗi ca hợp lệ:

- Giờ tăng ca là số phút của ca nằm trong khung tăng ca.
- Giờ thường là số phút còn lại của ca.
- Tiền giờ thường = giờ thường × lương theo giờ có hiệu lực vào ngày của ca.
- Tiền tăng ca = giờ tăng ca × lương tăng ca theo giờ của tháng.

Giờ tăng ca nhận lương tăng ca theo giờ **thay cho** lương theo giờ của nhân viên. Giờ tăng ca không nhận thêm lương theo giờ. **[Chủ dự án]**

Lương part time của tháng = tổng tiền giờ thường + tổng tiền tăng ca + tổng các dòng + −.

Ví dụ cách chia giờ, với khung 23:00–06:00:

| Ca | Giờ thường | Giờ tăng ca |
|---|---|---|
| 18:00–23:30 | 5 giờ | 0,5 giờ |
| 00:30–03:00 | 0 | 2,5 giờ |
| 05:00–09:00 | 3 giờ | 1 giờ |
| 22:00 – 07:00 hôm sau | 2 giờ | 7 giờ |

### 8.4 Công thức cho full time

Lương full time của tháng = lương tháng cố định + tổng các dòng + −. **[Chủ dự án]**

Full time vẫn check in và check out. Giờ làm của full time chỉ để theo dõi, không ảnh hưởng tới lương. **[Chủ dự án]**

**[Claude]** Lương cố định chia theo số ngày lịch của tháng trong 3 trường hợp:

- Lương cố định đổi giữa tháng.
- Nhân viên bắt đầu làm giữa tháng. Ngày bắt đầu là ngày hiệu lực của mức lương đầu tiên.
- Nhân viên nghỉ việc giữa tháng. Ngày cuối là ngày nghỉ việc, xem mục 5.

### 8.5 Dòng + − lương

- Admin hoặc Giám đốc thêm dòng + hoặc − cho một nhân viên trong một tháng. **[Chủ dự án]**
- Số dương cộng vào lương. Số âm trừ khỏi lương. **[Chủ dự án]**
- Mỗi dòng phải có ghi chú lý do. **[Claude]**
- Tháng đã chốt không thêm hoặc xoá dòng được, trừ khi Admin hoặc Giám đốc mở lại tháng đó.

### 8.6 Làm tròn

**[Claude]** Hệ thống tính giờ làm theo phút. Mỗi dòng tiền trên phiếu lương được làm tròn tới đồng. Tổng lương là tổng các dòng đã làm tròn.

### 8.7 Ví dụ part time

Nhân viên A, part time. Mức lương: 25.000 đ/giờ từ 2026-10-01, 28.000 đ/giờ từ 2026-10-15. Cấu hình 2026-10: khung tăng ca 23:00–06:00, lương tăng ca 30.000 đ/giờ.

| Ca | Giờ thường | Giờ tăng ca | Tiền |
|---|---|---|---|
| 2026-10-10, 08:00–12:00 | 4 giờ × 25.000 | 0 | 100.000 |
| 2026-10-10, 18:00–23:30 | 5 giờ × 25.000 | 0,5 giờ × 30.000 | 125.000 + 15.000 |
| 2026-10-20, 20:00 – 2026-10-21, 01:00 | 3 giờ × 28.000 | 2 giờ × 30.000 | 84.000 + 60.000 |
| Dòng +: thưởng doanh số | | | 200.000 |
| Dòng −: phạt đi trễ | | | −100.000 |
| **Tổng** | | | **484.000** |

### 8.8 Ví dụ full time

Nhân viên B, full time. Mức lương: 9.000.000 đ/tháng từ 2026-09-01, 10.000.000 đ/tháng từ 2026-10-15. Tháng 2026-10 có 31 ngày.

- 14 ngày đầu: 9.000.000 × 14 / 31 = 4.064.516 đ.
- 17 ngày sau: 10.000.000 × 17 / 31 = 5.483.871 đ.
- Lương cố định của tháng: 9.548.387 đ.

## 9. Chốt tháng, mở lại, phiên bản

### 9.1 Chốt tháng

- Chỉ Admin hoặc Giám đốc chốt tháng. Một lần chốt áp dụng cho toàn công ty. **[Chủ dự án]**
- Hệ thống không cho chốt khi tháng còn ca "đang làm", "thiếu check out" hoặc "chờ duyệt". Trang chốt hiện danh sách các ca này. **[Claude]**
- Khi chốt, hệ thống tạo một phiếu lương cho mỗi nhân viên thoả ít nhất một điều kiện: có ngày nằm trong hiệu lực của một mức lương, có ca hợp lệ, hoặc có dòng + − trong tháng. **[Claude]** Vì vậy, nhân viên đã nghỉ việc vẫn nhận được phiếu lương khi Admin thêm dòng + − để quyết toán.
- Phiếu lương lưu đủ dữ liệu để hiển thị lại mà không cần đọc bảng gốc: từng ca, giờ thường, giờ tăng ca, chi nhánh, mức lương đã áp dụng, cấu hình tháng, các dòng + −, các tổng.
- Một nhân viên làm ở nhiều chi nhánh có một phiếu lương duy nhất. Phiếu lương ghi giờ làm theo từng chi nhánh. **[Chủ dự án]**

Sau khi chốt, sửa mức lương, cấu hình, ca hoặc dòng + − không làm thay đổi phiếu lương đã lưu. **[Chủ dự án]**

### 9.2 Khoá dữ liệu của tháng đã chốt

**[Claude]** Khi một tháng đã chốt, hệ thống từ chối mọi thao tác thay đổi ca, cấu hình và dòng + − của tháng đó. Mức lương vẫn thêm được bất cứ lúc nào, nhưng không ảnh hưởng phiếu lương đã chốt.

### 9.3 Mở lại và phiên bản

- Admin hoặc Giám đốc mở lại tháng đã chốt. Người mở phải nhập lý do. **[Chủ dự án]**
- Hệ thống lưu người mở, thời điểm mở, lý do và bộ phiếu lương trước khi mở. **[Chủ dự án]**
- Khi chốt lại, hệ thống tạo một phiên bản phiếu lương mới. Các phiên bản cũ vẫn xem được. **[Chủ dự án]**
- Nhân viên chỉ thấy phiên bản mới nhất. **[Claude]**

### 9.4 Nhật ký thay đổi

**[Claude]** Hệ thống ghi nhật ký cho các thao tác: sửa ca, duyệt ca, từ chối ca, thêm ca bằng tay, thêm mức lương, sửa cấu hình tháng, thêm và xoá dòng + −, chốt tháng, mở lại tháng, đổi quyền quản lý. Mỗi dòng nhật ký có người thực hiện, thời điểm, dữ liệu trước và dữ liệu sau.

Bản đầu chỉ hiện nhật ký trong chi tiết của ca và trong danh sách phiên bản phiếu lương.

### 9.5 Xuất Excel

Admin hoặc Giám đốc tải bảng lương của một tháng đã chốt về file `.xlsx`. **[Chủ dự án]**

Mỗi dòng là một nhân viên. Các cột gồm: họ tên, số điện thoại, loại nhân viên, giờ làm theo từng chi nhánh, giờ thường, giờ tăng ca, tiền giờ thường, tiền tăng ca, lương cố định, tổng dòng +, tổng dòng −, tổng lương. **[Claude]**

## 10. Màn hình

Mọi màn hình phải dùng được trên điện thoại. Màn hình của nhân viên ưu tiên điện thoại. Màn hình của Admin và Giám đốc ưu tiên máy tính. **[Claude]**

### 10.1 Nhân viên

| Màn hình | Nội dung |
|---|---|
| Đăng nhập | Số điện thoại, mật khẩu. |
| Đổi mật khẩu | Bắt buộc ở lần đăng nhập đầu. |
| Check in / check out | Chi nhánh được chọn, khung camera, nút chụp, nút check in hoặc check out, kết quả. |
| Ca của tôi | Danh sách ca theo tháng: ngày, chi nhánh, giờ in, giờ out, số giờ, trạng thái, lý do. |
| Lương của tôi | Lương tạm tính của tháng đang mở, ghi rõ "tạm tính". Phiếu lương các tháng đã chốt. |

### 10.2 Quản lý

Quản lý có mọi màn hình của nhân viên, cộng thêm:

| Màn hình | Quyền cần có |
|---|---|
| Ca tại chi nhánh: lọc theo ngày, chi nhánh, trạng thái. Danh sách hiện ảnh nhỏ của từng ca để quản lý so khuôn mặt nhanh. Chi tiết ca hiện ảnh lớn, khoảng cách tới chi nhánh, độ chính xác của toạ độ, và link mở vị trí đó trên Google Maps. | `shifts.view` |
| Duyệt ca "chờ duyệt". Từ chối mọi ca của tháng đang mở. | `shifts.review` |
| Nhập giờ check out, sửa giờ, thêm ca bằng tay. | `shifts.edit` |

### 10.3 Admin và Giám đốc

| Màn hình | Nội dung |
|---|---|
| Nhân viên | Danh sách, tạo, sửa, khoá, đặt lại mật khẩu, mức lương theo ngày hiệu lực. |
| Chi nhánh | Tên, địa chỉ, link Google Maps, toạ độ lấy từ link, bán kính. Xem mục 6.1. |
| Quản lý | Gán chi nhánh, bật tắt quyền. |
| Ca | Giống màn hình của quản lý, áp dụng cho mọi chi nhánh. |
| Cấu hình tháng | Khung tăng ca, lương tăng ca theo giờ, thời lượng tối đa của một ca. |
| Bảng lương tháng | Lương tạm tính của mọi nhân viên, dòng + −, danh sách ca chặn việc chốt, nút chốt, nút mở lại, danh sách phiên bản, nút xuất Excel. |

## 11. Kiến trúc kỹ thuật

### 11.1 Công nghệ

| Phần | Công nghệ |
|---|---|
| Web | Next.js 16 App Router, Tailwind CSS 4. Repo `cn` đang dùng. |
| Database | Supabase Postgres. |
| Đăng nhập | Supabase Auth, email nội bộ tạo từ số điện thoại, và mật khẩu. Không dùng SMS. |
| Lưu ảnh | Supabase Storage, bucket private. |
| Camera | `navigator.mediaDevices.getUserMedia` với camera trước. Trang vẽ khung hình lên `canvas` rồi xuất JPEG. |
| Vị trí | `navigator.geolocation.getCurrentPosition` với `enableHighAccuracy`. |
| Toạ độ chi nhánh | Route Handler đi theo redirect của link Google Maps, rồi đọc toạ độ điểm ghim từ link đầy đủ. |
| Excel | Một thư viện tạo `.xlsx`, cài với `--save-exact`, chạy trong Route Handler. |

### 11.2 Luồng dữ liệu

- Mọi truy vấn database nằm trong Route Handler `app/api/**/route.ts`, theo `AGENTS.md`.
- FE đọc dữ liệu bằng hook `useFetch`. FE gửi thao tác ghi bằng một hook dùng chung cho request POST, PATCH, DELETE. Repo chưa có hook này.
- Đăng nhập và đăng xuất đi qua Route Handler. Project không có Supabase client trên trình duyệt.
- Ảnh đi qua Route Handler để upload. Khi xem ảnh, Route Handler tạo signed URL có thời hạn ngắn.
- Route Handler check in và check out tự tính khoảng cách và tự quyết định lý do không đạt. Client chỉ gửi toạ độ, độ chính xác và ảnh.

### 11.3 Kiểm tra quyền

**[Claude]** RLS trong Postgres là nơi kiểm tra quyền. Route Handler dùng session của người dùng đang đăng nhập. Mọi bảng phải bật RLS và có policy theo mục 4.

**[Claude]** Secret key chỉ dùng cho Supabase Auth Admin API: tạo tài khoản và đặt lại mật khẩu. Route Handler phải kiểm tra người gọi là Admin hoặc Giám đốc trước khi dùng secret key.

### 11.4 Tính lương

**[Claude]** Một hàm thuần duy nhất tính phiếu lương từ dữ liệu đầu vào: ca, mức lương, cấu hình tháng, dòng + −. Lương tạm tính và chốt tháng dùng cùng hàm này. Hàm phải có unit test, gồm 2 ví dụ ở mục 8.7 và 8.8.

**[Claude]** Chốt tháng chạy trong một transaction: đọc dữ liệu, tính, ghi phiếu lương, đánh dấu tháng đã chốt.

### 11.5 Mô hình dữ liệu gợi ý

Người code có thể đổi tên và tách gộp bảng, miễn đáp ứng các quy tắc trên.

| Bảng | Nội dung chính |
|---|---|
| `employees` | id (trùng id tài khoản Auth), họ tên, số điện thoại, vai trò, trạng thái hoạt động, ngày nghỉ việc, cần đổi mật khẩu. |
| `pay_rates` | nhân viên, loại nhân viên, số tiền, ngày bắt đầu hiệu lực. |
| `branches` | tên, địa chỉ, link Google Maps, vĩ độ, kinh độ, bán kính. |
| `manager_branches` | quản lý, chi nhánh. |
| `manager_permissions` | quản lý, mã quyền. |
| `shifts` | nhân viên, chi nhánh, dữ liệu check in, dữ liệu check out, trạng thái, lý do không đạt, nguồn tạo (check in hay nhập tay). |
| `monthly_configs` | tháng, giờ bắt đầu và giờ kết thúc khung tăng ca, lương tăng ca theo giờ, thời lượng tối đa của một ca. |
| `pay_adjustments` | nhân viên, tháng, số tiền có dấu, ghi chú, người tạo. |
| `payroll_periods` | tháng, trạng thái (đang mở, đã chốt), phiên bản đang dùng. |
| `payroll_versions` | tháng, số phiên bản, người chốt, thời điểm chốt, người mở lại, thời điểm mở lại, lý do mở lại. |
| `payslips` | phiên bản, nhân viên, dữ liệu phiếu lương dạng JSON, tổng lương. |
| `audit_logs` | người thực hiện, thời điểm, loại thao tác, bảng, id dòng, dữ liệu trước, dữ liệu sau. |

## 12. Rủi ro đã biết

| Rủi ro | Tác động | Cách giảm |
|---|---|---|
| App giả vị trí trên Android. | Nhân viên check in từ xa với vị trí giả. Khi không kiểm tra wifi, ảnh là lớp kiểm tra duy nhất còn lại. | Quản lý xem ảnh. Ảnh cho thấy khung cảnh phía sau nhân viên. |
| GPS trong nhà lệch 20–50 m, có lúc lệch hơn 100 m. | Nhân viên ở trong quán vẫn bị "chờ duyệt" với lý do `outside_radius`. | Admin tăng bán kính của chi nhánh đó. Hệ thống lưu độ chính xác của toạ độ để quản lý xem khi duyệt. |
| Link Google Maps trỏ tới một khu vực, không trỏ tới điểm ghim. | Toạ độ chi nhánh sai. | Form hiện toạ độ để Admin kiểm tra trước khi lưu. Admin nhập toạ độ bằng tay khi cần. |
| Google đổi định dạng link hoặc chặn request từ server. | Route Handler không lấy được toạ độ từ link. | Admin nhập toạ độ bằng tay. |
| Người dùng có kỹ thuật can thiệp vào trang để gửi ảnh có sẵn. | Ảnh không phải ảnh chụp tại chỗ. | Quản lý xem ảnh. Bản đầu chấp nhận rủi ro này. |
| Dung lượng ảnh tăng theo số ca. | Chi phí Storage tăng. | Ảnh JPEG nén, kích thước nhỏ. Chính sách xoá ảnh cũ nằm ngoài bản đầu. |

## 13. Phần để người code quyết định

- Tên bảng, tên cột, kiểu dữ liệu chi tiết.
- Cách viết policy RLS và các hàm SQL hỗ trợ.
- Cấu trúc thư mục bên trong `components/<feature>/` và tên Route Handler.
- Độ phân giải và chất lượng nén JPEG.
- Thư viện tạo `.xlsx`.
- Cách đọc toạ độ từ các dạng link Google Maps.
- Giao diện chi tiết của từng màn hình, theo WCAG AA.
- Thứ tự làm các phần trong kế hoạch.
