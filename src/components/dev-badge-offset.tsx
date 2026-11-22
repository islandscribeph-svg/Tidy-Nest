"use client";

import { useEffect } from "react";

// The Next.js N mark exists only while `next dev` is running. Its shadow DOM
// ignores page CSS, so this nudges it under the header and clear of the bottom nav.
export function DevBadgeOffset() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    function place() {
      const portal = document.querySelector("nextjs-portal");
      const indicator = portal?.shadowRoot?.querySelector("#devtools-indicator");
      if (!(indicator instanceof HTMLElement)) return;
      const nav = [...document.querySelectorAll("nav")].find((item) => item.getBoundingClientRect().height > 40);
      const navBox = nav?.getBoundingClientRect();
      const navVisible = Boolean(navBox && navBox.height > 40);
      indicator.style.left = "auto";
      indicator.style.right = "12px";
      if (navVisible && navBox) {
        indicator.style.top = "auto";
        indicator.style.bottom = `${Math.round(navBox.height) + 12}px`;
      } else {
        indicator.style.bottom = "auto";
        indicator.style.top = "16px";
      }
    }
    place();
    const timer = window.setInterval(place, 500);
    return () => window.clearInterval(timer);
  }, []);
  return null;
}
