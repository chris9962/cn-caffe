"use client";

import { useState, type FormEvent } from "react";
import { ErrorMessage } from "@/components/ui/error-message";
import { Switch } from "@/components/ui/switch";
import { useMutation } from "@/hooks/use-mutation";
import type { Branch } from "@/types/branch";

const inputClass = "ui-field";
const buttonClass = "ui-btn";

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
  const save = useMutation<Branch>();
  const resolve = useMutation<ResolvedLink>();
  const [name, setName] = useState(branch?.name ?? "");
  const [address, setAddress] = useState(branch?.address ?? "");
  const [googleMapsUrl, setGoogleMapsUrl] = useState(branch?.googleMapsUrl ?? "");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(
    branch ? { latitude: branch.latitude, longitude: branch.longitude } : null,
  );
  const [isLocating, setIsLocating] = useState(false);
  const [locationNote, setLocationNote] = useState<LocationNote | null>(null);
  const [radiusM, setRadiusM] = useState(String(branch?.radiusM ?? 20));
  const [isActive, setIsActive] = useState(branch?.isActive ?? true);

  const [radiusError, setRadiusError] = useState<string | null>(null);

  function handleLinkChange(value: string) {
    setGoogleMapsUrl(value);
    // The old coordinates belong to the old link; keeping them would let a new link be saved with a stale place.
    setCoordinates(null);
    setLocationNote(null);
  }

  async function handleResolve() {
    let result: ResolvedLink;
    try {
      result = await resolve.mutate("/api/admin/branches/resolve-map-link", {
        method: "POST",
        body: { url: googleMapsUrl },
      });
    } catch {
      return;
    }
    setCoordinates({ latitude: result.latitude, longitude: result.longitude });
    setLocationNote(null);
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
            ? { kind: "warning", text: `Độ chính xác khoảng ${accuracy} m. Bạn nên đứng tại quán, bật GPS rồi thử lại.` }
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
              : "Không lấy được vị trí. Bạn thử lại hoặc dán link Google Maps.",
        });
      },
      LOCATION_OPTIONS,
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!coordinates) return;
    const radius = Number(radiusM);
    if (radiusM.trim() === "" || !Number.isInteger(radius) || radius < 1) {
      setRadiusError("Bán kính phải là số nguyên dương.");
      return;
    }
    setRadiusError(null);
    const fields = {
      name,
      address,
      googleMapsUrl: googleMapsUrl.trim() === "" ? null : googleMapsUrl,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      radiusM: radius,
    };
    let result: Branch;
    try {
      result = branch
        ? await save.mutate(`/api/admin/branches/${branch.id}`, {
            method: "PATCH",
            body: { ...fields, isActive },
          })
        : await save.mutate("/api/admin/branches", { method: "POST", body: fields });
    } catch {
      return;
    }
    onSaved(result);
  }

  return (
    <form onSubmit={handleSubmit} className="ui-card flex max-w-2xl flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="branch-name" className="ui-label">
          Tên
        </label>
        <input
          id="branch-name"
          type="text"
          autoComplete="off"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="branch-address" className="ui-label">
          Địa chỉ
        </label>
        <input
          id="branch-address"
          type="text"
          autoComplete="off"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          className={inputClass}
        />
      </div>

      <fieldset className="flex flex-col gap-4 rounded-lg border border-[var(--line)] p-4">
        <legend className="ui-label px-1">Vị trí quán</legend>
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
            "Chưa có toạ độ. Bạn dùng vị trí hiện tại hoặc dán link Google Maps."
          )}
        </p>

        <button type="button" onClick={handleUseCurrentLocation} disabled={isLocating} className="ui-btn-quiet">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4">
            <path d="M12 21s7-5.1 7-12a7 7 0 1 0-14 0c0 6.9 7 12 7 12Z" />
            <circle cx="12" cy="9" r="2.5" />
          </svg>
          {isLocating ? "Đang lấy vị trí..." : "Dùng vị trí hiện tại"}
        </button>
        {locationNote?.kind === "error" && <ErrorMessage message={locationNote.text} />}
        {locationNote?.kind === "warning" && (
          <p className="rounded-lg bg-[var(--warning-soft)] px-3 py-2 text-sm text-[var(--warning)]">{locationNote.text}</p>
        )}
        {locationNote?.kind === "success" && <p className="ui-hint">{locationNote.text}</p>}

        <div className="flex flex-col gap-2 border-t border-[var(--line)] pt-4">
          <label htmlFor="branch-maps-url" className="ui-label">
            Hoặc dán link Google Maps
          </label>
          <div className="flex gap-2">
            <input
              id="branch-maps-url"
              type="url"
              autoComplete="off"
              value={googleMapsUrl}
              onChange={(event) => handleLinkChange(event.target.value)}
              aria-describedby="branch-maps-hint"
              className={`${inputClass} min-w-0 flex-1`}
            />
            <button
              type="button"
              onClick={handleResolve}
              disabled={resolve.isPending || googleMapsUrl.trim() === ""}
              className={`${buttonClass} shrink-0`}
            >
              Lấy toạ độ
            </button>
          </div>
          <p id="branch-maps-hint" className="ui-hint">
            Mở Google Maps, chọn đúng quán, bấm &quot;Chia sẻ&quot; rồi copy link dán vào đây.
          </p>
          {resolve.error && <ErrorMessage message={resolve.error} />}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="branch-radius" className="ui-label">
          Bán kính (m)
        </label>
        <input
          id="branch-radius"
          type="number"
          step="any"
          min={1}
          value={radiusM}
          onChange={(event) => setRadiusM(event.target.value)}
          aria-invalid={radiusError ? true : undefined}
          className={inputClass}
        />
        {radiusError && <ErrorMessage message={radiusError} />}
      </div>
      {branch && (
        <Switch
          checked={isActive}
          onChange={setIsActive}
          label="Đang hoạt động"
          description="Tắt để ẩn chi nhánh khỏi danh sách chấm công."
        />
      )}
      {save.error && <ErrorMessage message={save.error} />}
      <button type="submit" disabled={save.isPending || !coordinates} className={buttonClass}>
        Lưu
      </button>
    </form>
  );
}
