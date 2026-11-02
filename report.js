/* ==========================================================================
   madpomo — the report (report.html only)

   Everything here is derived from madpomo.sessions, which the timer writes
   one row to per focus session. Nothing on this page is hardcoded: with no
   sessions logged yet it draws empty states rather than fake numbers.
   ========================================================================== */

(function () {
  const rangeSwitch = document.getElementById("range-switch");
  const kpis = document.getElementById("kpis");
  const tableRows = document.getElementById("task-table-rows");
  const insightBody = document.getElementById("insight-body");
  const pauseRows = document.getElementById("pause-rows");
  const trend = document.getElementById("trend");

  if (!rangeSwitch || !kpis || !tableRows || !pauseRows || !trend) return;

  let rangeKey = "7D";

  function esc(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function pct(value) {
    return Math.round(value) + "%";
  }

  function rangeWord() {
    if (rangeKey === "30D") return "the 30 days before";
    if (rangeKey === "ALL") return "all time";
    return "last week";
  }

  /* --------------------------------------------------------------------------
     KPIs
     -------------------------------------------------------------------------- */

  function deltaNote(current, previous, decimals) {
    if (rangeKey === "ALL") return "all time";
    if (previous === 0) return "no earlier data";

    const delta = current - previous;
    const shown = Math.abs(delta).toFixed(decimals);
    if (Number(shown) === 0) return "flat vs " + rangeWord();

    return (delta > 0 ? "+" : "-") + shown + " vs " + rangeWord();
  }

  function renderKpis(summary, previous) {
    kpis.innerHTML = `
      <div class="kpi">
        <p class="kpi__label">avg pomodoros / task</p>
        <p class="kpi__value">${summary.avgPerTask.toFixed(1)}</p>
        <p class="kpi__note">${deltaNote(summary.avgPerTask, previous.avgPerTask, 1)}</p>
      </div>
      <div class="kpi">
        <p class="kpi__label">follow-through</p>
        <p class="kpi__value kpi__value--accent">${pct(summary.followThrough)}</p>
        <p class="kpi__note">${summary.completed} of ${summary.total} pomodoros finished</p>
      </div>
      <div class="kpi">
        <p class="kpi__label">pauses / pomodoro</p>
        <p class="kpi__value">${summary.pausesPerPomodoro.toFixed(1)}</p>
        <p class="kpi__note">${summary.pauses} pause${summary.pauses === 1 ? "" : "s"} in total</p>
      </div>
      <div class="kpi">
        <p class="kpi__label">focus time</p>
        <p class="kpi__value">${MP.formatDuration(summary.seconds)}</p>
        <p class="kpi__note">${summary.completed} completed pomodoro${summary.completed === 1 ? "" : "s"}</p>
      </div>
    `;
  }

  /* --------------------------------------------------------------------------
     Tasks x pomodoros
     -------------------------------------------------------------------------- */

  const MAX_DOTS = 12;

  function dotClass(session) {
    if (!session.completed) return "dot dot--available";
    if ((session.pauses || 0) > 0) return "dot dot--paused";
    return "dot";
  }

  function dotsHTML(sessions) {
    const shown = sessions.slice(0, MAX_DOTS);
    const hidden = sessions.length - shown.length;

    const marks = shown.map(function (session) {
      return `<span class="${dotClass(session)}"></span>`;
    }).join("");

    const more = hidden > 0 ? `<span class="dots__more">+${hidden}</span>` : "";
    return `<div class="dots">${marks}${more}</div>`;
  }

  function renderTaskTable(sessions) {
    const groups = MP.byTask(sessions);

    if (groups.length === 0) {
      tableRows.innerHTML = `<p class="empty">no pomodoros in this range yet.</p>`;
      return;
    }

    tableRows.innerHTML = groups.map(function (group, index) {
      const isLast = index === groups.length - 1;
      const full = group.followThrough >= 100;

      return `
        <div class="task-table__row${isLast ? " task-table__row--last" : ""}">
          <p class="task-table__name">${esc(group.title)}</p>
          ${dotsHTML(group.sessions)}
          <p class="task-table__num task-table__num--bold">${group.completed}/${group.total}</p>
          <p class="task-table__num">${group.pauses}</p>
          <div class="bar">
            <div class="bar__track">
              <div class="bar__value${full ? " bar__value--accent" : ""}" style="width: ${Math.round(group.followThrough)}%"></div>
            </div>
            <p class="bar__label">${pct(group.followThrough)}</p>
          </div>
        </div>
      `;
    }).join("");
  }

  /* --------------------------------------------------------------------------
     Insight — written from the numbers, not stored
     -------------------------------------------------------------------------- */

  function renderInsight(sessions, summary, previous) {
    if (!insightBody) return;

    if (summary.total === 0) {
      insightBody.textContent = "No pomodoros logged in this range yet. Press start on the board and this page fills itself in.";
      return;
    }

    const parts = [];
    parts.push("You finish " + pct(summary.followThrough) + " of the pomodoros you start.");

    if (rangeKey !== "ALL" && previous.total > 0) {
      const change = summary.followThrough - previous.followThrough;
      if (Math.abs(change) < 1) {
        parts.push("That is flat against " + rangeWord() + ".");
      } else {
        parts.push("That is " + pct(Math.abs(change)) + (change > 0 ? " up from " : " down from ") + rangeWord() + ".");
      }
    }

    const groups = MP.byTask(sessions);
    const worst = groups.filter(function (group) {
      return group.total >= 2 && group.followThrough < 100;
    }).sort(function (a, b) {
      return a.followThrough - b.followThrough;
    })[0];

    if (worst) {
      parts.push('Most abandoned pomodoros sit in "' + worst.title + '" — try splitting it into smaller tasks.');
    } else if (summary.followThrough >= 100) {
      parts.push("Every pomodoro you started reached 00:00.");
    }

    insightBody.textContent = parts.join(" ");
  }

  /* --------------------------------------------------------------------------
     Pauses per pomodoro
     -------------------------------------------------------------------------- */

  function renderPauses(sessions) {
    const buckets = MP.pauseHistogram(sessions);
    const total = sessions.length;

    const rows = [
      { label: "no pause", count: buckets.none, accent: true },
      { label: "1 pause", count: buckets.one, accent: false },
      { label: "2+ pauses", count: buckets.many, accent: false }
    ];

    pauseRows.innerHTML = rows.map(function (row) {
      const width = total === 0 ? 0 : Math.round((row.count / total) * 100);

      return `
        <div class="pause-row">
          <div class="pause-row__labels">
            <p>${row.label}</p>
            <p class="pause-row__count">${row.count}</p>
          </div>
          <div class="pause-bar">
            <div class="pause-bar__value${row.accent ? " pause-bar__value--accent" : ""}" style="width: ${width}%"></div>
            <div class="pause-bar__track"></div>
          </div>
        </div>
      `;
    }).join("");
  }

  /* --------------------------------------------------------------------------
     Follow-through, last 4 weeks (always weeks, whatever the range switch says)
     -------------------------------------------------------------------------- */

  function renderTrend(allSessions) {
    const weeks = MP.weeklyTrend(allSessions, 4);

    trend.innerHTML = weeks.map(function (week, index) {
      const isCurrent = index === weeks.length - 1;
      const height = week.total === 0 ? 0 : Math.round(week.pct);

      return `
        <div class="trend__col">
          <div class="trend__zone">
            <div class="trend__bar${isCurrent ? " trend__bar--accent" : ""}" style="height: ${height}%"></div>
          </div>
          <p class="trend__value">${week.total === 0 ? "--" : pct(week.pct)}</p>
          <p class="trend__label">${week.label}</p>
        </div>
      `;
    }).join("");
  }

  /* --------------------------------------------------------------------------
     Wiring
     -------------------------------------------------------------------------- */

  function render() {
    const all = MP.loadSessions();
    const range = MP.rangeFor(rangeKey);
    const sessions = MP.inRange(all, range);
    const summary = MP.summarize(sessions);
    const previous = MP.summarize(MP.inRange(all, MP.previousRange(range)));

    renderKpis(summary, previous);
    renderTaskTable(sessions);
    renderInsight(sessions, summary, previous);
    renderPauses(sessions);
    renderTrend(all);
  }

  rangeSwitch.addEventListener("click", function (event) {
    const button = event.target.closest(".segmented__item");
    if (!button) return;

    rangeKey = button.dataset.range;

    rangeSwitch.querySelectorAll(".segmented__item").forEach(function (item) {
      item.classList.toggle("segmented__item--active", item === button);
    });

    render();
  });

  MP.onDataChanged(render);
  render();
})();
