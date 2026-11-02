/* ==========================================================================
   madpomo — the shared page shell

   Everything that is on every page and is not the timer: the header date,
   the //task overview counts, and the //last 7D heatmap. Runs on the board,
   the report, the settings page and the about page.
   ========================================================================== */

(function () {
  const dateEl = document.getElementById("header-date");
  const statToday = document.getElementById("stat-today");
  const statWeek = document.getElementById("stat-week");
  const statMonth = document.getElementById("stat-month");
  const statCancelled = document.getElementById("stat-cancelled");
  const historyRows = document.getElementById("history-rows");

  // A row of 100 cells would break the sidebar; the count still tells the truth.
  const MAX_CELLS = 24;

  function renderDate() {
    if (!dateEl) return;
    dateEl.textContent = MP.formatHeaderDate(new Date());
  }

  function renderOverview() {
    if (!statToday) return;
    const counts = MP.taskOverview(MP.tasks);
    statToday.textContent = counts.today;
    statWeek.textContent = counts.week;
    statMonth.textContent = counts.month;
    statCancelled.textContent = counts.cancelled;
  }

  function renderHistory() {
    if (!historyRows) return;

    const days = MP.pomodorosPerDay(MP.loadSessions(), 7);

    historyRows.innerHTML = days.map(function (day) {
      const cells = new Array(Math.min(day.count, MAX_CELLS))
        .fill('<div class="history__cell"></div>')
        .join("");

      return `
        <div class="history__row${day.isToday ? " history__row--today" : ""}">
          <p class="history__day">${day.label}</p>
          <div class="history__cells">${cells}</div>
          <p class="history__count">${day.count}</p>
        </div>
      `;
    }).join("");
  }

  function refresh() {
    renderDate();
    renderOverview();
    renderHistory();
  }

  MP.onDataChanged(refresh);
  refresh();

  // The header clock shows seconds, so it has to redraw every second.
  setInterval(renderDate, 1000);
})();
