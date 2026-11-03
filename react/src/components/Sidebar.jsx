import { useEffect, useRef } from "react";
import { useMadpomo } from "../store.jsx";
import Noise from "./Noise.jsx";
import { formatClock, phaseLabel, pomodorosPerDay, startLabel, taskOverview } from "../lib/stats.js";

const MAX_CELLS = 24;

/* How far the sheet has to travel, as a share of its own height, before
   letting go dismisses it instead of snapping it back. */
const DISMISS_RATIO = 3;

export default function Sidebar({ route, onCloseSheet }) {
  const { settings, tasks, sessions, timer, startOrPause, takeBreak, reset } = useMadpomo();

  const counts = taskOverview(tasks, settings);
  const days = pomodorosPerDay(sessions, 7);
  const currentTask = tasks.find((task) => task.id === timer.taskId);

  /* ---- drag the handle down to dismiss -------------------------------
     On a phone this aside is a bottom sheet (mobile.css). It follows the
     finger one-to-one while it moves, because a panel that waits for the
     gesture to end before it reacts does not read as a sheet. Only the
     handle has `touch-action: none`, so the rest still scrolls.
     --------------------------------------------------------------------- */

  const sheetRef = useRef(null);
  const dragRef = useRef(null);

  function onHandleDown(event) {
    const sheet = sheetRef.current;
    if (!sheet || !document.body.classList.contains("sheet-open")) return;

    /* The x button lives in this strip. Capturing the pointer for a drag
       would redirect the click that follows to the strip instead of the
       button, so the one control in here never starts one. */
    if (event.target.closest("button")) return;

    dragRef.current = { startY: event.clientY, startAt: Date.now(), delta: 0 };
    sheet.style.transition = "none";
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onHandleMove(event) {
    const drag = dragRef.current;
    const sheet = sheetRef.current;
    if (!drag || !sheet) return;

    // up does nothing: the sheet is already as far up as it goes
    drag.delta = Math.max(0, event.clientY - drag.startY);
    sheet.style.transform = "translateY(" + drag.delta + "px)";
  }

  function onHandleUp() {
    const drag = dragRef.current;
    const sheet = sheetRef.current;
    if (!drag || !sheet) return;

    dragRef.current = null;
    sheet.style.transition = "";
    sheet.style.transform = "";

    const far = drag.delta > sheet.offsetHeight / DISMISS_RATIO;
    const flick = drag.delta > 40 && Date.now() - drag.startAt < 250;

    if ((far || flick) && onCloseSheet) onCloseSheet();
  }

  // The tab title carries the clock, so it is readable from another tab.
  useEffect(() => {
    document.title = timer.isRunning ? formatClock(timer.timeLeft) + " madpomo" : "madpomo";
  }, [timer.isRunning, timer.timeLeft]);

  return (
    <aside className="sidebar" id="sidebar" ref={sheetRef}>
      {/* the sheet's handle, on a phone. Hidden above 720px, where this is
          just a column of the grid. */}
      <div
        className="sheet__head"
        onPointerDown={onHandleDown}
        onPointerMove={onHandleMove}
        onPointerUp={onHandleUp}
        onPointerCancel={onHandleUp}
      >
        <span className="sheet__grip" aria-hidden="true" />
        <button
          type="button"
          className="btn btn--icon sheet__close"
          aria-label="close the timer panel"
          onClick={onCloseSheet}
        >
          x
        </button>
      </div>

      <div className="sidebar__section timer">
        <div>
          <h2 className="sidebar__title">{phaseLabel(timer, settings)}</h2>
          <p className="sidebar__subtitle">current task: {currentTask ? currentTask.title : "none"}</p>
          <p className="timer__clock">{formatClock(timer.timeLeft)}</p>
        </div>
        <ul className="timer__actions">
          <li>
            <button type="button" className="btn btn--primary" onClick={startOrPause}>
              {startLabel(timer)}
            </button>
          </li>
          <li>
            <button type="button" className="btn" onClick={takeBreak} disabled={timer.phase === "break"}>
              break
            </button>
          </li>
          <li>
            <button type="button" className="btn btn--outline-danger" onClick={reset}>
              reset
            </button>
          </li>
        </ul>
      </div>

      <Noise />

      <div className="sidebar__section">
        <h2 className="sidebar__title">//task overview</h2>
        <div className="stat">
          <p className="stat__name">today</p>
          <p className="stat__value">{counts.today}</p>
        </div>
        <div className="stat">
          <p className="stat__name">this week</p>
          <p className="stat__value">{counts.week}</p>
        </div>
        <div className="stat">
          <p className="stat__name">this month</p>
          <p className="stat__value">{counts.month}</p>
        </div>
        <div className="stat">
          <p className="stat__name">cancelled tasks</p>
          <p className="stat__value">{counts.cancelled}</p>
        </div>
      </div>

      <div className="sidebar__section history">
        <h2 className="sidebar__title">//last 7D</h2>
        <div className="history__list">
          {days.map((day, index) => (
            <div key={index} className={"history__row" + (day.isToday ? " history__row--today" : "")}>
              <p className="history__day">{day.label}</p>
              <div className="history__cells">
                {Array.from({ length: Math.min(day.count, MAX_CELLS) }, (_, cell) => (
                  <div key={cell} className="history__cell" />
                ))}
              </div>
              <p className="history__count">{day.count}</p>
            </div>
          ))}
        </div>

        {route === "board" ? (
          <a href="#/report" className="btn history__report">pomodoro report</a>
        ) : null}
      </div>

      {route === "board" ? null : (
        <a href="#/board" className="btn btn--primary">&lt;- back to board</a>
      )}
    </aside>
  );
}
