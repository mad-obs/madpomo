import { useEffect } from "react";
import { useMadpomo } from "../store.jsx";
import { formatClock, pomodorosPerDay, taskOverview } from "../lib/stats.js";

const MAX_CELLS = 24;

export default function Sidebar({ route }) {
  const { settings, tasks, sessions, timer, startOrPause, takeBreak, reset } = useMadpomo();

  const counts = taskOverview(tasks, settings);
  const days = pomodorosPerDay(sessions, 7);
  const currentTask = tasks.find((task) => task.id === timer.taskId);
  const longBreak = timer.cycle >= settings.cycleLength;

  const phaseLabel =
    timer.phase === "focus"
      ? "//focus | #" + timer.cycle + " of " + settings.cycleLength
      : longBreak
        ? "//long break"
        : "//break";

  const startLabel = timer.phase === "break" ? "resume" : timer.isRunning ? "pause" : "start";

  // The tab title carries the clock, so it is readable from another tab.
  useEffect(() => {
    document.title = timer.isRunning ? formatClock(timer.timeLeft) + " madpomo" : "madpomo";
  }, [timer.isRunning, timer.timeLeft]);

  return (
    <aside className="sidebar">
      <div className="sidebar__section timer">
        <div>
          <h2 className="sidebar__title">{phaseLabel}</h2>
          <p className="sidebar__subtitle">current task: {currentTask ? currentTask.title : "none"}</p>
          <p className="timer__clock">{formatClock(timer.timeLeft)}</p>
        </div>
        <ul className="timer__actions">
          <li>
            <button type="button" className="btn btn--primary" onClick={startOrPause}>
              {startLabel}
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
