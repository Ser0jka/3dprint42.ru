"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./page.module.css";

const CLOCK_SYNC_TOLERANCE_SECONDS = 0.18;

const syncVideoToProjectClock = (video: HTMLVideoElement) => {
  if (!Number.isFinite(video.duration) || video.duration <= 0) {
    return;
  }

  const projectTime = (Date.now() / 1000) % video.duration;
  const directDifference = Math.abs(video.currentTime - projectTime);
  const loopDifference = video.duration - directDifference;

  if (Math.min(directDifference, loopDifference) > CLOCK_SYNC_TOLERANCE_SECONDS) {
    video.currentTime = projectTime;
  }
};

export default function HeroVideo() {
  const videoLayerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const motionAllowedRef = useRef(false);
  const userPausedRef = useRef(false);
  const isVisibleRef = useRef(false);
  const [canLoadVideo, setCanLoadVideo] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    motionAllowedRef.current = !reducedMotion.matches;
    const initialLoadFrame = window.requestAnimationFrame(() => {
      setCanLoadVideo(!reducedMotion.matches);
    });

    const handleMotionPreference = (event: MediaQueryListEvent) => {
      motionAllowedRef.current = !event.matches;
      setCanLoadVideo(!event.matches);

      if (event.matches) {
        video?.pause();
      }
    };

    reducedMotion.addEventListener("change", handleMotionPreference);
    return () => {
      window.cancelAnimationFrame(initialLoadFrame);
      reducedMotion.removeEventListener("change", handleMotionPreference);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const videoLayer = videoLayerRef.current;

    if (!canLoadVideo || !video || !videoLayer) {
      return;
    }

    video.load();

    const playFromProjectClock = () => {
      syncVideoToProjectClock(video);
      void video.play().catch(() => setIsPlaying(false));
    };

    const handleMetadata = () => {
      syncVideoToProjectClock(video);

      if (isVisibleRef.current && motionAllowedRef.current && !userPausedRef.current) {
        playFromProjectClock();
      }
    };

    const handleDocumentVisibility = () => {
      if (document.hidden) {
        video.pause();
        return;
      }

      if (isVisibleRef.current && motionAllowedRef.current && !userPausedRef.current) {
        playFromProjectClock();
      }
    };

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
        const shouldPlay =
          entry.isIntersecting && motionAllowedRef.current && !userPausedRef.current;

        if (shouldPlay) {
          playFromProjectClock();
          return;
        }

        video.pause();
      },
      { threshold: 0.15 },
    );

    video.addEventListener("loadedmetadata", handleMetadata);
    document.addEventListener("visibilitychange", handleDocumentVisibility);
    visibilityObserver.observe(videoLayer);

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      handleMetadata();
    }

    return () => {
      video.removeEventListener("loadedmetadata", handleMetadata);
      document.removeEventListener("visibilitychange", handleDocumentVisibility);
      visibilityObserver.disconnect();
      isVisibleRef.current = false;
    };
  }, [canLoadVideo]);

  const togglePlayback = () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (video.paused) {
      motionAllowedRef.current = true;
      userPausedRef.current = false;
      setCanLoadVideo(true);
      window.requestAnimationFrame(() => {
        syncVideoToProjectClock(video);
        void video.play().catch(() => setIsPlaying(false));
      });
      return;
    }

    userPausedRef.current = true;
    video.pause();
  };

  return (
    <>
      <div ref={videoLayerRef} className={styles.videoLayer}>
        <video
          ref={videoRef}
          className={styles.heroVideo}
          muted
          loop
          playsInline
          preload={canLoadVideo ? "metadata" : "none"}
          poster="/media/print-timelapse-poster.jpg"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          aria-hidden="true"
        >
          {canLoadVideo ? (
            <>
              <source
                src="/media/print-timelapse-mobile.mp4"
                type="video/mp4"
                media="(max-width: 640px)"
              />
              <source src="/media/print-timelapse.mp4" type="video/mp4" />
            </>
          ) : null}
        </video>
      </div>

      <button
        className={styles.playbackControl}
        type="button"
        onClick={togglePlayback}
        aria-label={isPlaying ? "Поставить фоновое видео на паузу" : "Запустить фоновое видео"}
      >
        <span
          className={isPlaying ? styles.pauseIcon : styles.playIcon}
          aria-hidden="true"
        />
      </button>
    </>
  );
}
