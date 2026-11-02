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
    weekStartsOn: "MON"
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
