"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { RangeControl } from "../controls/range-control";
import { MediaPreviewActions, useLibraryFilePreview, type LibraryPreviewFile } from "../media-library-preview";
import { Pane } from "../panes/pane-components";
import { MotionPlaybackTransport, MotionPreviewPane, useMotionPlaybackShortcut } from "./motion-preview-controls";

type VideoWorkspaceProps = {
  active: boolean; poster?: string; onClose: () => void; onPreviewReady: (id: string, element: HTMLElement) => void;
  exportFeedback?: ReactNode;
};
type VideoPreview = NonNullable<ReturnType<typeof useLibraryFilePreview>>;

export function MotionVideoWorkspace({ file, ...props }: VideoWorkspaceProps & { file: LibraryPreviewFile }) {
  const media = useLibraryFilePreview(file);
  return media ? <VideoWorkspace key={media.source} id={file.asset.id} media={media} {...props} /> : null;
}

function VideoWorkspace({ id, media, active, poster, onClose, onPreviewReady, exportFeedback }: VideoWorkspaceProps & { id: string; media: VideoPreview }) {
  const preview = useRef<HTMLElement>(null);
  const player = useRef<HTMLVideoElement>(null);
  const descriptionId = useId();
  const volumeId = useId();
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [ratio, setRatio] = useState(16 / 9);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(100);
  const [unavailable, setUnavailable] = useState(false);
  const [controlError, setControlError] = useState("");
  const ready = duration > 0 && !unavailable;

  useLayoutEffect(() => {
    if (active && preview.current) onPreviewReady(id, preview.current);
  }, [active, id, onPreviewReady]);

  useEffect(() => {
    const video = player.current;
    if (!active) video?.pause();
    return () => video?.pause();
  }, [active]);

  function togglePlayback() {
    const video = player.current;
    if (!video || !ready) return;
    setControlError("");
    if (!video.paused) video.pause();
    else {
      if (video.ended) video.currentTime = 0;
      void video.play().catch(error => {
        if (error?.name !== "AbortError") setControlError("This preview couldn’t play.");
      });
    }
  }

  function seek(seconds: number) {
    const video = player.current;
    if (!video || !ready) return;
    video.pause();
    video.currentTime = seconds;
    setPosition(seconds);
  }

  useMotionPlaybackShortcut(active && ready, togglePlayback);

  return <div className="motion-workspace">
    <MotionPreviewPane previewRef={preview} actions={<button type="button" className="button-secondary" onClick={onClose}>Close Preview</button>}>
      <div className="motion-stage">
        <div className="motion-video-artboard" style={{ "--motion-video-ratio": ratio } as CSSProperties}>
          {media.description ? <span className="sr-only" id={descriptionId}>{media.description}</span> : null}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption -- This local preview uses any description supplied in Files. */}
          <video ref={player} src={media.source} poster={poster} preload="metadata" playsInline
            aria-label={`${media.name} preview`} aria-describedby={media.description ? descriptionId : undefined}
            onLoadedMetadata={event => {
              const video = event.currentTarget;
              setDuration(Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0);
              if (video.videoWidth && video.videoHeight) setRatio(video.videoWidth / video.videoHeight);
              setUnavailable(false);
            }}
            onTimeUpdate={event => setPosition(event.currentTarget.currentTime)}
            onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
            onVolumeChange={event => setVolume(Math.round(event.currentTarget.volume * 100))}
            onError={() => { setUnavailable(true); setPlaying(false); }} />
        </div>
      </div>
      <MotionPlaybackTransport playing={playing} position={Math.min(position, duration)} duration={duration} label="Video position"
        unitsPerSecond={1} step={0.01} disabled={!ready} onToggle={togglePlayback} onSeek={seek} />
    </MotionPreviewPane>
    <Pane label="Video details" side="right" width={312} collapsed={false} onCollapsedChange={() => {}} collapseIcon={null}
      collapsible={false} trackClassName="motion-inspector" header={<h2>Video</h2>}>
      <div className="motion-settings">
        <div className="motion-setting-group motion-video-file">
          <strong>{media.name}</strong>
          <MediaPreviewActions {...media} active={active} />
          {unavailable ? <p role="alert" className="motion-feedback">This preview couldn’t play. Download the file to open it in another app.</p> : null}
        </div>
        {ready ? <div className="motion-setting-group">
          <div className="motion-field">
            <label htmlFor={volumeId}>Volume</label>
            <RangeControl id={volumeId} min={0} max={100} step={1} value={volume} aria-valuetext={`${volume}%`} tooltipText={`${volume}%`}
              onChange={event => { if (player.current) player.current.volume = event.target.valueAsNumber / 100; }} />
          </div>
          {document.fullscreenEnabled ? <div className="motion-actions"><button type="button" className="button-secondary" onClick={() => {
            void player.current?.requestFullscreen().catch(() => setControlError("Full screen couldn’t open."));
          }}>Full Screen</button></div> : null}
        </div> : null}
        {controlError ? <p role="alert" className="motion-feedback">{controlError}</p> : null}
        {exportFeedback}
      </div>
    </Pane>
  </div>;
}
