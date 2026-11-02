/* ==========================================================================
   madpomo (React) — dates and statistics

   Pure functions, no React. Same formulas as the plain-JS build; the only
   change is that the two settings-dependent ones (week start, time format)
   take settings as an argument instead of reading a global.
   ========================================================================== */

export const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEKDAYS_LONG = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
export const WEEKDAYS_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export const pad2 = (value) => String(value).padStart(2, "0");

/* --------------------------------------------------------------------------
   Dates
   -------------------------------------------------------------------------- */

export function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function startOfWeek(date, settings) {
  const firstDay = settings.weekStartsOn === "SUN" ? 0 : 1;
  const start = startOfDay(date);
  start.setDate(start.getDate() - ((start.getDay() - firstDay + 7) % 7));
  return start;
}

export function startOfMonth(date) {
  const start = startOfDay(date);
  start.setDate(1);
  return start;
}

/* "13/10/2026" */
export function formatDate(date) {
  return pad2(date.getDate()) + "/" + pad2(date.getMonth() + 1) + "/" + date.getFullYear();
}

/* "12:24" or "12:24:07", "4:24 pm" in 12H mode */
export function formatTime(date, settings, withSeconds) {
  const clock =
    settings.timeFormat === "12H"
      ? date.getHours() % 12 === 0
        ? 12
        : date.getHours() % 12
      : pad2(date.getHours());

  let text = clock + ":" + pad2(date.getMinutes());
  if (withSeconds) text = text + ":" + pad2(date.getSeconds());
  if (settings.timeFormat === "12H") text = text + (date.getHours() < 12 ? " am" : " pm");
  return text;
}

/* "monday . 13/10/2026 . 12:24:07" */
export function formatHeaderDate(date, settings) {
  return WEEKDAYS_LONG[date.getDay()] + " . " + formatDate(date) + " . " + formatTime(date, settings, true);
}

/* "10h 50m", "50m", "0m" */
export function formatDuration(seconds) {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours === 0 ? minutes + "m" : hours + "h " + minutes + "m";
}

/* "25:00" */
export function formatClock(seconds) {
  const safe = Math.max(0, seconds);
  return pad2(Math.floor(safe / 60)) + ":" + pad2(safe % 60);
}

/* --------------------------------------------------------------------------
   Ranges
   -------------------------------------------------------------------------- */

export function rangeFor(key, now = Date.now()) {
  if (key === "ALL") return { from: 0, to: now };

  const days = key === "30D" ? 30 : 7;
  const start = startOfDay(new Date(now));
  start.setDate(start.getDate() - (days - 1));
  return { from: start.getTime(), to: now };
}

export function previousRange(range) {
  const span = range.to - range.from;
  return { from: range.from - span, to: range.from };
}

export function inRange(sessions, range) {
  return sessions.filter((s) => s.startedAt >= range.from && s.startedAt <= range.to);
}

/* --------------------------------------------------------------------------
   Aggregations
   -------------------------------------------------------------------------- */

export function summarize(sessions) {
  let completed = 0;
  let pauses = 0;
  let seconds = 0;
  const taskKeys = {};

  sessions.forEach((session) => {
    if (session.completed) completed += 1;
    pauses += session.pauses || 0;
    seconds += session.seconds || 0;
    taskKeys[session.taskId === null ? "none" : session.taskId] = true;
  });

  const total = sessions.length;
  const taskCount = Object.keys(taskKeys).length;

  return {
    total,
    completed,
    abandoned: total - completed,
    pauses,
    seconds,
    taskCount,
    followThrough: total === 0 ? 0 : (completed / total) * 100,
    pausesPerPomodoro: total === 0 ? 0 : pauses / total,
    avgPerTask: taskCount === 0 ? 0 : completed / taskCount
  };
}

/* One row per task that has sessions, busiest first. */
export function byTask(sessions) {
  const groups = [];
  const index = {};

  sessions.forEach((session) => {
    const key = session.taskId === null ? "none" : String(session.taskId);

    if (index[key] === undefined) {
      index[key] = groups.length;
      groups.push({ key, title: session.taskTitle || "no task", sessions: [], completed: 0, pauses: 0 });
    }

    const group = groups[index[key]];
    group.title = session.taskTitle || group.title;
    group.sessions.push(session);
    if (session.completed) group.completed += 1;
    group.pauses += session.pauses || 0;
  });

  groups.forEach((group) => {
    group.total = group.sessions.length;
    group.followThrough = group.total === 0 ? 0 : (group.completed / group.total) * 100;
  });

  return groups.sort((a, b) => b.total - a.total);
}

export function pauseHistogram(sessions) {
  const buckets = { none: 0, one: 0, many: 0 };

  sessions.forEach((session) => {
    const pauses = session.pauses || 0;
    if (pauses === 0) buckets.none += 1;
    else if (pauses === 1) buckets.one += 1;
    else buckets.many += 1;
  });

  return buckets;
}

/* Follow-through per week, oldest first, ending with the current week. */
export function weeklyTrend(sessions, settings, weeks = 4) {
  const thisWeekStart = startOfWeek(new Date(), settings);
  const rows = [];

  for (let back = weeks - 1; back >= 0; back -= 1) {
    const from = thisWeekStart.getTime() - back * 7 * DAY_MS;
    const summary = summarize(inRange(sessions, { from, to: from + 7 * DAY_MS }));
    rows.push({ label: back === 0 ? "this week" : "w-" + back, pct: summary.followThrough, total: summary.total });
  }

  return rows;
}

/* Completed pomodoros per day, oldest first, ending today. */
export function pomodorosPerDay(sessions, days = 7) {
  const today = startOfDay(new Date());
  const rows = [];

  for (let back = days - 1; back >= 0; back -= 1) {
    const dayStart = new Date(today.getTime());
    dayStart.setDate(dayStart.getDate() - back);
    const dayEnd = dayStart.getTime() + DAY_MS;

    const finished = sessions.filter(
      (s) => s.completed && s.startedAt >= dayStart.getTime() && s.startedAt < dayEnd
    );

    rows.push({ label: WEEKDAYS_SHORT[dayStart.getDay()], count: finished.length, isToday: back === 0 });
  }

  return rows;
}

/* Counts for the sidebar //task overview. */
export function taskOverview(tasks, settings) {
  const now = new Date();
  const dayStart = startOfDay(now).getTime();
  const weekStart = startOfWeek(now, settings).getTime();
  const monthStart = startOfMonth(now).getTime();

  let today = 0;
  let week = 0;
  let month = 0;
  let cancelled = 0;

  tasks.forEach((task) => {
    if (task.status === "cancelled") cancelled += 1;
    if (task.status !== "completed" || !task.completedAt) return;
    if (task.completedAt >= dayStart) today += 1;
    if (task.completedAt >= weekStart) week += 1;
    if (task.completedAt >= monthStart) month += 1;
  });

  return { today, week, month, cancelled };
}
