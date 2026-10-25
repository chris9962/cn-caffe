"use client";

import { useEffect, useRef, useState } from "react";
import { ErrorMessage } from "@/components/ui/error-message";

const MAX_PHOTO_WIDTH = 720;
const JPEG_QUALITY = 0.8;
const CAMERA_DENIED = "Bạn cần cho phép dùng camera để check in.";
const CAMERA_UNAVAILABLE = "Không mở được camera. Bạn kiểm tra camera rồi thử lại.";

type CameraCaptureProps = {
  onCapture: (photo: Blob | null) => void;
};

export function CameraCapture({ onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let isCancelled = false;
    // mediaDevices is undefined outside a secure context, e.g. plain http on a LAN address.
    const request = navigator.mediaDevices?.getUserMedia
      ? navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })
      : Promise.reject(new Error("Camera API unavailable"));

    request
      .then((mediaStream) => {
        // The permission prompt can outlive the component, so a late stream must still be stopped.
        if (isCancelled) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = mediaStream;
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
      })
      .catch((error: unknown) => {
        if (isCancelled) return;
        const isDenied = error instanceof DOMException && error.name === "NotAllowedError";
        setCameraError(isDenied ? CAMERA_DENIED : CAMERA_UNAVAILABLE);
      });

    return () => {
      isCancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function handleCapture() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const scale = Math.min(1, MAX_PHOTO_WIDTH / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        // A data URL needs no revoking, unlike an object URL that would leak after unmount.
        setPreviewUrl(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
        onCapture(blob);
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  }

  function handleRetake() {
    setPreviewUrl(null);
    onCapture(null);
  }

  if (cameraError) return <ErrorMessage message={cameraError} />;

  return (
    <div className="flex flex-col gap-2">
      {/* Kept mounted while the preview shows, so "Chụp lại" reuses the running stream. */}
      <video
        ref={videoRef}
        aria-label="Khung camera"
        autoPlay
        muted
        playsInline
        hidden={previewUrl !== null}
        onLoadedData={() => setIsReady(true)}
        className="w-full max-w-sm rounded bg-zinc-200 dark:bg-zinc-800"
      />
      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- next/image cannot optimise a local data URL.
        <img src={previewUrl} alt="Ảnh vừa chụp" className="w-full max-w-sm rounded" />
      )}
      {/* One button for both actions keeps keyboard focus in place when the label changes. */}
      <button
        type="button"
        onClick={previewUrl ? handleRetake : handleCapture}
        disabled={!previewUrl && !isReady}
        className="w-fit rounded border border-blue-700 px-4 py-2 font-medium text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-60 dark:border-blue-400 dark:text-blue-400 dark:focus-visible:outline-blue-400"
      >
        {previewUrl ? "Chụp lại" : "Chụp ảnh"}
      </button>
    </div>
  );
}
