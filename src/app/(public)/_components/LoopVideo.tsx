"use client";

import { useEffect, useRef, useState } from "react";

type LoopVideoProps = {
  src: string;
  poster: string;
  label: string;
  className?: string;
};

/**
 * A short, silent clip that loops only while it is on screen. Nothing downloads
 * until it scrolls into view (preload="none"). With reduced motion on, it stays
 * on its poster and shows controls so it can be played by hand.
 */
export function LoopVideo({ src, poster, label, className }: LoopVideoProps) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(motion.matches);
    if (motion.matches) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Autoplay can still be refused (e.g. low-power mode); the poster stays.
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      aria-label={label}
      muted
      loop
      playsInline
      preload="none"
      controls={reducedMotion}
      className={className}
    />
  );
}
