"use client";

import { useState, type FormEvent } from "react";
import { ErrorMessage } from "@/components/ui/error-message";
import { useMutation } from "@/hooks/use-mutation";
import type { Branch } from "@/types/branch";

const focusClass =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:focus-visible:outline-blue-400";
const inputClass = `w-full rounded border border-zinc-500 px-3 py-2 ${focusClass}`;
const buttonClass = `w-fit rounded bg-blue-700 px-4 py-2 font-medium text-white ${focusClass} disabled:opacity-60`;

type Coordinates = { latitude: number; longitude: number };
type ResolvedLink = Coordinates & { resolvedUrl: string };

type BranchFormProps = {
  branch?: Branch;
  onStart?: () => void;
  onSaved: (branch: Branch) => void;
};

function parseManualCoordinates(latitude: string, longitude: string): Coordinates | null {
  if (latitude.trim() === "" || longitude.trim() === "") return null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { latitude: lat, longitude: lng };
}

export function BranchForm({ branch, onStart, onSaved }: BranchFormProps) {
  const save = useMutation<Branch>();
  const resolve = useMutation<ResolvedLink>();
  const [name, setName] = useState(branch?.name ?? "");
  const [address, setAddress] = useState(branch?.address ?? "");
  const [googleMapsUrl, setGoogleMapsUrl] = useState(branch?.googleMapsUrl ?? "");
  const [linkCoordinates, setLinkCoordinates] = useState<Coordinates | null>(
    branch ? { latitude: branch.latitude, longitude: branch.longitude } : null,
  );
  const [isManual, setIsManual] = useState(false);
  const [manualLatitude, setManualLatitude] = useState(branch ? String(branch.latitude) : "");
  const [manualLongitude, setManualLongitude] = useState(branch ? String(branch.longitude) : "");
  const [radiusM, setRadiusM] = useState(String(branch?.radiusM ?? 100));
  const [isActive, setIsActive] = useState(branch?.isActive ?? true);

  const coordinates = isManual
    ? parseManualCoordinates(manualLatitude, manualLongitude)
    : linkCoordinates;

  async function handleResolve() {
    onStart?.();
    let result: ResolvedLink;
    try {
      result = await resolve.mutate("/api/admin/branches/resolve-map-link", {
        method: "POST",
        body: { url: googleMapsUrl },
      });
    } catch {
      return;
    }
    setLinkCoordinates({ latitude: result.latitude, longitude: result.longitude });
    setManualLatitude(String(result.latitude));
    setManualLongitude(String(result.longitude));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!coordinates) return;
    onStart?.();
    const fields = {
      name,
      address,
      googleMapsUrl: googleMapsUrl.trim() === "" ? null : googleMapsUrl,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      radiusM: Number(radiusM),
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="branch-name" className="font-medium">
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
      <div className="flex flex-col gap-1">
        <label htmlFor="branch-address" className="font-medium">
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
      <div className="flex flex-col gap-2">
        <label htmlFor="branch-maps-url" className="font-medium">
          Link Google Maps
        </label>
        <input
          id="branch-maps-url"
          type="url"
          autoComplete="off"
          value={googleMapsUrl}
          onChange={(event) => setGoogleMapsUrl(event.target.value)}
          aria-describedby="branch-maps-hint"
          className={inputClass}
        />
        <p id="branch-maps-hint" className="text-sm text-zinc-700 dark:text-zinc-300">
          Mở Google Maps, chọn đúng quán, bấm &quot;Chia sẻ&quot; rồi copy link dán vào đây.
        </p>
        <button
          type="button"
          onClick={handleResolve}
          disabled={resolve.isPending || googleMapsUrl.trim() === ""}
          className={buttonClass}
        >
          Lấy toạ độ từ link
        </button>
        {resolve.error && <ErrorMessage message={resolve.error} />}
      </div>
      <div className="flex flex-col gap-2">
        <p>
          <span className="font-medium">Toạ độ: </span>
          {coordinates
            ? `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`
            : "Chưa có toạ độ"}
        </p>
        <label className="flex w-fit items-center gap-2">
          <input
            type="checkbox"
            checked={isManual}
            onChange={(event) => setIsManual(event.target.checked)}
            className={`size-4 ${focusClass}`}
          />
          Nhập toạ độ bằng tay
        </label>
        {isManual && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="branch-latitude" className="font-medium">
                Vĩ độ
              </label>
              <input
                id="branch-latitude"
                type="number"
                step="any"
                min={-90}
                max={90}
                value={manualLatitude}
                onChange={(event) => setManualLatitude(event.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="branch-longitude" className="font-medium">
                Kinh độ
              </label>
              <input
                id="branch-longitude"
                type="number"
                step="any"
                min={-180}
                max={180}
                value={manualLongitude}
                onChange={(event) => setManualLongitude(event.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="branch-radius" className="font-medium">
          Bán kính (m)
        </label>
        <input
          id="branch-radius"
          type="number"
          step={1}
          min={1}
          required
          value={radiusM}
          onChange={(event) => setRadiusM(event.target.value)}
          className={inputClass}
        />
      </div>
      {branch && (
        <label className="flex w-fit items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            className={`size-4 ${focusClass}`}
          />
          Đang hoạt động
        </label>
      )}
      {save.error && <ErrorMessage message={save.error} />}
      <button type="submit" disabled={save.isPending || !coordinates} className={buttonClass}>
        Lưu
      </button>
    </form>
  );
}
