"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Switch } from "@/components/ui/switch";
import { TextField } from "@/components/ui/text-field";
import { useMutation } from "@/hooks/use-mutation";
import { useToast } from "@/hooks/use-toast";
import { normalizePhone } from "@/lib/auth/phone";
import {
  EMPLOYMENT_TYPE_LABELS,
  formatPhone,
  ROLE_LABELS,
} from "@/lib/employees/labels";
import type { Employee, EmployeeRole, EmploymentType } from "@/types/employee";

const inputClass =
  "ui-field";

const MIN_PASSWORD_LENGTH = 8;

// The password is only set when the employee is created.
function employeeSchema(isCreate: boolean) {
  return z.object({
    fullName: z.string().trim().min(1, "Họ tên là bắt buộc."),
    phone: z
      .string()
      .trim()
      .min(1, "Số điện thoại là bắt buộc.")
      .refine((phone) => normalizePhone(phone) !== null, "Số điện thoại phải có 10 chữ số và bắt đầu bằng 0."),
    role: z.enum(["admin", "director", "manager", "staff"]),
    employmentType: z.enum(["full_time", "part_time"]),
    requiresAttendance: z.boolean(),
    password: isCreate
      ? z
          .string()
          .min(1, "Mật khẩu ban đầu là bắt buộc.")
          .min(MIN_PASSWORD_LENGTH, `Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`)
      : z.string(),
  });
}

type EmployeeValues = z.infer<ReturnType<typeof employeeSchema>>;

const isAttendanceLocked = (role: EmployeeRole) => role === "admin" || role === "director";

type EmployeeFormProps = {
  employee?: Employee;
  onSaved: (employee: Employee) => void;
};

export function EmployeeForm({ employee, onSaved }: EmployeeFormProps) {
  const { mutate, isPending } = useMutation<Employee>();
  const showToast = useToast();
  const { register, control, handleSubmit, setValue, formState: { errors } } = useForm<EmployeeValues>({
    resolver: zodResolver(employeeSchema(!employee)),
    mode: "onTouched",
    defaultValues: {
      fullName: employee?.fullName ?? "",
      phone: employee ? formatPhone(employee.phone) : "",
      role: employee?.role ?? "staff",
      employmentType: employee?.employmentType ?? "part_time",
      requiresAttendance: employee?.requiresAttendance ?? true,
      password: "",
    },
  });
  const attendanceLocked = isAttendanceLocked(useWatch({ control, name: "role" }));

  async function save({ password, ...values }: EmployeeValues) {
    const fields = { ...values, requiresAttendance: !isAttendanceLocked(values.role) && values.requiresAttendance };
    let result: Employee;
    try {
      result = employee
        ? await mutate(`/api/admin/employees/${employee.id}`, { method: "PATCH", body: fields })
        : await mutate("/api/admin/employees", { method: "POST", body: { ...fields, password } });
    } catch (caught) {
      if (caught instanceof Error) showToast(caught.message, "error");
      return;
    }
    onSaved(result);
  }

  return (
    <form onSubmit={handleSubmit(save)} noValidate className="ui-card flex max-w-2xl flex-col gap-5">
      <TextField
        id="employee-full-name"
        label="Họ tên"
        required
        type="text"
        autoComplete="off"
        {...register("fullName")}
        error={errors.fullName?.message}
      />
      <TextField
        id="employee-phone"
        label="Số điện thoại"
        required
        type="tel"
        inputMode="tel"
        autoComplete="off"
        {...register("phone")}
        hint="10 chữ số, bắt đầu bằng 0. Ví dụ: 0907039628."
        error={errors.phone?.message}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="employee-role" className="ui-label">
          Vai trò
        </label>
        <select
          id="employee-role"
          {...register("role", {
            onChange: (event) => {
              if (isAttendanceLocked(event.target.value)) setValue("requiresAttendance", false);
            },
          })}
          className={inputClass}
        >
          {(Object.keys(ROLE_LABELS) as EmployeeRole[]).map((value) => (
            <option key={value} value={value}>
              {ROLE_LABELS[value]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="employee-employment-type" className="ui-label">
          Hình thức làm việc
        </label>
        <select id="employee-employment-type" {...register("employmentType")} className={inputClass}>
          {(Object.keys(EMPLOYMENT_TYPE_LABELS) as EmploymentType[]).map((value) => (
            <option key={value} value={value}>
              {EMPLOYMENT_TYPE_LABELS[value]}
            </option>
          ))}
        </select>
        <p className="ui-hint">
          Dùng làm loại mặc định khi thêm mức lương. Cách tính lương theo từng mức lương, không quyết định việc chấm công.
        </p>
      </div>
      <div className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-4">
        <Controller
          control={control}
          name="requiresAttendance"
          render={({ field }) => (
            <Switch
              checked={!attendanceLocked && field.value}
              disabled={attendanceLocked}
              onChange={field.onChange}
              label="Cần chấm công"
              description={
                attendanceLocked ? "Admin và giám đốc không chấm công." : "Bật để nhân viên dùng Chấm công và Ca của tôi."
              }
            />
          )}
        />
      </div>
      {!employee && (
        <TextField
          id="employee-password"
          label="Mật khẩu ban đầu"
          required
          type="password"
          autoComplete="new-password"
          {...register("password")}
          hint={`Ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`}
          error={errors.password?.message}
        />
      )}
      <button type="submit" disabled={isPending} className="ui-btn">
        {employee ? "Lưu" : "Tạo nhân viên"}
      </button>
    </form>
  );
}
