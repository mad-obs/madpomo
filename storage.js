/* ==========================================================================
   madpomo — storage layer

   Loaded first on every page. Everything shared between pages hangs off one
   global object (MP) instead of a dozen loose variables, so the other script
   files can talk to each other without clashing.

   Five localStorage keys:
     madpomo.tasks     the board
     madpomo.timer     the timer's current phase / cycle / remaining time
     madpomo.sessions  the log of focus sessions (what the report is built on)
     madpomo.settings  user preferences
     madpomo.tutorial  whether the first-run tour has been offered
     madpomo.columns   the board's columns, including any you add yourself
   ========================================================================== */

window.MP = window.MP || {};

MP.KEYS = {
  tasks: "madpomo.tasks",
  timer: "madpomo.timer",
  sessions: "madpomo.sessions",
  settings: "madpomo.settings",
  tutorial: "madpomo.tutorial",
  columns: "madpomo.columns"
};

/* Read + parse one key. Returns `fallback` when the key is missing or the
   stored text is not valid JSON, so a corrupted save can never break a page. */
MP.read = function (key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    console.warn("madpomo: could not read " + key + ", using defaults.", error);
    return fallback;
  }
};

MP.write = function (key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("madpomo: could not save " + key + ".", error);
  }
};

/* --------------------------------------------------------------------------
   Settings
   -------------------------------------------------------------------------- */

MP.defaultSettings = function () {
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
    noiseVolume: 4
  };
};

/* Object.assign over the defaults, so a save written before a new setting
   existed still comes back with every field present. */
MP.settings = Object.assign(MP.defaultSettings(), MP.read(MP.KEYS.settings, {}));

MP.saveSettings = function () {
  MP.write(MP.KEYS.settings, MP.settings);
};

/* --------------------------------------------------------------------------
   Tasks
   -------------------------------------------------------------------------- */

MP.defaultTasks = function () {
  return [
    {
      id: 1,
      title: "task 1",
      dueDate: "",
      notes: "add your task description here...",
      subtasks: [
        { text: "subtask 1", done: false },
        { text: "subtask 2", done: false }
      ],
      status: "todo",
      cyclesUsed: 0,
      expanded: false
    }
  ];
};

MP.normalizeTask = function (task) {
  const clean = Object.assign({
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
  }, task);

  if (!Array.isArray(clean.subtasks)) clean.subtasks = [];
  return clean;
};

MP.loadTasks = function () {
  const saved = MP.read(MP.KEYS.tasks, null);
  const list = Array.isArray(saved) ? saved : MP.defaultTasks();
  return list.map(MP.normalizeTask);
};

/* One shared array for the whole page: the board edits it, the timer reads
   task titles out of it, the sidebar counts it. */
MP.tasks = MP.loadTasks();

MP.saveTasks = function (list) {
  MP.write(MP.KEYS.tasks, list === undefined ? MP.tasks : list);
};

MP.nextTaskId = MP.tasks.reduce(function (highest, task) {
  return Math.max(highest, task.id);
}, 0) + 1;

/* --------------------------------------------------------------------------
   Columns

   A task's `status` is the id of the column it sits in, which is why the four
   built-in ids are the four old status names: a board saved before columns
   existed still loads.

   `kind` is what a column means, and only two kinds carry behaviour: "done"
   is where finish puts a task and what the report counts, "dropped" is where
   cancel puts it. Columns you add yourself are "open" — somewhere for work to
   live, counted nowhere. The four built-ins are fixed: the rest of the app
   names them, so they cannot be renamed or deleted.
   -------------------------------------------------------------------------- */

MP.defaultColumns = function () {
  return [
    { id: "todo", name: "to do", kind: "open", fixed: true },
    { id: "in-progress", name: "in progress", kind: "open", fixed: true },
    { id: "completed", name: "completed", kind: "done", fixed: true },
    { id: "cancelled", name: "cancelled", kind: "dropped", fixed: true }
  ];
};

MP.isBuiltInColumn = function (id) {
  return MP.defaultColumns().some(function (column) {
    return column.id === id;
  });
};

/* Whatever was stored, the four built-ins come back intact and "done" and
   "dropped" stay at the end — otherwise finish and cancel would have nowhere
   to put a task. Only the custom columns in between are really restored. */
MP.loadColumns = function () {
  const saved = MP.read(MP.KEYS.columns, null);
  const builtIn = MP.defaultColumns();
  if (!Array.isArray(saved)) return builtIn;

  const seen = {};
  const custom = [];

  saved.forEach(function (column) {
    if (!column || typeof column.id !== "string") return;
    if (MP.isBuiltInColumn(column.id) || seen[column.id]) return;
    seen[column.id] = true;
    custom.push({
      id: column.id,
      name: typeof column.name === "string" && column.name.trim() !== "" ? column.name.trim() : "untitled",
      kind: "open",
      fixed: false
    });
  });

  const open = builtIn.filter(function (column) { return column.kind === "open"; });
  const closed = builtIn.filter(function (column) { return column.kind !== "open"; });

  return open.concat(custom, closed);
};

MP.columns = MP.loadColumns();


MP.saveColumns = function (list) {
  if (list) MP.columns = list;
  MP.write(MP.KEYS.columns, MP.columns);
};

MP.columnById = function (id) {
  return MP.columns.find(function (column) {
    return column.id === id;
  }) || null;
};

/* Where tasks go when the column they were in is deleted. */
MP.firstOpenColumn = function () {
  const found = MP.columns.find(function (column) {
    return column.kind === "open";
  });
  return found ? found.id : "todo";
};

/* A task whose column no longer exists would render nowhere, so it is put
   back in the first open column instead of quietly vanishing. This is what
   catches an import from a board that had columns the current one does not. */
MP.repairTaskColumns = function () {
  const known = {};
  MP.columns.forEach(function (column) {
    known[column.id] = true;
  });

  let moved = 0;
  const fallback = MP.firstOpenColumn();

  MP.tasks.forEach(function (task) {
    if (known[task.status]) return;
    task.status = fallback;
    moved = moved + 1;
  });

  if (moved > 0) MP.saveTasks();
  return moved;
};

MP.repairTaskColumns();

/* --------------------------------------------------------------------------
   Focus sessions — the report's raw data

   One entry per focus session that actually ran:
     { id, taskId, taskTitle, startedAt, endedAt, seconds, completed, pauses }

   `completed` is true only when the clock reached 00:00. A session abandoned
   by taking an early break, resetting, or finishing the task counts as
   started-but-not-finished, which is what "follow-through" measures.
   -------------------------------------------------------------------------- */

/* Two sessions cannot start in the same millisecond on the same task, so a
   repeat of that pair is a duplicate — written by a second tab that had the
   board open and reached 00:00 on its own copy of the clock. Dropping them on
   read repairs a log that already has some. */
MP.loadSessions = function () {
  const saved = MP.read(MP.KEYS.sessions, null);
  if (!Array.isArray(saved)) return [];

  const seen = {};
  return saved.filter(function (session) {
    const key = session.startedAt + "|" + session.taskId;
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  });
};

MP.saveSessions = function (list) {
  MP.write(MP.KEYS.sessions, list);
};

MP.logSession = function (session) {
  const list = MP.loadSessions();
  list.push(session);
  MP.saveSessions(list);
  return list;
};

/* Called by any page after it changes stored data, so the shared sidebar
   numbers never go stale. shell.js installs the real listener. */
MP.dataChangedHandlers = [];

MP.onDataChanged = function (handler) {
  MP.dataChangedHandlers.push(handler);
};

MP.dataChanged = function () {
  MP.dataChangedHandlers.forEach(function (handler) {
    try {
      handler();
    } catch (error) {
      console.warn("madpomo: a refresh handler failed.", error);
    }
  });
};

/* --------------------------------------------------------------------------
   Backup files

   Export writes one JSON file holding four of the six keys. The timer and the
   tutorial flag are left out on purpose: they describe this browser, not your
   work. Import is the way back in — without it an export is a file nothing can
   read, which is no backup at all.

   readBackup only checks the shape of the file. It does not need to check the
   values, because nothing here is trusted straight afterwards: the page
   reloads, and every key goes back through the loaders above, where tasks are
   normalized, unknown columns dropped and repeated sessions removed.
   -------------------------------------------------------------------------- */

MP.BACKUP_VERSION = 1;

/* The four keys a backup carries, in the order the summary names them. */
MP.BACKUP_PARTS = [
  { key: "tasks", list: true, one: "task", many: "tasks" },
  { key: "sessions", list: true, one: "pomodoro", many: "pomodoros" },
  { key: "columns", list: true, one: "column", many: "columns" },
  { key: "settings", list: false, many: "settings" }
];

/* Returns { ok: true, data, summary } or { ok: false, error }, where `error`
   is a sentence meant to be shown as it is. */
MP.readBackup = function (text) {
  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return { ok: false, error: "that file is not valid JSON." };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || parsed.app !== "madpomo") {
    return { ok: false, error: "that file is not a madpomo backup." };
  }

  if (typeof parsed.version === "number" && parsed.version > MP.BACKUP_VERSION) {
    return { ok: false, error: "that backup was written by a newer version of madpomo than this one." };
  }

  const data = {};
  const summary = [];

  MP.BACKUP_PARTS.forEach(function (part) {
    const value = parsed[part.key];
    if (value === undefined || value === null) return;

    /* A missing key is fine — an older file, or one exported before that key
       existed, restores the parts it does have. A key of the wrong type is
       not fine, so it is skipped rather than written. */
    if (part.list ? !Array.isArray(value) : Array.isArray(value) || typeof value !== "object") return;

    data[part.key] = value;
    summary.push(
      part.list ? value.length + " " + (value.length === 1 ? part.one : part.many) : part.many
    );
  });

  if (Object.keys(data).length === 0) {
    return { ok: false, error: "that backup has no madpomo data in it." };
  }

  return { ok: true, data: data, summary: summary.join(", ") };
};

/* Replaces what is stored with what the file holds. The timer is cleared
   rather than left alone: a backup has no clock in it, and a clock carried
   over from different data would be counting against a task that is not on
   this board any more. The caller reloads the page straight after. */
MP.applyBackup = function (data) {
  Object.keys(data).forEach(function (key) {
    MP.write(MP.KEYS[key], data[key]);
  });

  try {
    localStorage.removeItem(MP.KEYS.timer);
  } catch (error) {
    console.warn("madpomo: could not clear " + MP.KEYS.timer + ".", error);
  }
};
