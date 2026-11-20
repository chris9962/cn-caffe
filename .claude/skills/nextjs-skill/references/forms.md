# Quy tắc form

Form dùng `react-hook-form` và `zod`, ô văn bản dùng `TextField`. Người dùng chọn cách này vì code tự viết có ternary lồng nhau và nhiều biến trạng thái lỗi, khó đọc. Form mẫu: `components/employees/employee-form.tsx` và `components/branches/branch-form.tsx`.

## Mục lục

1. Hành vi người dùng thấy
2. Mẫu code
3. Schema và câu lỗi
4. Giá trị không đến từ ô nhập
5. Chỗ dễ sai

## 1. Hành vi người dùng thấy

| Thời điểm | Hành vi |
|---|---|
| Trước khi nhập | Ô bắt buộc có dấu `*` đỏ cạnh nhãn. Ô có định dạng riêng có dòng gợi ý dưới ô, ví dụ "10 chữ số, bắt đầu bằng 0. Ví dụ: 0907039628." |
| Đang gõ lần đầu | Không báo lỗi, để giá trị gõ dở không bị báo sai |
| Rời ô | Form kiểm tra ô đó và hiện lỗi dưới ô |
| Gõ lại sau khi đã rời ô | Lỗi cập nhật theo từng ký tự |
| Bấm nút lưu khi còn ô sai | Mọi ô sai hiện lỗi. Focus chuyển tới ô sai đầu tiên. Form không gửi request |
| Đang lưu | Nút bị khoá |
| Server trả lỗi | Toast lỗi có câu tiếng Việt từ server |
| Lưu thành công | Toast thành công, hoặc chuyển trang |

Nút lưu luôn bấm được, trừ lúc đang lưu. Bạn không khoá nút khi form còn ô sai. Nút bị khoá không cho người dùng biết lý do.

## 2. Mẫu code

```tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { TextField } from "@/components/ui/text-field";
import { useMutation } from "@/hooks/use-mutation";
import { useToast } from "@/hooks/use-toast";
import { normalizePhone } from "@/lib/auth/phone";

const contactSchema = z.object({
  fullName: z.string().trim().min(1, "Họ tên là bắt buộc."),
  phone: z
    .string()
    .trim()
    .min(1, "Số điện thoại là bắt buộc.")
    .refine((phone) => normalizePhone(phone) !== null, "Số điện thoại phải có 10 chữ số và bắt đầu bằng 0."),
});

type ContactValues = z.infer<typeof contactSchema>;

export function ContactForm({ onSaved }: { onSaved: (contact: Contact) => void }) {
  const { mutate, isPending } = useMutation<Contact>();
  const showToast = useToast();
  const { register, handleSubmit, formState: { errors } } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    mode: "onTouched",
    defaultValues: { fullName: "", phone: "" },
  });

  async function save(values: ContactValues) {
    let result: Contact;
    try {
      result = await mutate("/api/contacts", { method: "POST", body: values });
    } catch (caught) {
      if (caught instanceof Error) showToast(caught.message, "error");
      return;
    }
    onSaved(result);
  }

  return (
    <form onSubmit={handleSubmit(save)} noValidate className="ui-card flex max-w-2xl flex-col gap-5">
      <TextField
        id="contact-full-name"
        label="Họ tên"
        required
        autoComplete="off"
        {...register("fullName")}
        error={errors.fullName?.message}
      />
      <TextField
        id="contact-phone"
        label="Số điện thoại"
        required
        type="tel"
        inputMode="tel"
        {...register("phone")}
        hint="10 chữ số, bắt đầu bằng 0. Ví dụ: 0907039628."
        error={errors.phone?.message}
      />
      <button type="submit" disabled={isPending} className="ui-btn">
        Lưu
      </button>
    </form>
  );
}
```

Các điểm bắt buộc trong mẫu:
- `mode: "onTouched"`: lỗi hiện khi rời ô, rồi cập nhật theo từng ký tự.
- `noValidate` trên `<form>`: tắt bong bóng lỗi của trình duyệt, để `zod` báo lỗi bằng tiếng Việt.
- `required` trên `TextField`: hiện dấu `*` và báo cho trình đọc màn hình.
- `mutate` nằm trong `try`, còn `onSaved` nằm sau `try`. Lỗi của `onSaved` không bị hiện thành lỗi lưu.

## 3. Schema và câu lỗi

| Trường hợp | Cách viết |
|---|---|
| Ô văn bản bắt buộc | `z.string().trim().min(1, "X là bắt buộc.")` |
| Ô có định dạng | Thêm `.refine(check, "X phải ...")` sau `.min(1, ...)`. Lỗi đầu tiên là lỗi hiện ra |
| Ô số | `register("x", { valueAsNumber: true })` và `z.number({ error: "X là bắt buộc." })`. Ô trống cho giá trị `NaN`, và `z.number` báo câu "là bắt buộc" |
| Số nguyên dương | `.int("X phải là số nguyên dương.").min(1, "X phải là số nguyên dương.")` |
| Ô không bắt buộc | `z.string().trim()` |
| `select` | `z.enum([...])` với đúng các giá trị của kiểu trong `types/` |
| Quy tắc khác nhau khi tạo và khi sửa | Hàm trả schema, ví dụ `employeeSchema(isCreate)` |

Mọi ô có trong form phải có trong schema. `zod` bỏ các key không có trong schema, nên ô thiếu trong schema sẽ mất khỏi dữ liệu gửi đi.

Hàm kiểm tra dùng chung với server nằm trong `lib/`, ví dụ `normalizePhone`. Như vậy form và Route Handler dùng cùng một quy tắc.

## 4. Giá trị không đến từ ô nhập

| Loại giá trị | Cách làm |
|---|---|
| `Switch`, component tuỳ biến | `Controller` của `react-hook-form` |
| Giá trị cần đọc khi render | `useWatch({ control, name })`. Không dùng `watch()`, vì `watch()` không hợp với React Compiler |
| Đổi ô này khi ô khác đổi | `register("role", { onChange })` rồi `setValue(...)` trong handler |
| Giá trị đến từ GPS, API, link | Giữ trong `useState`. Hàm `save` kiểm tra giá trị đó. Lỗi hiện khi `formState.isSubmitted` và giá trị còn thiếu |

Ví dụ trong form chi nhánh: toạ độ đến từ GPS hoặc từ link Google Maps, nên toạ độ nằm trong `useState`. Câu "Vị trí quán là bắt buộc." hiện khi `isSubmitted && !coordinates`.

## 5. Chỗ dễ sai

- `TextField` truyền `ref` của `register` xuống `<input>`. Focus vào ô sai đầu tiên cần `ref` này, nên bạn không bọc `<input>` trong component khác mà làm mất `ref`.
- Form trong `Modal`: toast bị `<dialog>` che. Bạn kiểm tra thứ tự lớp hiển thị trước khi chuyển lỗi của form trong modal sang toast.
- Form tạo mới cần reset sau khi lưu: component cha đổi `key` của form.
- Không kiểm tra định dạng chỉ ở FE. Route Handler vẫn phải kiểm tra lại, vì request có thể không đến từ form.
