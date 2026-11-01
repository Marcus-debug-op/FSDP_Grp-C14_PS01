import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Scrolls to the top whenever the page (route) changes.
export default function ScrollToTop() {
  const { pathname } = useLocation();

  // Braces matter: the effect must return nothing (or a cleanup function).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
