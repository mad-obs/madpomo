/* ==========================================================================
   madpomo (React) — the one store

   Tasks, settings, the session log and the timer live here, in a context the
   whole app reads from. In the plain-JS build the sidebar timer was a
   separate script on every page; here it is state that outlives the view you
   are looking at, which is the point of making this a single app.
   ========================================================================== */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import * as db from "./lib/storage.js";

const MadpomoContext = createContext(null);

export function useMadpomo() {
  const value = useContext(MadpomoContext);
  if (!value) throw new Error("useMadpomo must be used inside <MadpomoProvider>");
  return value;
}

/* How long a phase lasts. The cycle decides whether a break is short or long. */
function lengthFor(phase, cycle, settings) {
  if (phase === "focus") return settings.focusMinutes * 60;
  return (cycle >= settings.cycleLength ? settings.longBreakMinutes : settings.shortBreakMinutes) * 60;
}

/* A focus session opens the moment the clock starts running. */
function openSession(timer) {
  if (timer.phase !== "focus" || timer.sessionStartedAt !== null) return timer;
  return { ...timer, sessionStartedAt: Date.now(), sessionPauses: 0, sessionTotal: timer.timeLeft };
}

export function MadpomoProvider({ children }) {
  const [settings, setSettings] = useState(db.loadSettings);
  const [tasks, setTasks] = useState(db.loadTasks);
  const [sessions, setSessions] = useState(db.loadSessions);
  const [columns, setColumns] = useState(db.loadColumns);

  const [timer, setTimer] = useState(() => {
    const saved = db.loadTimer();
    const current = db.loadSettings();

    if (typeof saved.timeLeft !== "number") {
      saved.timeLeft = lengthFor(saved.phase, saved.cycle, current);
    }

    // Catch up a clock that was left running in another view or another visit.
    if (saved.isRunning && saved.savedAt) {
      saved.timeLeft -= Math.max(0, Math.floor((Date.now() - saved.savedAt) / 1000));
    }

    return saved;
  });

  /* ---- persistence ---------------------------------------------------- */

  useEffect(() => db.write(db.KEYS.settings, settings), [settings]);
  useEffect(() => db.write(db.KEYS.tasks, tasks), [tasks]);
  useEffect(() => db.write(db.KEYS.columns, columns), [columns]);

  /* A task whose column no longer exists would render nowhere, so it goes
     back to the first open column rather than quietly vanishing — which is
     what catches an import from a board with columns this one does not have. */
  useEffect(() => {
    const known = {};
    columns.forEach((column) => {
      known[column.id] = true;
    });

    const orphaned = tasks.some((task) => !known[task.status]);
    if (!orphaned) return;

    const fallback = db.firstOpenColumn(columns);
    setTasks((list) => list.map((task) => (known[task.status] ? task : { ...task, status: fallback })));
  }, [columns, tasks]);
  useEffect(() => db.write(db.KEYS.timer, { ...timer, savedAt: Date.now() }), [timer]);

  /* ---- sound and notifications ---------------------------------------- */

  const audioRef = useRef(null);

  const beep = useCallback(() => {
    if (!settings.sound) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioRef.current) audioRef.current = new Ctx();
      const ctx = audioRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 660;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (error) {
      console.warn("madpomo: could not play the end-of-session tone.", error);
    }
  }, [settings.sound]);

  const notify = useCallback(
    (title, body) => {
      if (!settings.desktopNotifications) return;
      try {
        if (!("Notification" in window) || Notification.permission !== "granted") return;
        new Notification(title, { body });
      } catch (error) {
        console.warn("madpomo: could not show a notification.", error);
      }
    },
    [settings.desktopNotifications]
  );

  /* ---- the session log ------------------------------------------------ */

  /* Writes one row and says whether it wrote. Called outside state updaters,
     because it touches localStorage and updaters have to stay pure. */
  const logSession = useCallback(
    (snapshot, completed) => {
      if (snapshot.sessionStartedAt === null) return false;

      const total = snapshot.sessionTotal === null ? 0 : snapshot.sessionTotal;
      const seconds = Math.max(0, total - Math.max(0, snapshot.timeLeft));
      if (seconds < 5) return false; // a misclick, not a session

      const task = tasks.find((t) => t.id === snapshot.taskId);
      const { list, added } = db.appendSession({
        id: Date.now(),
        taskId: snapshot.taskId,
        taskTitle: task ? task.title : "no task",
        startedAt: snapshot.sessionStartedAt,
        endedAt: Date.now(),
        seconds,
        completed,
        pauses: snapshot.sessionPauses
      });

      if (added) setSessions(list);
      return added;
    },
    [tasks]
  );

  const clearSession = (t) => ({ ...t, sessionStartedAt: null, sessionPauses: 0, sessionTotal: null });

  /* ---- the clock ------------------------------------------------------ */

  const lastTickRef = useRef(Date.now());

  useEffect(() => {
    if (!timer.isRunning) return undefined;

    lastTickRef.current = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      /* Measured against the wall clock, so a background tab does not drift.
         Whole seconds only, with the remainder carried instead of reset to
         `now`: flooring this at one second made a throttled tab race through
         its queued ticks a second at a time, and resetting dropped the
         leftover milliseconds on every tick. */
      const elapsed = Math.floor((now - lastTickRef.current) / 1000);
      if (elapsed < 1) return;
      lastTickRef.current += elapsed * 1000;
      setTimer((t) => (t.isRunning ? { ...t, timeLeft: t.timeLeft - elapsed } : t));
    }, 1000);

    return () => clearInterval(id);
  }, [timer.isRunning]);

  /* Phase over. Logs the pomodoro, then moves on after three seconds.

     The three-second wait is held in a ref and deliberately NOT cleared by
     this effect's cleanup. It used to be, and that cancelled the advance
     every time: the effect ends by setting isRunning false and timeLeft 0,
     which are its own two dependencies, so React ran the cleanup before the
     timeout could fire and the clock stayed on 00:00 for good. A ref also
     keeps it from running twice for one phase end. */
  const phaseOverRef = useRef(false);
  const advanceRef = useRef(null);

  useEffect(() => {
    if (!timer.isRunning || timer.timeLeft > 0) {
      phaseOverRef.current = false;
      return undefined;
    }

    if (phaseOverRef.current) return undefined;
    phaseOverRef.current = true;

    const wasFocus = timer.phase === "focus";
    let counted = false;

    if (wasFocus) {
      counted = logSession(timer, true);
      if (counted) {
        setTasks((list) =>
          list.map((task) => (task.id === timer.taskId ? { ...task, cyclesUsed: task.cyclesUsed + 1 } : task))
        );
      }
      notify("focus done", "pomodoro #" + timer.cycle + " finished. take a break.");
    } else {
      notify("break over", "back to it.");
    }

    beep();
    setTimer((t) => ({
      ...clearSession(t),
      timeLeft: 0,
      isRunning: false,
      completedPomodoros: t.completedPomodoros + (counted ? 1 : 0)
    }));

    // Three seconds on 00:00 so the end of a session is visible.
    clearTimeout(advanceRef.current);
    advanceRef.current = setTimeout(() => {
      setTimer((t) => {
        if (wasFocus) {
          return {
            ...clearSession(t),
            phase: "break",
            timeLeft: lengthFor("break", t.cycle, settings),
            isRunning: settings.autoStart
          };
        }

        // A long break closes the cycle: set up #1 but wait for a click.
        const closesCycle = t.cycle >= settings.cycleLength;
        const cycle = (t.cycle % settings.cycleLength) + 1;
        const next = {
          ...clearSession(t),
          phase: "focus",
          cycle,
          timeLeft: lengthFor("focus", cycle, settings),
          isRunning: settings.autoStart && !closesCycle
        };
        return next.isRunning ? openSession(next) : next;
      });
    }, 3000);

    return undefined;
  }, [timer.isRunning, timer.timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  /* The pending advance only has to be dropped if the app itself goes away. */
  useEffect(() => () => clearTimeout(advanceRef.current), []);

  /* A changed length applies at once when the clock is idle. */
  useEffect(() => {
    setTimer((t) => {
      const cycle = Math.min(t.cycle, settings.cycleLength);
      if (t.isRunning || t.sessionStartedAt !== null) return cycle === t.cycle ? t : { ...t, cycle };
      return { ...t, cycle, timeLeft: lengthFor(t.phase, cycle, settings) };
    });
  }, [settings.focusMinutes, settings.shortBreakMinutes, settings.longBreakMinutes, settings.cycleLength]);

  /* ---- controls ------------------------------------------------------- */

  const startOrPause = useCallback(() => {
    if (timer.phase === "break") {
      setTimer((t) => {
        const cycle = (t.cycle % settings.cycleLength) + 1;
        return openSession({
          ...clearSession(t),
          phase: "focus",
          cycle,
          timeLeft: lengthFor("focus", cycle, settings),
          isRunning: true
        });
      });
      return;
    }

    setTimer((t) =>
      t.isRunning
        ? { ...t, isRunning: false, sessionPauses: t.sessionPauses + 1 }
        : openSession({ ...t, isRunning: true })
    );
  }, [timer.phase, settings]);

  const takeBreak = useCallback(() => {
    if (timer.phase === "break") return;
    logSession(timer, false);
    setTimer((t) => ({
      ...clearSession(t),
      phase: "break",
      timeLeft: lengthFor("break", t.cycle, settings),
      isRunning: true
    }));
  }, [timer, settings, logSession]);

  const reset = useCallback(() => {
    logSession(timer, false);
    setTimer((t) => ({ ...clearSession(t), timeLeft: lengthFor(t.phase, t.cycle, settings), isRunning: false }));
  }, [timer, settings, logSession]);

  const focusTask = useCallback(
    (taskId) => {
      logSession(timer, false);
      setTimer((t) =>
        openSession({
          ...clearSession(t),
          taskId,
          phase: "focus",
          timeLeft: lengthFor("focus", t.cycle, settings),
          isRunning: true
        })
      );
    },
    [timer, settings, logSession]
  );

  /* The task being counted was finished or removed: the pomodoro was cut
     short, so it is logged as started but not finished. */
  const releaseTask = useCallback(
    (taskId) => {
      if (timer.taskId !== taskId) return;
      logSession(timer, false);
      setTimer((t) => ({ ...clearSession(t), taskId: null, isRunning: false }));
    },
    [timer, logSession]
  );

  /* ---- tasks ---------------------------------------------------------- */

  const addTask = useCallback((title, status) => {
    setTasks((list) =>
      list.concat(db.normalizeTask({ id: db.nextId(list), title, status, createdAt: Date.now() }))
    );
  }, []);

  const updateTask = useCallback((taskId, patch) => {
    setTasks((list) => list.map((task) => (task.id === taskId ? { ...task, ...patch } : task)));
  }, []);

  const removeTask = useCallback(
    (taskId) => {
      releaseTask(taskId);
      setTasks((list) => list.filter((task) => task.id !== taskId));
    },
    [releaseTask]
  );

  /* One door in, so the timestamps the report needs are always written. */
  const setTaskStatus = useCallback(
    (taskId, status, reason) => {
      if (status === "completed" || status === "cancelled") releaseTask(taskId);

      setTasks((list) =>
        list.map((task) => {
          if (task.id !== taskId) return task;
          if (status === "completed") return { ...task, status, completedAt: Date.now(), cancelledAt: null };
          if (status === "cancelled") {
            return {
              ...task,
              status,
              cancelledAt: Date.now(),
              completedAt: null,
              cancelReason: reason === undefined ? task.cancelReason : reason
            };
          }
          return { ...task, status, completedAt: null, cancelledAt: null, cancelReason: "" };
        })
      );
    },
    [releaseTask]
  );

  /* ---- columns --------------------------------------------------------
     A new column lands after the last open one, so completed and cancelled
     stay on the right where finish and cancel put things. Deleting one never
     deletes work: its tasks move back to the first open column.
     --------------------------------------------------------------------- */

  const addColumn = useCallback((name) => {
    const clean = String(name).trim();
    if (clean === "") return;

    setColumns((list) => {
      const openCount = list.filter((column) => column.kind === "open").length;
      const next = list.slice();
      next.splice(openCount, 0, {
        id: "col-" + Date.now().toString(36),
        name: clean,
        kind: "open",
        fixed: false
      });
      return next;
    });
  }, []);

  const removeColumn = useCallback((id) => {
    setColumns((list) => {
      const target = list.find((column) => column.id === id);
      if (!target || target.fixed) return list;

      const next = list.filter((column) => column.id !== id);
      const fallback = db.firstOpenColumn(next);

      setTasks((all) =>
        all.map((task) => (task.status === id ? { ...task, status: fallback } : task))
      );

      return next;
    });
  }, []);

  const value = {
    settings,
    setSettings,
    tasks,
    setTasks,
    sessions,
    setSessions,
    timer,
    startOrPause,
    takeBreak,
    reset,
    focusTask,
    releaseTask,
    addTask,
    updateTask,
    removeTask,
    setTaskStatus,
    columns,
    addColumn,
    removeColumn,
    phaseLength: (phase, cycle) => lengthFor(phase, cycle, settings)
  };

  return <MadpomoContext.Provider value={value}>{children}</MadpomoContext.Provider>;
}
