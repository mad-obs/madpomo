/* ==========================================================================
   madpomo (React) — the whole app

   One page. The header and the sidebar never unmount, so the timer keeps
   counting while you move around; only the main area swaps. Each view is a
   lazy import, so clicking settings fetches the settings chunk and nothing
   else.

   On a phone the same three parts are arranged differently: the header keeps
   only the brand, the sidebar becomes a bottom sheet, and a timer bar and a
   tab bar take the bottom of the screen. mobile.css does the layout; the one
   thing it cannot do is remember whether the sheet is open, which is the
   state this component holds.
   ========================================================================== */

import { lazy, Suspense, useEffect, useState } from "react";
import Header from "./components/Header.jsx";
import Sidebar from "./components/Sidebar.jsx";
import MobileChrome from "./components/MobileChrome.jsx";
import Tour from "./components/Tour.jsx";
import { useHashRoute } from "./hooks/useHashRoute.js";
import { startI18n } from "./lib/i18n.js";

const BoardView = lazy(() => import("./views/BoardView.jsx"));
const ReportView = lazy(() => import("./views/ReportView.jsx"));
const SettingsView = lazy(() => import("./views/SettingsView.jsx"));
const AboutView = lazy(() => import("./views/AboutView.jsx"));

const VIEWS = {
  board: BoardView,
  report: ReportView,
  settings: SettingsView,
  about: AboutView
};

export default function App() {
  const { route, params } = useHashRoute();
  const View = VIEWS[route] || BoardView;
  const [sheetOpen, setSheetOpen] = useState(false);

  /* Started once, after the first render has put something on the page. From
     then on its observer keeps up with React on its own. */
  useEffect(startI18n, []);

  /* The open sheet is a class on <body>, not a prop on the sidebar, because
     the rule that slides it up (`body.sheet-open .sidebar`) is shared with
     the plain-JS build. One stylesheet, two apps. */
  useEffect(() => {
    document.body.classList.toggle("sheet-open", sheetOpen);
    return () => document.body.classList.remove("sheet-open");
  }, [sheetOpen]);

  // a sheet left open across a route change would cover the view it opened
  useEffect(() => setSheetOpen(false), [route]);

  useEffect(() => {
    if (!sheetOpen) return undefined;
    function onKey(event) {
      if (event.key === "Escape") setSheetOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  return (
    <div className="app">
      <Header route={route} />
      <Sidebar route={route} onCloseSheet={() => setSheetOpen(false)} />
      <main className="main">
        <Suspense fallback={<p className="empty view-loading">loading {route}...</p>}>
          <View params={params} />
        </Suspense>
      </main>

      <MobileChrome
        route={route}
        sheetOpen={sheetOpen}
        onToggleSheet={() => setSheetOpen((open) => !open)}
        onCloseSheet={() => setSheetOpen(false)}
      />

      {/* every step points at something on the board, so it only runs there */}
      {route === "board" ? <Tour params={params} onSheetChange={setSheetOpen} /> : null}
    </div>
  );
}
