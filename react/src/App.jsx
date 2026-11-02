/* ==========================================================================
   madpomo (React) — the whole app

   One page. The header and the sidebar never unmount, so the timer keeps
   counting while you move around; only the main area swaps. Each view is a
   lazy import, so clicking settings fetches the settings chunk and nothing
   else.
   ========================================================================== */

import { lazy, Suspense } from "react";
import Header from "./components/Header.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Tour from "./components/Tour.jsx";
import { useHashRoute } from "./hooks/useHashRoute.js";

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

  return (
    <div className="app">
      <Header route={route} />
      <Sidebar route={route} />
      <main className="main">
        <Suspense fallback={<p className="empty view-loading">loading {route}...</p>}>
          <View params={params} />
        </Suspense>
      </main>

      {/* every step points at something on the board, so it only runs there */}
      {route === "board" ? <Tour params={params} /> : null}
    </div>
  );
}
