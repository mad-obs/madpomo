/* The mobile furniture: the dimmer behind the bottom sheet, the timer bar,
   and the tab bar that carries the links the header gives up on a phone.

   All of it is display:none above 720px (mobile.css), so this renders on
   every screen and costs a desktop nothing but a few nodes.

   Unlike the plain-JS build — where the bar has to watch the sidebar's DOM to
   learn what the clock says — this one reads the timer out of the store. Same
   bar, one source of truth, which is the clearest thing React buys here. */

import { useMadpomo } from "../store.jsx";
import { formatClock, phaseLabel, startLabel } from "../lib/stats.js";

const TABS = [
  { route: "board", href: "#/board", glyph: "[#]", label: "board" },
  { route: "report", href: "#/report", glyph: "[~]", label: "report" },
  { route: "settings", href: "#/settings", glyph: "[=]", label: "settings" },
  { route: "about", href: "#/about", glyph: "[?]", label: "about" }
];

export default function MobileChrome({ route, sheetOpen, onToggleSheet, onCloseSheet }) {
  const { settings, tasks, timer, startOrPause } = useMadpomo();
  const currentTask = tasks.find((task) => task.id === timer.taskId);

  return (
    <>
      <div className="sheet-scrim" hidden={!sheetOpen} onClick={onCloseSheet} />

      <div className={"nowbar" + (timer.isRunning ? " nowbar--running" : "")}>
        <button
          type="button"
          className="nowbar__open"
          aria-expanded={sheetOpen}
          aria-controls="sidebar"
          aria-label="open the timer panel"
          onClick={onToggleSheet}
        >
          <span className="nowbar__clock">{formatClock(timer.timeLeft)}</span>
          <span className="nowbar__meta">
            <span className="nowbar__phase">{phaseLabel(timer, settings)}</span>
            <span className="nowbar__task">{currentTask ? currentTask.title : "no task"}</span>
          </span>
        </button>
        <button type="button" className="btn btn--primary nowbar__action" onClick={startOrPause}>
          {startLabel(timer)}
        </button>
      </div>

      <nav className="tabbar" aria-label="sections">
        {TABS.map((tab) => (
          <a
            key={tab.route}
            href={tab.href}
            className="tabbar__item"
            aria-current={route === tab.route ? "page" : undefined}
          >
            <span className="tabbar__glyph" aria-hidden="true">{tab.glyph}</span>
            {tab.label}
          </a>
        ))}
      </nav>
    </>
  );
}
