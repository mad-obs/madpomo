/* ==========================================================================
   madpomo — dates + statistics

   Pure functions only: every number on the report page and in the sidebar is
   derived here from the session log, so there is one place to fix a formula.
   Loaded after storage.js on every page.
   ========================================================================== */

window.MP = window.MP || {};

MP.DAY_MS = 24 * 60 * 60 * 1000;
MP.WEEKDAYS_LONG = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
MP.WEEKDAYS_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
MP.MONTHS_SHORT = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/* --------------------------------------------------------------------------
   Dates
   -------------------------------------------------------------------------- */

MP.startOfDay = function (date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

MP.startOfWeek = function (date) {
  const firstDay = MP.settings.weekStartsOn === "SUN" ? 0 : 1;
  const start = MP.startOfDay(date);
  const shift = (start.getDay() - firstDay + 7) % 7;
  start.setDate(start.getDate() - shift);
  return start;
};

MP.startOfMonth = function (date) {
  const start = MP.startOfDay(date);
  start.setDate(1);
  return start;
};

MP.pad2 = function (value) {
  return String(value).padStart(2, "0");
};

/* "13/OCT/2026". A month as a word cannot be read the American way round,
   which a number can. */
MP.formatDate = function (date) {
  return MP.pad2(date.getDate()) + "/" + MP.MONTHS_SHORT[date.getMonth()] + "/" + date.getFullYear();
};

/* "12:24" in 24H mode, "12:24 pm" in 12H mode.
   withSeconds adds them: "12:24:07". The header clock asks for seconds;
   a task's due date does not. */
MP.formatTime = function (date, withSeconds) {
  const clock = MP.settings.timeFormat === "12H"
    ? (date.getHours() % 12 === 0 ? 12 : date.getHours() % 12)
    : MP.pad2(date.getHours());

  let text = clock + ":" + MP.pad2(date.getMinutes());
  if (withSeconds) text = text + ":" + MP.pad2(date.getSeconds());
  if (MP.settings.timeFormat === "12H") text = text + (date.getHours() < 12 ? " am" : " pm");

  return text;
};

/* "monday . 13/10/2026 . 12:24:07" */
MP.formatHeaderDate = function (date) {
  return MP.WEEKDAYS_LONG[date.getDay()] + " . " + MP.formatDate(date) + " . " + MP.formatTime(date, true);
};

/* "10h 50m", "50m", "0m" */
MP.formatDuration = function (seconds) {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return minutes + "m";
  return hours + "h " + minutes + "m";
};

/* "25:00" */
MP.formatClock = function (seconds) {
  const safe = Math.max(0, seconds);
  return MP.pad2(Math.floor(safe / 60)) + ":" + MP.pad2(safe % 60);
};

/* --------------------------------------------------------------------------
   Ranges
   -------------------------------------------------------------------------- */

/* key is "7D", "30D" or "ALL". Returns { from, to } in milliseconds. */
MP.rangeFor = function (key, now) {
  const end = now === undefined ? Date.now() : now;

  if (key === "ALL") return { from: 0, to: end };

  const days = key === "30D" ? 30 : 7;
  const start = MP.startOfDay(new Date(end));
  start.setDate(start.getDate() - (days - 1));
  return { from: start.getTime(), to: end };
};

/* The window of the same length sitting immediately before this one. */
MP.previousRange = function (range) {
  const span = range.to - range.from;
  return { from: range.from - span, to: range.from };
};

MP.inRange = function (sessions, range) {
  return sessions.filter(function (session) {
    return session.startedAt >= range.from && session.startedAt <= range.to;
  });
};

/* --------------------------------------------------------------------------
   Aggregations over a list of sessions
   -------------------------------------------------------------------------- */

MP.summarize = function (sessions) {
  let completed = 0;
  let pauses = 0;
  let seconds = 0;
  const taskKeys = {};

  sessions.forEach(function (session) {
    if (session.completed) completed = completed + 1;
    pauses = pauses + (session.pauses || 0);
    seconds = seconds + (session.seconds || 0);
    taskKeys[session.taskId === null ? "none" : session.taskId] = true;
  });

  const total = sessions.length;
  const taskCount = Object.keys(taskKeys).length;

  return {
    total: total,
    completed: completed,
    abandoned: total - completed,
    pauses: pauses,
    seconds: seconds,
    taskCount: taskCount,
    followThrough: total === 0 ? 0 : (completed / total) * 100,
    pausesPerPomodoro: total === 0 ? 0 : pauses / total,
    avgPerTask: taskCount === 0 ? 0 : completed / taskCount
  };
};

/* One row per task that has at least one session, busiest first. */
MP.byTask = function (sessions) {
  const groups = [];
  const index = {};

  sessions.forEach(function (session) {
    const key = session.taskId === null ? "none" : String(session.taskId);

    if (index[key] === undefined) {
      index[key] = groups.length;
      groups.push({
        key: key,
        title: session.taskTitle || "no task",
        sessions: [],
        completed: 0,
        pauses: 0
      });
    }

    const group = groups[index[key]];
    group.title = session.taskTitle || group.title;
    group.sessions.push(session);
    if (session.completed) group.completed = group.completed + 1;
    group.pauses = group.pauses + (session.pauses || 0);
  });

  groups.forEach(function (group) {
    group.total = group.sessions.length;
    group.followThrough = group.total === 0 ? 0 : (group.completed / group.total) * 100;
  });

  groups.sort(function (a, b) {
    return b.total - a.total;
  });

  return groups;
};

MP.pauseHistogram = function (sessions) {
  const buckets = { none: 0, one: 0, many: 0 };

  sessions.forEach(function (session) {
    const pauses = session.pauses || 0;
    if (pauses === 0) buckets.none = buckets.none + 1;
    else if (pauses === 1) buckets.one = buckets.one + 1;
    else buckets.many = buckets.many + 1;
  });

  return buckets;
};

/* Follow-through per week, oldest first, ending with the current week. */
MP.weeklyTrend = function (sessions, weeks) {
  const count = weeks === undefined ? 4 : weeks;
  const thisWeekStart = MP.startOfWeek(new Date());
  const rows = [];

  for (let back = count - 1; back >= 0; back = back - 1) {
    const from = thisWeekStart.getTime() - back * 7 * MP.DAY_MS;
    const range = { from: from, to: from + 7 * MP.DAY_MS };
    const summary = MP.summarize(MP.inRange(sessions, range));

    rows.push({
      label: back === 0 ? "this week" : "w-" + back,
      pct: summary.followThrough,
      total: summary.total
    });
  }

  return rows;
};

/* Completed pomodoros per day, oldest first, ending today. */
MP.pomodorosPerDay = function (sessions, days) {
  const count = days === undefined ? 7 : days;
  const today = MP.startOfDay(new Date());
  const rows = [];

  for (let back = count - 1; back >= 0; back = back - 1) {
    const dayStart = new Date(today.getTime());
    dayStart.setDate(dayStart.getDate() - back);
    const dayEnd = dayStart.getTime() + MP.DAY_MS;

    const finished = sessions.filter(function (session) {
      return session.completed && session.startedAt >= dayStart.getTime() && session.startedAt < dayEnd;
    });

    rows.push({
      label: MP.WEEKDAYS_SHORT[dayStart.getDay()],
      count: finished.length,
      isToday: back === 0
    });
  }

  return rows;
};

/* --------------------------------------------------------------------------
   Task counts for the sidebar //task overview
   -------------------------------------------------------------------------- */

MP.taskOverview = function (tasks) {
  const now = new Date();
  const dayStart = MP.startOfDay(now).getTime();
  const weekStart = MP.startOfWeek(now).getTime();
  const monthStart = MP.startOfMonth(now).getTime();

  let today = 0;
  let week = 0;
  let month = 0;
  let cancelled = 0;

  tasks.forEach(function (task) {
    if (task.status === "cancelled") cancelled = cancelled + 1;
    if (task.status !== "completed" || !task.completedAt) return;
    if (task.completedAt >= dayStart) today = today + 1;
    if (task.completedAt >= weekStart) week = week + 1;
    if (task.completedAt >= monthStart) month = month + 1;
  });

  return { today: today, week: week, month: month, cancelled: cancelled };
};
