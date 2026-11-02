/* ==========================================================================
   madpomo — the pomodoro timer

   The timer lives in the sidebar, and the sidebar is on every page, so this
   file runs everywhere. Its whole state is in localStorage under
   madpomo.timer, and a running clock is caught up from `savedAt` on load —
   that is what lets the countdown survive navigating to the report and back.

   Two counters on purpose:
     currentCycle       the pomodoro being attempted right now (1..cycleLength)
     completedPomodoros how many reached 00:00, ever
   They are allowed to disagree. That is what makes "abandon a focus session,
   take a break, resume" move on to the next pomodoro instead of repeating it.
   ========================================================================== */

window.MP = window.MP || {};

MP.timer = (function () {
  const clock = document.getElementById("clock");
  const startBtn = document.getElementById("start-btn");
  const breakBtn = document.getElementById("break-btn");
  const resetBtn = document.getElementById("reset-btn");
  const phaseLabel = document.getElementById("phase-label");
  const currentTaskLabel = document.getElementById("current-task-label");

  // A page without the timer markup (or a half-wired one) must not throw.
  if (!clock || !startBtn || !breakBtn || !resetBtn || !phaseLabel || !currentTaskLabel) {
    return null;
  }

  const baseTitle = document.title;
  let intervalId = null;
  let lastTickAt = Date.now();
  let audioContext = null;

  function defaultState() {
    return {
      currentPhase: "focus",
      currentCycle: 1,
      completedPomodoros: 0,
      currentTaskId: null,
      timeLeft: null,
      isRunning: false,
      savedAt: null,
      sessionStartedAt: null,
      sessionPauses: 0,
      sessionTotal: null
    };
  }

  const state = Object.assign(defaultState(), MP.read(MP.KEYS.timer, {}));

  /* ---- helpers ---------------------------------------------------------- */

  function isLongBreakDue() {
    return state.currentCycle >= MP.settings.cycleLength;
  }

  function phaseLength(phase) {
    if (phase === "focus") return MP.settings.focusMinutes * 60;
    if (isLongBreakDue()) return MP.settings.longBreakMinutes * 60;
    return MP.settings.shortBreakMinutes * 60;
  }

  function findTask(id) {
    if (id === null) return null;
    return MP.tasks.find(function (task) {
      return task.id === id;
    }) || null;
  }

  function save() {
    state.savedAt = Date.now();
    MP.write(MP.KEYS.timer, state);
  }

  /* ---- feedback: beep + desktop notification ---------------------------- */

  function beep() {
    if (!MP.settings.sound) return;

    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (audioContext === null) audioContext = new Ctx();

      // A browser suspends audio created without a click behind it.
      if (audioContext.state === "suspended") audioContext.resume();

      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "square";
      oscillator.frequency.value = 660;
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.45);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn("madpomo: could not play the end-of-session tone.", error);
    }
  }

  function notify(title, body) {
    if (!MP.settings.desktopNotifications) return;

    try {
      if (!("Notification" in window)) return;
      if (Notification.permission !== "granted") return;
      new Notification(title, { body: body });
    } catch (error) {
      console.warn("madpomo: could not show a notification.", error);
    }
  }

  /* ---- the focus-session log -------------------------------------------- */

  function openSession() {
    if (state.currentPhase !== "focus") return;
    if (state.sessionStartedAt !== null) return;
    state.sessionStartedAt = Date.now();
    state.sessionPauses = 0;
    state.sessionTotal = state.timeLeft;
  }

  /* Writes one row to madpomo.sessions and says whether it wrote one.
     `completed` is true only when the clock reached 00:00; anything else
     counts as started-but-not-finished. */
  function closeSession(completed) {
    if (state.sessionStartedAt === null) return false;

    const total = state.sessionTotal === null ? 0 : state.sessionTotal;
    const seconds = Math.max(0, total - Math.max(0, state.timeLeft));
    const task = findTask(state.currentTaskId);
    const startedAt = state.sessionStartedAt;

    state.sessionStartedAt = null;
    const pauses = state.sessionPauses;
    state.sessionPauses = 0;
    state.sessionTotal = null;

    // Under 5 seconds is a misclick, not a session.
    if (seconds < 5) return false;

    /* Another tab with the board open runs its own copy of this clock and
       reaches 00:00 too. Both would log the same session, so whoever gets
       here second backs off. */
    const already = MP.loadSessions().some(function (logged) {
      return logged.startedAt === startedAt && logged.taskId === state.currentTaskId;
    });
    if (already) return false;

    MP.logSession({
      id: Date.now(),
      taskId: state.currentTaskId,
      taskTitle: task ? task.title : "no task",
      startedAt: startedAt,
      endedAt: Date.now(),
      seconds: seconds,
      completed: completed,
      pauses: pauses
    });

    return true;
  }

  /* ---- render ----------------------------------------------------------- */

  function render() {
    clock.textContent = MP.formatClock(state.timeLeft);

    if (state.currentPhase === "focus") {
      phaseLabel.textContent = "//focus | #" + state.currentCycle + " of " + MP.settings.cycleLength;
    } else {
      phaseLabel.textContent = isLongBreakDue() ? "//long break" : "//break";
    }

    startBtn.textContent = state.currentPhase === "break"
      ? "resume"
      : (state.isRunning ? "pause" : "start");

    breakBtn.disabled = state.currentPhase === "break";

    const task = findTask(state.currentTaskId);
    currentTaskLabel.textContent = "current task: " + (task ? task.title : "none");

    document.title = state.isRunning
      ? MP.formatClock(state.timeLeft) + " " + baseTitle
      : baseTitle;
  }

  /* ---- running ---------------------------------------------------------- */

  function stopClock() {
    if (intervalId !== null) clearInterval(intervalId);
    intervalId = null;
    state.isRunning = false;
  }

  function startClock() {
    stopClock();
    openSession();
    state.isRunning = true;
    lastTickAt = Date.now();
    intervalId = setInterval(tick, 1000);
    save();
    render();
  }

  /* Measured against the wall clock, not counted in ticks: a background tab
     gets throttled, and a tick-counting timer would drift behind. */
  function tick() {
    const now = Date.now();
    const elapsed = Math.max(1, Math.round((now - lastTickAt) / 1000));
    lastTickAt = now;
    state.timeLeft = state.timeLeft - elapsed;

    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      phaseFinished();
      return;
    }

    render();
    save();
  }

  function preparePhase(phase, autorun) {
    state.currentPhase = phase;
    state.timeLeft = phaseLength(phase);
    stopClock();

    if (autorun) {
      startClock();
    } else {
      save();
      render();
    }
  }

  function startNextPomodoro(autorun) {
    state.currentCycle = (state.currentCycle % MP.settings.cycleLength) + 1;
    preparePhase("focus", autorun);
  }

  function phaseFinished() {
    stopClock();
    const wasFocus = state.currentPhase === "focus";

    if (wasFocus) {
      /* Only count the pomodoro if this tab is the one that logged it —
         otherwise a second tab would bump the task's counter again. */
      if (closeSession(true)) {
        state.completedPomodoros = state.completedPomodoros + 1;

        const task = findTask(state.currentTaskId);
        if (task) {
          task.cyclesUsed = task.cyclesUsed + 1;
          MP.saveTasks();
        }
      }

      notify("focus done", "pomodoro #" + state.currentCycle + " finished. take a break.");
    } else {
      notify("break over", "back to it.");
    }

    beep();
    save();
    render();
    MP.dataChanged();

    // Three seconds on 00:00 so the end of a session is visible, then move on.
    setTimeout(function () {
      if (wasFocus) {
        preparePhase("break", MP.settings.autoStart);
        render();
        return;
      }

      // A long break closes the cycle: set up pomodoro #1 but wait for a click.
      const closesCycle = isLongBreakDue();
      startNextPomodoro(MP.settings.autoStart && !closesCycle);
      render();
    }, 3000);
  }

  /* ---- controls --------------------------------------------------------- */

  startBtn.addEventListener("click", function () {
    if (state.currentPhase === "break") {
      startNextPomodoro(true);
      return;
    }

    if (state.isRunning) {
      state.sessionPauses = state.sessionPauses + 1;
      stopClock();
      save();
      render();
      return;
    }

    startClock();
  });

  breakBtn.addEventListener("click", function () {
    if (state.currentPhase === "break") return;
    closeSession(false);
    preparePhase("break", true);
    MP.dataChanged();
  });

  resetBtn.addEventListener("click", function () {
    closeSession(false);
    stopClock();
    state.timeLeft = phaseLength(state.currentPhase);
    save();
    render();
    MP.dataChanged();
  });

  /* ---- start-up: catch up a clock left running elsewhere ---------------- */

  if (typeof state.timeLeft !== "number" || state.timeLeft === null) {
    state.timeLeft = phaseLength(state.currentPhase);
  }

  if (state.isRunning && state.savedAt) {
    const away = Math.floor((Date.now() - state.savedAt) / 1000);
    state.timeLeft = state.timeLeft - Math.max(0, away);
  }

  render();

  if (state.isRunning) {
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      phaseFinished();
    } else {
      startClock();
    }
  } else {
    save();
  }

  /* ---- what the other pages are allowed to do --------------------------- */

  return {
    /* The board's "focus" button: adopt a task and start its pomodoro. */
    focusTask: function (taskId) {
      closeSession(false);
      state.currentTaskId = taskId;
      preparePhase("focus", true);
      render();
      MP.dataChanged();
    },

    /* The board's "finish" button on the task being focused: the pomodoro is
       cut short, so it is logged as not followed through. */
    taskFinished: function (taskId) {
      if (state.currentTaskId !== taskId) return;
      closeSession(false);
      stopClock();
      state.currentTaskId = null;
      state.timeLeft = phaseLength(state.currentPhase);
      save();
      render();
    },

    /* A cancelled or deleted task cannot stay the current one. */
    taskRemoved: function (taskId) {
      if (state.currentTaskId !== taskId) return;
      closeSession(false);
      state.currentTaskId = null;
      save();
      render();
    },

    currentTaskId: function () {
      return state.currentTaskId;
    },

    /* Settings changed a length: re-measure the phase if the clock is idle. */
    settingsChanged: function () {
      if (state.currentCycle > MP.settings.cycleLength) state.currentCycle = MP.settings.cycleLength;
      if (!state.isRunning && state.sessionStartedAt === null) {
        state.timeLeft = phaseLength(state.currentPhase);
      }
      save();
      render();
    },

    render: render
  };
})();
