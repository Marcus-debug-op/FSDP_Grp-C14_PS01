import { useEffect, useRef, useState } from "react";

// Counts up from 0 to "to" the first time it scrolls into view.
export default function CountUp({ to, suffix = "", duration = 1300 }) {
  const node = useRef(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const element = node.current;
    if (!element) return;
    // Skip the animation if the visitor prefers less motion
    if (typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(to);
      return;
    }

    let frame;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // slows down near the end
        setValue(Math.round(to * eased));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    observer.observe(element);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [to, duration]);

  return <span ref={node}>{value.toLocaleString("en-SG")}{suffix}</span>;
}
