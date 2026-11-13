import { useEffect } from "react";

const SITE = "Aikido Shinju-Kai";

// Sets the browser-tab title for a page, e.g. usePageTitle("Classes")
// -> "Classes | Aikido Shinju-Kai". Puts the plain site name back when the
// page closes, so the next page never shows a leftover title.
export default function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE}` : SITE;
    return () => { document.title = SITE; };
  }, [title]);
}
