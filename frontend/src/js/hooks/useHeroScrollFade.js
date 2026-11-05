import { useEffect } from "react";

// Fades and lowers the hero content as the page scrolls.
// Sets --hero-progress (0 to 1) on the hero; .hero-scroll-content in index.css reads it.
// Used by the homepage and the student dashboard.
export default function useHeroScrollFade(heroRef) {
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = null;
    const update = () => {
      frame = null;
      const distance = Math.max(hero.offsetHeight * 0.8, 1);
      const progress = Math.min(Math.max(window.scrollY / distance, 0), 1);
      hero.style.setProperty("--hero-progress", progress.toFixed(3));
    };
    const onScroll = () => { if (frame === null) frame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame !== null) window.cancelAnimationFrame(frame);
      hero.style.removeProperty("--hero-progress");
    };
  }, [heroRef]);
}
