/* ==========================================================================
   madpomo (React) — routing

   Four views, one page. The hash is the address (#/report, #/settings), so
   every view is linkable and the back button works, but nothing ever reloads
   and the timer in the sidebar keeps running across the whole app.
   ========================================================================== */

import { useEffect, useState } from "react";

export const ROUTES = ["board", "report", "settings", "about"];

export function readRoute() {
  const raw = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  return ROUTES.includes(raw) ? raw : "board";
}

/* Anything after a ? in the hash, so #/settings?legal=terms still works. */
export function readParams() {
  const raw = window.location.hash.split("?")[1];
  return new URLSearchParams(raw || "");
}

export function navigate(route, query) {
  window.location.hash = "#/" + route + (query ? "?" + query : "");
}

export function useHashRoute() {
  const [route, setRoute] = useState(readRoute);
  const [params, setParams] = useState(readParams);

  useEffect(() => {
    function onChange() {
      setRoute(readRoute());
      setParams(readParams());
    }

    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return { route, params };
}
