"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, type ChangeEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { ErrorMessage } from "@/components/ui/error-message";
import { Switch } from "@/components/ui/switch";
import { TextField } from "@/components/ui/text-field";
import { useMutation } from "@/hooks/use-mutation";
import { useToast } from "@/hooks/use-toast";
import type { Branch } from "@/types/branch";

const inputClass = "ui-field";

const branchSchema = z.object({
  name: z.string().trim().min(1, "Tên chi nhánh là bắt buộc."),
  address: z.string().trim(),
  // An empty number input reads as NaN, which z.number rejects with this message.
  radiusM: z
    .number({ error: "Bán kính là bắt buộc." })
    .int("Bán kính phải là số nguyên dương.")
    .min(1, "Bán kính phải là số nguyên dương."),
  isActive: z.boolean(),
});

type BranchValues = z.infer<typeof branchSchema>;

const LOCATION_OPTIONS: PositionOptions = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 };
// Above this the fix usually comes from Wi-Fi or cell towers, too rough for a check-in radius of about 20 m.
const ROUGH_ACCURACY_M = 50;

type Coordinates = { latitude: number; longitude: number };
type ResolvedLink = Coordinates & { resolvedUrl: string };
type LocationNote = { kind: "success" | "warning" | "error"; text: string };

type BranchFormProps = {
  branch?: Branch;
  onSaved: (branch: Branch) => void;
};

export function BranchForm({ branch, onSaved }: BranchFormProps) {
  const saveBranch = useMutation<Branch>();
  const resolve = useMutation<ResolvedLink>();
  const showToast = useToast();
  const { register, control, handleSubmit, formState: { errors, isSubmitted } } = useForm<BranchValues>({
    resolver: zodResolver(branchSchema),
    mode: "onTouched",
    defaultValues: {
      name: branch?.name ?? "",
      address: branch?.address ?? "",
      radiusM: branch?.radiusM ?? 20,
      isActive: branch?.isActive ?? true,
    },
  });
  const [googleMapsUrl, setGoogleMapsUrl] = useState(branch?.googleMapsUrl ?? "");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(
    branch ? { latitude: branch.latitude, longitude: branch.longitude } : null,
  );
  const [isLocating, setIsLocating] = useState(false);
  const [locationNote, setLocationNote] = useState<LocationNote | null>(null);
  const [checkedLink, setCheckedLink] = useState<string | null>(null);

  const isLinkChecked = checkedLink !== null && checkedLink === googleMapsUrl.trim();

  async function resolveLink(link: string) {
    const url = link.trim();
    if (url === "") return;
    setCheckedLink(url);
    let result: ResolvedLink;
    try {
      result = await resolve.mutate("/api/admin/branches/resolve-map-link", {
        method: "POST",
        body: { url },
      });
    } catch {
      return;
    }
    setCoordinates({ latitude: result.latitude, longitude: result.longitude });
    setLocationNote(null);
  }

  function handleLinkChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setGoogleMapsUrl(value);
    // The old coordinates belong to the old link; keeping them would let a new link be saved with a stale place.
    setCoordinates(null);
    setLocationNote(null);
    if ((event.nativeEvent as InputEvent).inputType === "insertFromPaste") void resolveLink(value);
  }

  // Covers a link typed by hand or inserted by a phone keyboard, which do not count as a paste.
  function handleLinkBlur() {
    if (!coordinates && googleMapsUrl.trim() !== checkedLink) void resolveLink(googleMapsUrl);
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationNote({ kind: "error", text: "Trình duyệt này không lấy được vị trí." });
      return;
    }
    setIsLocating(true);
    setLocationNote(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setIsLocating(false);
        setCoordinates({ latitude: coords.latitude, longitude: coords.longitude });
        // A pasted link would describe a different place than the device position.
        setGoogleMapsUrl("");
        const accuracy = Math.round(coords.accuracy);
        setLocationNote(
          accuracy > ROUGH_ACCURACY_M
            ? { kind: "warning", text: `Độ chính xác khoảng ${accuracy} m. Bạn nên đứng tại chi nhánh, bật GPS rồi thử lại.` }
            : { kind: "success", text: `Đã lấy vị trí hiện tại, độ chính xác khoảng ${accuracy} m.` },
        );
      },
      (error) => {
        setIsLocating(false);
        setLocationNote({
          kind: "error",
          text:
            error.code === error.PERMISSION_DENIED
              ? "Bạn cần cho phép trình duyệt dùng vị trí."
              : "Không lấy được vị trí. Bạn thử lại hoặc dán liên kết Google Maps.",
        });
      },
      LOCATION_OPTIONS,
    );
  }

  async function save({ isActive, ...values }: BranchValues) {
    if (!coordinates) return;
    const fields = {
      ...values,
      googleMapsUrl: googleMapsUrl.trim() === "" ? null : googleMapsUrl,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    };
    let result: Branch;
    try {
      result = branch
        ? await saveBranch.mutate(`/api/admin/branches/${branch.id}`, {
            method: "PATCH",
            body: { ...fields, isActive },
          })
        : await saveBranch.mutate("/api/admin/branches", { method: "POST", body: fields });
    } catch (caught) {
      if (caught instanceof Error) showToast(caught.message, "error");
      return;
    }
    onSaved(result);
  }

  return (
    <form onSubmit={handleSubmit(save)} noValidate className="ui-card flex max-w-2xl flex-col gap-5">
      <TextField
        id="branch-name"
        label="Tên chi nhánh"
        required
        type="text"
        autoComplete="off"
        {...register("name")}
        error={errors.name?.message}
      />
      <TextField id="branch-address" label="Địa chỉ" type="text" autoComplete="off" {...register("address")} />

      <fieldset className="flex flex-col gap-4 rounded-lg border border-[var(--line)] p-4">
        <legend className="ui-label px-1">
          Vị trí chi nhánh
          <span aria-hidden="true" className="ml-0.5 text-[var(--danger)]">
            *
          </span>
        </legend>
        {isSubmitted && !coordinates && <ErrorMessage message="Vị trí chi nhánh là bắt buộc." />}
        <p role="status" className="text-sm">
          {coordinates ? (
            <>
              <span className="font-semibold">
                {coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}
              </span>{" "}
              {/* Built from coordinates, never the stored link: an admin could have saved any string there. */}
              <a
                href={`https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ui-link"
              >
                Xem trên bản đồ<span className="sr-only"> (mở tab mới)</span>
              </a>
            </>
          ) : (
            "Chưa có toạ độ. Bạn dùng vị trí hiện tại hoặc dán liên kết Google Maps."
          )}
        </p>

        <button type="button" onClick={handleUseCurrentLocation} disabled={isLocating} className="ui-btn-quiet">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4">
            <path d="M12 21s7-5.1 7-12a7 7 0 1 0-14 0c0 6.9 7 12 7 12Z" />
            <circle cx="12" cy="9" r="2.5" />
          </svg>
          {isLocating ? "Đang lấy vị trí…" : "Dùng vị trí hiện tại"}
        </button>
        {locationNote?.kind === "error" && <ErrorMessage message={locationNote.text} />}
        {locationNote?.kind === "warning" && (
          <p className="rounded-lg bg-[var(--warning-soft)] px-3 py-2 text-sm text-[var(--warning)]">{locationNote.text}</p>
        )}
        {locationNote?.kind === "success" && <p className="ui-hint">{locationNote.text}</p>}

        <div className="flex flex-col gap-2 border-t border-[var(--line)] pt-4">
          <label htmlFor="branch-maps-url" className="ui-label">
            Hoặc dán liên kết Google Maps
          </label>
          <input
            id="branch-maps-url"
            type="url"
            autoComplete="off"
            value={googleMapsUrl}
            onChange={handleLinkChange}
            onBlur={handleLinkBlur}
            readOnly={resolve.isPending}
            aria-describedby="branch-maps-hint"
            className={inputClass}
          />
          <p id="branch-maps-hint" className="ui-hint">
            Mở Google Maps, chọn đúng chi nhánh, bấm &quot;Chia sẻ&quot; rồi sao chép liên kết. Sau khi bạn dán liên kết vào
            đây, ứng dụng tự lấy toạ độ.
          </p>
          {resolve.isPending && <p className="ui-hint font-medium">Đang lấy toạ độ từ liên kết…</p>}
          {isLinkChecked && resolve.error && <ErrorMessage message={resolve.error} />}
          {/* The coordinates line sits at the top of the box, often off screen on a phone, so the result also shows here. */}
          {isLinkChecked && coordinates && (
            <p className="rounded-lg bg-[var(--success-soft)] px-3 py-2 text-sm text-[var(--success)]">
              Đã lấy toạ độ {coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}. Bạn bấm &quot;Lưu&quot; để lưu
              chi nhánh.
            </p>
          )}
        </div>
      </fieldset>

      <TextField
        id="branch-radius"
        label="Bán kính (m)"
        required
        type="number"
        inputMode="numeric"
        step="any"
        min={1}
        {...register("radiusM", { valueAsNumber: true })}
        error={errors.radiusM?.message}
      />
      {branch && (
        <Controller
          control={control}
          name="isActive"
          render={({ field }) => (
            <Switch
              checked={field.value}
              onChange={field.onChange}
              label="Đang hoạt động"
              description="Tắt để ẩn chi nhánh khỏi danh sách chấm công."
            />
          )}
        />
      )}
      <button type="submit" disabled={saveBranch.isPending} className="ui-btn">
        Lưu
      </button>
    </form>
  );
}
