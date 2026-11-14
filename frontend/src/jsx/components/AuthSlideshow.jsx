import { useEffect, useRef, useState } from "react";
import { signinMedia, PHOTO_SECONDS } from "../../js/data/signinMedia.js";

// Background slideshow for the Sign In page: photos crossfade every few
// seconds, clips play muted to the end, then the next item fades in.
// Files that fail to load are skipped. "Reduce motion" users see the first item only.
export default function AuthSlideshow() {
  const [broken, setBroken] = useState(() => new Set());
  const [index, setIndex] = useState(0);
  const videoRefs = useRef({});
  const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const items = signinMedia.filter((m) => !broken.has(m.src));
  const current = items.length ? index % items.length : 0;
  const next = () => setIndex((i) => i + 1);

  // Photos advance on a timer; clips advance when they end (see onEnded below).
  useEffect(() => {
    if (reduceMotion || items.length < 2 || items[current]?.type !== "image") return undefined;
    const timer = setTimeout(next, PHOTO_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [current, items.length, reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start the current clip from the beginning; pause the others.
  useEffect(() => {
    items.forEach((m, i) => {
      const v = videoRefs.current[m.src];
      if (!v) return;
      if (i === current && !reduceMotion) { v.currentTime = 0; v.play().catch(() => {}); }
      else v.pause();
    });
  }, [current, items.length, reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  const markBroken = (src) => setBroken((b) => new Set(b).add(src));

  return (
    <div className="auth-slides">
      {items.map((m, i) => (
        <div key={m.src} className={`auth-slide${i === current ? " is-active" : ""}${m.type === "image" && !reduceMotion ? " is-photo" : ""}`}>
          {m.type === "video" ? (
            <video
              ref={(el) => { videoRefs.current[m.src] = el; }}
              src={m.src}
              muted
              playsInline
              preload="metadata"
              onEnded={items.length > 1 ? next : (e) => { e.target.currentTime = 0; e.target.play().catch(() => {}); }}
              onError={() => markBroken(m.src)}
            />
          ) : (
            <img src={m.src} alt="" onError={() => markBroken(m.src)} />
          )}
        </div>
      ))}
    </div>
  );
}
