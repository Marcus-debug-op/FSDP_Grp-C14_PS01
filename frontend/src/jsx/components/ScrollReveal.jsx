import { useEffect, useRef, useState } from "react";

/** Reveals content when it enters the viewport. No external dependencies. */
export default function ScrollReveal({ children, className = "", delay = 0, as: Tag = "div" }) {
  const node = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = node.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.08, rootMargin: "0px 0px -20px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={node}
      className={`scroll-reveal ${visible ? "is-visible" : ""} ${className}`.trim()}
      style={{ "--reveal-delay": `${Math.max(0, Math.min(delay, 700))}ms` }}
    >
      {children}
    </Tag>
  );
}
