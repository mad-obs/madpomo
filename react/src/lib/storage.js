/* ==========================================================================
   madpomo (React) — storage

   The same five localStorage keys as the plain-JS version, so both builds
   read and write the same data. In the plain version this file hung
   everything off a global called MP; here it is ES modules, which is the
   whole difference.
   ========================================================================== */

export const KEYS = {
  tasks: "madpomo.tasks",
  timer: "madpomo.timer",
  sessions: "madpomo.sessions",
  settings: "madpomo.settings",
  tutorial: "madpomo.tutorial",
  columns: "madpomo.columns"
};

export function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    console.warn("madpomo: could not read " + key + ", using defaults.", error);
    return fallback;
  }
}

export function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("madpomo: could not save " + key + ".", error);
  }
}

export function clearAll() {
  Object.values(KEYS).forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn("madpomo: could not clear " + key + ".", error);
    }
  });
}

/* --------------------------------------------------------------------------
   Settings
   -------------------------------------------------------------------------- */

export function defaultSettings() {
  return {
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    cycleLength: 4,
    autoStart: true,
    sound: true,
    desktopNotifications: false,
    timeFormat: "24H",
    weekStartsOn: "MON",
    noiseType: null,
    noiseVolume: 4,
    language: "EN"
  };
}

export function loadSettings() {
  return Object.assign(defaultSettings(), read(KEYS.settings, {}));
}

/* --------------------------------------------------------------------------
   Columns

   A task's `status` is the id of the column it is in, which is why the four
   built-in ids are the old status names: a board saved before columns existed
   still loads. Only two kinds carry behaviour — "done" is where finish puts a
   task and what the report counts, "dropped" is where cancel puts it. Columns
   you add yourself are "open", and the four built-ins cannot be renamed or
   deleted because the rest of the app names them.
   -------------------------------------------------------------------------- */

export function defaultColumns() {
  return [
    { id: "todo", name: "to do", kind: "open", fixed: true },
    { id: "in-progress", name: "in progress", kind: "open", fixed: true },
    { id: "completed", name: "completed", kind: "done", fixed: true },
    { id: "cancelled", name: "cancelled", kind: "dropped", fixed: true }
  ];
}

export function isBuiltInColumn(id) {
  return defaultColumns().some((column) => column.id === id);
}

export function loadColumns() {
  const saved = read(KEYS.columns, null);
  const builtIn = defaultColumns();
  if (!Array.isArray(saved)) return builtIn;

  const seen = {};
  const custom = [];

  saved.forEach((column) => {
    if (!column || typeof column.id !== "string") return;
    if (isBuiltInColumn(column.id) || seen[column.id]) return;
    seen[column.id] = true;
    custom.push({
      id: column.id,
      name: typeof column.name === "string" && column.name.trim() !== "" ? column.name.trim() : "untitled",
      kind: "open",
      fixed: false
    });
  });

  return builtIn
    .filter((column) => column.kind === "open")
    .concat(custom, builtIn.filter((column) => column.kind !== "open"));
}

export function firstOpenColumn(columns) {
  const found = columns.find((column) => column.kind === "open");
  return found ? found.id : "todo";
}

/* --------------------------------------------------------------------------
   Tasks
   -------------------------------------------------------------------------- */

export function normalizeTask(task) {
  const clean = Object.assign(
    {
      id: 0,
      title: "untitled",
      dueDate: "",
      notes: "",
      subtasks: [],
      status: "todo",
      cyclesUsed: 0,
      expanded: false,
      createdAt: Date.now(),
      completedAt: null,
      cancelledAt: null,
      cancelReason: ""
    },
    task
  );

  if (!Array.isArray(clean.subtasks)) clean.subtasks = [];
  return clean;
}

export function defaultTasks() {
  return [
    normalizeTask({
      id: 1,
      title: "task 1",
      notes: "add your task description here...",
      subtasks: [
        { text: "subtask 1", done: false },
        { text: "subtask 2", done: false }
      ]
    })
  ];
}

export function loadTasks() {
  const saved = read(KEYS.tasks, null);
  const list = Array.isArray(saved) ? saved : defaultTasks();
  return list.map(normalizeTask);
}

export function nextId(tasks) {
  return tasks.reduce((highest, task) => Math.max(highest, task.id), 0) + 1;
}

/* --------------------------------------------------------------------------
   Focus sessions — what the report is built from

   One row per focus session that actually ran. `completed` is true only when
   the clock reached 00:00.

   Two sessions cannot start in the same millisecond on the same task, so a
   repeat of that pair is a duplicate: a second tab reaching 00:00 on its own
   copy of the clock. Dropping them on read repairs a log that already has
   some, and it covers React's double-invoked effects in development too.
   -------------------------------------------------------------------------- */

export function loadSessions() {
  const saved = read(KEYS.sessions, null);
  if (!Array.isArray(saved)) return [];

  const seen = {};
  return saved.filter((session) => {
    const key = session.startedAt + "|" + session.taskId;
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

export function appendSession(session) {
  const list = loadSessions();
  const already = list.some(
    (logged) => logged.startedAt === session.startedAt && logged.taskId === session.taskId
  );
  if (already) return { list, added: false };

  const next = list.concat(session);
  write(KEYS.sessions, next);
  return { list: next, added: true };
}

/* --------------------------------------------------------------------------
   Timer
   -------------------------------------------------------------------------- */

export function defaultTimer() {
  return {
    phase: "focus",
    cycle: 1,
    completedPomodoros: 0,
    taskId: null,
    timeLeft: null,
    isRunning: false,
    savedAt: null,
    sessionStartedAt: null,
    sessionPauses: 0,
    sessionTotal: null
  };
}

export function loadTimer() {
  return Object.assign(defaultTimer(), read(KEYS.timer, {}));
}

/* --------------------------------------------------------------------------
   Backup files

   Same format as the plain build writes, so a file exported from either one
   imports into the other. The timer and the tutorial flag stay out of it:
   they describe this browser, not your work.

   readBackup only checks the shape. It does not need to check the values,
   because nothing here is trusted straight afterwards — the page reloads and
   every key goes back through the loaders above, where tasks are normalized,
   unknown columns dropped and repeated sessions removed.
   -------------------------------------------------------------------------- */

export const BACKUP_VERSION = 1;

/* The four keys a backup carries, in the order the summary names them. */
const BACKUP_PARTS = [
  { key: "tasks", list: true, one: "task", many: "tasks" },
  { key: "sessions", list: true, one: "pomodoro", many: "pomodoros" },
  { key: "columns", list: true, one: "column", many: "columns" },
  { key: "settings", list: false, many: "settings" }
];

/* Returns { ok: true, data, summary } or { ok: false, error }, where `error`
   is a sentence meant to be shown as it is. */
export function readBackup(text) {
  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return { ok: false, error: "that file is not valid JSON." };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || parsed.app !== "madpomo") {
    return { ok: false, error: "that file is not a madpomo backup." };
  }

  if (typeof parsed.version === "number" && parsed.version > BACKUP_VERSION) {
    return { ok: false, error: "that backup was written by a newer version of madpomo than this one." };
  }

  const data = {};
  const summary = [];

  BACKUP_PARTS.forEach((part) => {
    const value = parsed[part.key];
    if (value === undefined || value === null) return;

    /* A missing key is fine — an older file restores the parts it does have.
       A key of the wrong type is not, so it is skipped rather than written. */
    const isArray = Array.isArray(value);
    if (part.list ? !isArray : isArray || typeof value !== "object") return;

    data[part.key] = value;
    summary.push(part.list ? value.length + " " + (value.length === 1 ? part.one : part.many) : part.many);
  });

  if (Object.keys(data).length === 0) {
    return { ok: false, error: "that backup has no madpomo data in it." };
  }

  return { ok: true, data, summary: summary.join(", ") };
}

/* Replaces what is stored with what the file holds. The timer is cleared
   rather than left alone: a backup has no clock in it, and a clock carried
   over from different data would be counting against a task that is not on
   this board any more. The caller reloads the page straight after. */
export function applyBackup(data) {
  Object.keys(data).forEach((key) => write(KEYS[key], data[key]));

  try {
    localStorage.removeItem(KEYS.timer);
  } catch (error) {
    console.warn("madpomo: could not clear " + KEYS.timer + ".", error);
  }
}
