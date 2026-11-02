/* ==========================================================================
   madpomo — the guided tour (board page only)

   Two pieces:
     1. a first-run prompt that offers the tour or lets it be skipped
     2. the tour itself: a panel that walks through the app one step at a
        time and outlines the real element each step is about

   It never runs twice on its own. Once the prompt has been answered, the
   only ways back in are the button on the settings page (which sends you
   here with ?tour=1) and "show again" next to it.
   ========================================================================== */

(function () {
  const panel = document.getElementById("tour");
  const welcome = document.getElementById("welcome-dialog");
  if (!panel || !welcome) return;

  const titleEl = document.getElementById("tour-title");
  const bodyEl = document.getElementById("tour-body");
  const stepEl = document.getElementById("tour-step");
  const progressEl = document.getElementById("tour-progress");
  const backBtn = document.getElementById("tour-back");
  const nextBtn = document.getElementById("tour-next");
  const closeBtn = document.getElementById("tour-close");

  /* Opens the first card, for the steps that talk about what is inside one. */
  function expandFirstCard() {
    const card = document.querySelector(".task[data-id]");
    if (!card) return;
    const toggle = card.querySelector(".task__toggle");
    if (toggle && !toggle.checked) {
      toggle.checked = true;
      toggle.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  const steps = [
    {
      title: "welcome to madpomo",
      body: "This is two things in one: a board for what you have to do, and a pomodoro timer for actually doing it. The tour covers both, takes about two minutes, and you can leave at any point."
    },
    {
      title: "the board",
      body: "Four columns: to do, in progress, completed, cancelled. A task moves between them when you press a button on its card, or when you drag it there yourself. The number beside each column name counts what is in it right now.",
      target: ".board"
    },
    {
      title: "adding a task",
      body: "The + button on a column adds a task straight into it. Type a title and press Enter to keep it, Escape to throw it away. To do and in progress can both take new tasks.",
      target: "#add-todo-btn"
    },
    {
      title: "opening a card",
      body: "Click a card's title bar to open it, and the _ button to close it again. Open or closed is remembered per card, so the board looks the way you left it when you come back.",
      target: ".task[data-id]",
      before: expandFirstCard
    },
    {
      title: "everything is editable",
      body: "Click the due date to pick one, the description to rewrite it, the title to rename it. Every edit saves when you click away or press Escape. There is no save button anywhere in this app.",
      target: ".task__due",
      before: expandFirstCard
    },
    {
      title: "subtasks",
      body: "Break a task into steps. Click the box to tick one off, the text to rename it, the x to delete it. Subtasks are a checklist for you — they do not affect the timer or any of the numbers.",
      target: ".checklist",
      before: expandFirstCard
    },
    {
      title: "focus starts the clock",
      body: "Focus is the button that begins a pomodoro for that task. It moves the task to in progress, names it as the current task in the sidebar, and starts a 25-minute countdown.",
      target: '.task__footer [data-action="focus"]',
      before: expandFirstCard
    },
    {
      title: "the timer",
      body: "Start pauses and resumes the countdown. Break ends the pomodoro early and begins a short break. Reset puts the clock back to the start of whatever phase you are in. The clock keeps running while you move between pages.",
      target: ".timer"
    },
    {
      title: "cycles of four",
      body: "Pomodoros come in cycles. #1 of 4 is the one you are attempting now. After the fourth, the break is a long one — fifteen minutes instead of five — and then the count starts again.",
      target: "#phase-label"
    },
    {
      title: "what counts as finished",
      body: "A pomodoro only counts when the clock reaches 00:00. Take a break early, hit reset, or finish the task halfway through and it is logged as started but not finished. The share you do finish is your follow-through, and it is the number the whole report is built around.",
      target: "#clock"
    },
    {
      title: "finishing and cancelling",
      body: "Finish moves a task to completed. Cancel asks why first and keeps your reason on the card, so abandoned work stays visible instead of quietly disappearing. Only a card already in the cancelled column can be deleted for good.",
      target: ".task__footer",
      before: expandFirstCard
    },
    {
      title: "dragging",
      body: "Drag a card anywhere — into another column, or up and down inside the one it is in. A grey slot shows where it will land, and the order you leave it in is the order it keeps.",
      target: ".board"
    },
    {
      title: "search",
      body: "Search filters cards by title, description and subtask text as you type. Press / anywhere on the board to jump into it, and the column counts follow the filter.",
      target: ".search"
    },
    {
      title: "the sidebar numbers",
      body: "Task overview counts tasks you have completed today, this week and this month, plus everything you have cancelled. Last 7D counts pomodoros instead — one square per finished pomodoro, with today's row marked in orange.",
      target: ".sidebar .history"
    },
    {
      title: "the report",
      body: "The report turns that log into something readable: follow-through, pauses per pomodoro, total focus time, a row per task, and a four-week trend. Switch between the last 7 days, 30 days, or everything.",
      target: ".history__report"
    },
    {
      title: "settings",
      body: "Settings holds the timer lengths, cycle length, auto-start, the end-of-session sound, desktop notifications, a full JSON export of your data — and this tutorial, if you ever want it again.",
      target: ".header__nav"
    },
    {
      title: "your data stays here",
      body: "There is no account and no server. Everything you type lives in this browser only, which also means clearing your browser data clears madpomo. The export button in settings is your backup. That is the whole app — go start a pomodoro."
    }
  ];

  let index = 0;
  let highlighted = null;

  function clearHighlight() {
    if (highlighted) highlighted.classList.remove("tour-highlight");
    highlighted = null;
  }

  /* --------------------------------------------------------------------------
     The dim. One fixed overlay with a rectangular hole cut out of it over the
     element the current step is about. The hole follows the element while the
     page scrolls, so it is repainted every frame rather than wired to events.
     -------------------------------------------------------------------------- */

  const mask = document.getElementById("tour-mask");
  const HOLE_PADDING = 6;
  let frameId = null;
  let lastHole = "";

  function paintMask() {
    if (!highlighted) {
      if (lastHole !== "none") {
        mask.style.clipPath = "none";
        lastHole = "none";
      }
      return;
    }

    const box = highlighted.getBoundingClientRect();
    const left = Math.max(0, box.left - HOLE_PADDING);
    const top = Math.max(0, box.top - HOLE_PADDING);
    const right = Math.min(window.innerWidth, box.right + HOLE_PADDING);
    const bottom = Math.min(window.innerHeight, box.bottom + HOLE_PADDING);

    const key = [left, top, right, bottom].join();
    if (key === lastHole) return;
    lastHole = key;

    // Outer rectangle, then back in along a seam to cut the inner one out.
    mask.style.clipPath =
      "polygon(0 0, 0 100%, " + left + "px 100%, " +
      left + "px " + top + "px, " + right + "px " + top + "px, " +
      right + "px " + bottom + "px, " + left + "px " + bottom + "px, " +
      left + "px 100%, 100% 100%, 100% 0)";
  }

  function watchMask() {
    paintMask();
    frameId = window.requestAnimationFrame(watchMask);
  }

  function stopMask() {
    if (frameId !== null) window.cancelAnimationFrame(frameId);
    frameId = null;
    mask.hidden = true;
    mask.style.clipPath = "none";
    lastHole = "";
  }

  function show(i) {
    index = Math.min(Math.max(i, 0), steps.length - 1);
    const step = steps[index];

    clearHighlight();
    lastHole = "";
    if (step.before) step.before();

    titleEl.textContent = step.title;
    bodyEl.textContent = step.body;
    stepEl.textContent = "step " + (index + 1) + " of " + steps.length;
    progressEl.style.width = Math.round(((index + 1) / steps.length) * 100) + "%";

    backBtn.disabled = index === 0;
    nextBtn.textContent = index === steps.length - 1 ? "done" : "next";

    if (step.target) {
      const el = document.querySelector(step.target);
      if (el) {
        el.classList.add("tour-highlight");
        highlighted = el;
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }
  }

  function start() {
    panel.hidden = false;
    mask.hidden = false;
    show(0);
    if (frameId === null) watchMask();
    nextBtn.focus();
  }

  /* The prompt is answered the moment it closes, however it closed, so the
     flag is written there and not only when the tour reaches the last step.
     It merges over what is already stored, so a write that only has an
     opinion about one field leaves the rest of the record alone. */
  function remember(extra) {
    const stored = MP.read(MP.KEYS.tutorial, null) || {};
    MP.write(
      MP.KEYS.tutorial,
      Object.assign({ seen: true, completed: false }, stored, extra || {}, { at: Date.now() })
    );
  }

  function finish(completed) {
    clearHighlight();
    stopMask();
    panel.hidden = true;
    remember({ completed: completed });

    // Drop ?tour=1 so a reload does not start the tour over again.
    if (window.location.search.indexOf("tour=1") !== -1) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }

  nextBtn.addEventListener("click", function () {
    if (index === steps.length - 1) finish(true);
    else show(index + 1);
  });

  backBtn.addEventListener("click", function () {
    show(index - 1);
  });

  closeBtn.addEventListener("click", function () {
    finish(false);
  });

  document.addEventListener("keydown", function (event) {
    if (panel.hidden) return;
    if (event.key === "Escape") finish(false);
    if (event.key === "ArrowRight" && index < steps.length - 1) show(index + 1);
    if (event.key === "ArrowLeft") show(index - 1);
  });

  /* ---- first run ---- */

  /* Fires for both buttons, for Escape, and for any other way the dialog
     closes — so the prompt is never asked twice once it has been seen. */
  welcome.addEventListener("close", function () {
    remember();
  });

  document.getElementById("welcome-start").addEventListener("click", function () {
    welcome.close();
    start();
  });

  document.getElementById("welcome-skip").addEventListener("click", function () {
    welcome.close();
    finish(false);
  });

  const record = MP.read(MP.KEYS.tutorial, null);
  const asked = record !== null && record.seen === true;

  if (window.location.search.indexOf("tour=1") !== -1) {
    start();
  } else if (!asked) {
    welcome.showModal();
    /* showModal() focuses the first button on its own, which paints a focus
       ring on "skip for now" before anyone has touched the keyboard. Focus
       belongs in the dialog either way, so it goes on the dialog itself. */
    welcome.focus();
  }
})();
