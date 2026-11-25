"use client";

import { AcmIcon } from "@andrewcharlesmoss/icons/react";
import { useEffect, useRef, useState } from "react";

export function VideoCatalogueThumbnail({ id, source, active, onPoster }: {
  id: string; source: Blob; active: boolean; onPoster: (id: string, source: Blob, image: string) => void;
}) {
  const artwork = useRef<HTMLSpanElement>(null);
  const [poster, setPoster] = useState<{ source: Blob; image?: string }>();
  const current = poster?.source === source ? poster : undefined;

  useEffect(() => {
    const target = artwork.current;
    if (!active || !target || current) return;
    let cancelled = false;
    let releaseVideo: (() => void) | undefined;
    const observer = new IntersectionObserver(entries => {
      if (cancelled || !entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      const video = document.createElement("video");
      const url = URL.createObjectURL(source);
      let released = false;
      function release() {
        if (released) return;
        released = true;
        window.clearTimeout(timeout);
        video.removeAttribute("src");
        video.load();
        URL.revokeObjectURL(url);
      }
      function finish(image?: string) {
        if (released) return;
        release();
        setPoster({ source, image });
        if (image) onPoster(id, source, image);
      }
      const timeout = window.setTimeout(() => finish(), 8000);
      releaseVideo = release;
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      video.addEventListener("error", () => finish(), { once: true });
      video.addEventListener("loadedmetadata", () => {
        if (!released && Number.isFinite(video.duration) && video.duration > 0) {
          // A frame after the opening is more useful for effects that start transparent.
          video.currentTime = Math.min(video.duration * 0.2, 2);
        } else finish();
      }, { once: true });
      video.addEventListener("seeked", () => {
        if (released || !video.videoWidth || !video.videoHeight) return;
        try {
          const canvas = document.createElement("canvas");
          const scale = Math.min(320 / video.videoWidth, 180 / video.videoHeight, 1);
          canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
          canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
          const context = canvas.getContext("2d");
          if (!context) { finish(); return; }
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          finish(canvas.toDataURL("image/webp"));
        } catch { finish(); }
      }, { once: true });
      video.src = url;
    }, { rootMargin: "120px" });
    observer.observe(target);
    return () => {
      cancelled = true;
      observer.disconnect();
      releaseVideo?.();
    };
  }, [active, current, id, onPoster, source]);

  return <span ref={artwork} className="motion-video-thumbnail" aria-hidden="true">
    {current?.image
      // eslint-disable-next-line @next/next/no-img-element -- This still is generated in the browser from a local clip.
      ? <img src={current.image} alt="" />
      : <AcmIcon name="insert.video" size={32} />}
  </span>;
}
