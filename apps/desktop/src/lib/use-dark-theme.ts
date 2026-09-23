import { useEffect, useState } from "react";

/**
 * Tracks the document's `data-theme` attribute. The shell flips theme by
 * rewriting that attribute, so watching it keeps every mark in step without
 * threading the theme through props.
 */
export function useDarkTheme(): boolean {
  const [dark, setDark] = useState(
    () => document.documentElement.dataset.theme !== "light",
  );

  useEffect(() => {
    const el = document.documentElement;
    const observer = new MutationObserver(() => {
      setDark(el.dataset.theme !== "light");
    });
    observer.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return dark;
}
