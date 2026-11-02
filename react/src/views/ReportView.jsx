import { useState } from "react";
import { useMadpomo } from "../store.jsx";
import {
  byTask,
  formatDuration,
  inRange,
  pauseHistogram,
  previousRange,
  rangeFor,
  summarize,
  weeklyTrend
} from "../lib/stats.js";

const MAX_DOTS = 12;
const RANGES = ["7D", "30D", "ALL"];

const pct = (value) => Math.round(value) + "%";

function dotClass(session) {
  if (!session.completed) return "dot dot--available";
  return (session.pauses || 0) > 0 ? "dot dot--paused" : "dot";
}

export default function ReportView() {
  const { sessions, settings } = useMadpomo();
  const [rangeKey, setRangeKey] = useState("7D");

  const range = rangeFor(rangeKey);
  const inView = inRange(sessions, range);
  const summary = summarize(inView);
  const previous = summarize(inRange(sessions, previousRange(range)));
  const groups = byTask(inView);
  const buckets = pauseHistogram(inView);
  const weeks = weeklyTrend(sessions, settings, 4);

  const rangeWord = rangeKey === "30D" ? "the 30 days before" : rangeKey === "ALL" ? "all time" : "last week";

  function deltaNote(current, before, decimals) {
    if (rangeKey === "ALL") return "all time";
    if (before === 0) return "no earlier data";
    const delta = current - before;
    const shown = Math.abs(delta).toFixed(decimals);
    if (Number(shown) === 0) return "flat vs " + rangeWord;
    return (delta > 0 ? "+" : "-") + shown + " vs " + rangeWord;
  }

  function insight() {
    if (summary.total === 0) {
      return "No pomodoros logged in this range yet. Press start on the board and this page fills itself in.";
    }

    const parts = ["You finish " + pct(summary.followThrough) + " of the pomodoros you start."];

    if (rangeKey !== "ALL" && previous.total > 0) {
      const change = summary.followThrough - previous.followThrough;
      if (Math.abs(change) < 1) parts.push("That is flat against " + rangeWord + ".");
      else parts.push("That is " + pct(Math.abs(change)) + (change > 0 ? " up from " : " down from ") + rangeWord + ".");
    }

    const worst = groups
      .filter((group) => group.total >= 2 && group.followThrough < 100)
      .sort((a, b) => a.followThrough - b.followThrough)[0];

    if (worst) parts.push('Most abandoned pomodoros sit in "' + worst.title + '" — try splitting it into smaller tasks.');
    else if (summary.followThrough >= 100) parts.push("Every pomodoro you started reached 00:00.");

    return parts.join(" ");
  }

  return (
    <>
      <section className="toolbar">
        <h1 className="toolbar__title">Pomodoro Report</h1>
        <div className="segmented">
          {RANGES.map((key) => (
            <button
              key={key}
              type="button"
              className={"segmented__item" + (key === rangeKey ? " segmented__item--active" : "")}
              onClick={() => setRangeKey(key)}
            >
              {key}
            </button>
          ))}
        </div>
      </section>

      <div className="content">
        <section className="kpis">
          <div className="kpi">
            <p className="kpi__label">avg pomodoros / task</p>
            <p className="kpi__value">{summary.avgPerTask.toFixed(1)}</p>
            <p className="kpi__note">{deltaNote(summary.avgPerTask, previous.avgPerTask, 1)}</p>
          </div>
          <div className="kpi">
            <p className="kpi__label">follow-through</p>
            <p className="kpi__value kpi__value--accent">{pct(summary.followThrough)}</p>
            <p className="kpi__note">{summary.completed} of {summary.total} pomodoros finished</p>
          </div>
          <div className="kpi">
            <p className="kpi__label">pauses / pomodoro</p>
            <p className="kpi__value">{summary.pausesPerPomodoro.toFixed(1)}</p>
            <p className="kpi__note">{summary.pauses} pause{summary.pauses === 1 ? "" : "s"} in total</p>
          </div>
          <div className="kpi">
            <p className="kpi__label">focus time</p>
            <p className="kpi__value">{formatDuration(summary.seconds)}</p>
            <p className="kpi__note">{summary.completed} completed pomodoro{summary.completed === 1 ? "" : "s"}</p>
          </div>
        </section>

        <section className="report-grid">
          <div className="report-grid__left">
            <div className="card">
              <h2 className="card__title">//Tasks x Pomodoros</h2>
              <div className="task-table">
                <div className="task-table__head">
                  <p className="task-table__col--name">task</p>
                  <p className="task-table__col--dots">pomodoros</p>
                  <p className="task-table__col--num">done</p>
                  <p className="task-table__col--num">pauses</p>
                  <p className="task-table__col--bar">follow-through</p>
                </div>

                <div className="task-table__rows">
                  {groups.length === 0 ? (
                    <p className="empty">no pomodoros in this range yet.</p>
                  ) : (
                    groups.map((group, index) => (
                      <div
                        key={group.key}
                        className={"task-table__row" + (index === groups.length - 1 ? " task-table__row--last" : "")}
                      >
                        <p className="task-table__name">{group.title}</p>
                        <div className="dots">
                          {group.sessions.slice(0, MAX_DOTS).map((session, i) => (
                            <span key={i} className={dotClass(session)} />
                          ))}
                          {group.total > MAX_DOTS ? (
                            <span className="dots__more">+{group.total - MAX_DOTS}</span>
                          ) : null}
                        </div>
                        <p className="task-table__num task-table__num--bold">{group.completed}/{group.total}</p>
                        <p className="task-table__num">{group.pauses}</p>
                        <div className="bar">
                          <div className="bar__track">
                            <div
                              className={"bar__value" + (group.followThrough >= 100 ? " bar__value--accent" : "")}
                              style={{ width: Math.round(group.followThrough) + "%" }}
                            />
                          </div>
                          <p className="bar__label">{pct(group.followThrough)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="dots-legend">
                  <div className="dots-legend__item"><span className="dot" /><p>completed</p></div>
                  <div className="dots-legend__item"><span className="dot dot--paused" /><p>completed after a pause</p></div>
                  <div className="dots-legend__item"><span className="dot dot--available" /><p>not followed through</p></div>
                </div>
              </div>
            </div>

            <div className="insight">
              <div className="insight__text">
                <p className="insight__label">//Insight</p>
                <p className="insight__body">{insight()}</p>
              </div>
            </div>
          </div>

          <div className="report-grid__right">
            <div className="card">
              <h2 className="card__title">//Pauses per Pomodoro</h2>
              <div className="pause-rows">
                {[
                  { label: "no pause", count: buckets.none, accent: true },
                  { label: "1 pause", count: buckets.one, accent: false },
                  { label: "2+ pauses", count: buckets.many, accent: false }
                ].map((row) => (
                  <div className="pause-row" key={row.label}>
                    <div className="pause-row__labels">
                      <p>{row.label}</p>
                      <p className="pause-row__count">{row.count}</p>
                    </div>
                    <div className="pause-bar">
                      <div
                        className={"pause-bar__value" + (row.accent ? " pause-bar__value--accent" : "")}
                        style={{ width: (summary.total === 0 ? 0 : Math.round((row.count / summary.total) * 100)) + "%" }}
                      />
                      <div className="pause-bar__track" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="card__title">//Follow-through, Last 4 Weeks</h2>
              <div className="trend">
                {weeks.map((week, index) => (
                  <div className="trend__col" key={week.label}>
                    <div className="trend__zone">
                      <div
                        className={"trend__bar" + (index === weeks.length - 1 ? " trend__bar--accent" : "")}
                        style={{ height: (week.total === 0 ? 0 : Math.round(week.pct)) + "%" }}
                      />
                    </div>
                    <p className="trend__value">{week.total === 0 ? "--" : pct(week.pct)}</p>
                    <p className="trend__label">{week.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
