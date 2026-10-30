"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { ErrorMessage } from "@/components/ui/error-message";

const MAX_PHOTO_WIDTH = 720;
const JPEG_QUALITY = 0.8;
const CAMERA_DENIED = "Bạn cần cho phép dùng camera để check in.";
const CAMERA_UNAVAILABLE = "Không mở được camera. Bạn kiểm tra camera rồi thử lại.";

// Controls sit on the camera image, so they need a light focus ring instead of the app's green one.
const onImageFocusClass = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
const textButtonClass = `min-h-11 rounded-full px-2 text-base font-semibold text-white ${onImageFocusClass}`;

type CameraCaptureProps = {
  onCapture: (photo: Blob | null) => void;
  onCancel: () => void;
  // Shown on top of the captured photo, above the action row.
  overlay?: ReactNode;
  // Takes the right side of the action row once a photo is taken.
  confirmAction?: ReactNode;
  // Rendered under the camera frame.
  children?: ReactNode;
};

export function CameraCapture({ onCapture, onCancel, overlay, confirmAction, children }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const shutterRef = useRef<HTMLButtonElement>(null);
  const retakeRef = useRef<HTMLButtonElement>(null);
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
        // The shutter unmounts with this update, so focus moves to "Chụp lại" once it exists.
        flushSync(() => {
          // A data URL needs no revoking, unlike an object URL that would leak after unmount.
          setPreviewUrl(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
        });
        retakeRef.current?.focus();
        onCapture(blob);
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  }

  function handleRetake() {
    flushSync(() => setPreviewUrl(null));
    shutterRef.current?.focus();
    onCapture(null);
  }

  if (cameraError) {
    return (
      <div className="flex flex-col gap-3">
        <ErrorMessage message={cameraError} />
        <button type="button" onClick={onCancel} className="ui-btn-quiet w-full">
          Huỷ
        </button>
      </div>
    );
  }

  return (
    // On phones the frame takes whatever height is left, so the whole step fits on one screen.
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="relative min-h-0 w-full flex-1 overflow-hidden rounded-[1.5rem] bg-black md:aspect-[4/3] md:flex-none">
        {/* Kept mounted while the preview shows, so "Chụp lại" reuses the running stream. */}
        <video
          ref={videoRef}
          aria-label="Khung camera"
          autoPlay
          muted
          playsInline
          hidden={previewUrl !== null}
          onLoadedData={() => setIsReady(true)}
          className="h-full w-full object-cover"
        />
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- next/image cannot optimise a local data URL.
          <img src={previewUrl} alt="Ảnh vừa chụp" className="h-full w-full object-cover" />
        )}
        {!previewUrl && !isReady && (
          <p role="status" className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-white">
            Đang mở camera...
          </p>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.75),transparent)] px-4 pt-14 pb-5 text-white">
          {previewUrl && overlay && <div className="mb-4">{overlay}</div>}
          <div className="grid min-h-[4.5rem] grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="justify-self-start">
              {previewUrl ? (
                <button ref={retakeRef} type="button" onClick={handleRetake} className={textButtonClass}>
                  Chụp lại
                </button>
              ) : (
                <button type="button" onClick={onCancel} className={textButtonClass}>
                  Huỷ
                </button>
              )}
            </div>
            <div className="justify-self-center">
              {!previewUrl && (
                <button
                  ref={shutterRef}
                  type="button"
                  onClick={handleCapture}
                  disabled={!isReady}
                  aria-label="Chụp ảnh"
                  className={`group flex size-[4.5rem] items-center justify-center rounded-full border-4 border-white disabled:opacity-40 ${onImageFocusClass}`}
                >
                  <span className="size-[3.6rem] rounded-full bg-white transition-transform group-active:scale-90" />
                </button>
              )}
            </div>
            <div className="justify-self-end">{previewUrl && confirmAction}</div>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
