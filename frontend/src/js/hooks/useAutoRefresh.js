import { useEffect, useRef } from "react";

export default function useAutoRefresh(callback, intervalMs = 10000) {
  const saved = useRef(callback);

  useEffect(() => {
    saved.current = callback;
  });

  useEffect(() => {
    const run = () => {
      if (document.visibilityState === "visible") saved.current();
    };
    const timer = setInterval(run, intervalMs);
    document.addEventListener("visibilitychange", run);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", run);
    };
  }, [intervalMs]);
}
