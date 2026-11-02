/* ==========================================================================
   madpomo (React) — the guided tour

   Same 17 steps as the plain-JS build, same dimming spotlight. Two
   differences, both because this is one app now:

   1. It only mounts on the board, so the steps always have something to
      point at.
   2. Opening it from settings is a route change (#/board?tour=1) instead of
      a page load.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from "react";
import { useMadpomo } from "../store.jsx";
import { navigate } from "../hooks/useHashRoute.js";
import * as db from "../lib/storage.js";

const HOLE_PADDING = 6;

const STEPS = [
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
    target: '.column[data-status="todo"] [aria-label="add task"]'
  },
  {
    title: "opening a card",
    body: "Click a card's title bar to open it, and the _ button to close it again. Open or closed is remembered per card, so the board looks the way you left it when you come back.",
    target: ".task[data-id]",
    expand: true
  },
  {
    title: "everything is editable",
    body: "Click the due date to pick one, the description to rewrite it, the title to rename it. Every edit saves when you click away or press Escape. There is no save button anywhere in this app.",
    target: ".task__due",
    expand: true
  },
  {
    title: "subtasks",
    body: "Break a task into steps. Click the box to tick one off, the text to rename it, the x to delete it. Subtasks are a checklist for you — they do not affect the timer or any of the numbers.",
    target: ".checklist",
    expand: true
  },
  {
    title: "focus starts the clock",
    body: "Focus is the button that begins a pomodoro for that task. It moves the task to in progress, names it as the current task in the sidebar, and starts a 25-minute countdown.",
    target: ".task__footer .btn--primary",
    expand: true
  },
  {
    title: "the timer",
    body: "Start pauses and resumes the countdown. Break ends the pomodoro early and begins a short break. Reset puts the clock back to the start of whatever phase you are in. The clock keeps running while you move between views.",
    target: ".timer"
  },
  {
    title: "cycles of four",
    body: "Pomodoros come in cycles. #1 of 4 is the one you are attempting now. After the fourth, the break is a long one — fifteen minutes instead of five — and then the count starts again.",
    target: ".timer .sidebar__title"
  },
  {
    title: "what counts as finished",
    body: "A pomodoro only counts when the clock reaches 00:00. Take a break early, hit reset, or finish the task halfway through and it is logged as started but not finished. The share you do finish is your follow-through, and it is the number the whole report is built around.",
    target: ".timer__clock"
  },
  {
    title: "finishing and cancelling",
    body: "Finish moves a task to completed. Cancel asks why first and keeps your reason on the card, so abandoned work stays visible instead of quietly disappearing. Only a card already in the cancelled column can be deleted for good.",
    target: ".task__footer",
    expand: true
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
    body: "The report turns that log into something readable: follow-through, pauses per pomodoro, total focus time, a row per task, and a four-week trend. It opens in place — the clock keeps running while you read it.",
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

export default function Tour({ params }) {
  const { tasks, updateTask } = useMadpomo();

  const [running, setRunning] = useState(false);
  const [index, setIndex] = useState(0);
  const [asking, setAsking] = useState(false);

  const welcomeRef = useRef(null);
  const maskRef = useRef(null);
  const highlightRef = useRef(null);
  const frameRef = useRef(null);
  const lastHoleRef = useRef("");
  const handledRef = useRef(false);

  const step = STEPS[index];

  /* Functional updates, so two quick clicks move two steps: reading `index`
     from the closure would make both of them compute the same next value. */
  const goNext = useCallback(() => setIndex((i) => Math.min(i + 1, STEPS.length - 1)), []);
  const goBack = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  /* ---- the dim ---------------------------------------------------------
     One overlay with a rectangular hole cut out over the element the step
     is about, repainted every frame so it follows the page as it scrolls.
     --------------------------------------------------------------------- */

  const paintMask = useCallback(() => {
    const mask = maskRef.current;
    if (!mask) return;

    const element = highlightRef.current;
    if (!element) {
      if (lastHoleRef.current !== "none") {
        mask.style.clipPath = "none";
        lastHoleRef.current = "none";
      }
      return;
    }

    const box = element.getBoundingClientRect();
    const left = Math.max(0, box.left - HOLE_PADDING);
    const top = Math.max(0, box.top - HOLE_PADDING);
    const right = Math.min(window.innerWidth, box.right + HOLE_PADDING);
    const bottom = Math.min(window.innerHeight, box.bottom + HOLE_PADDING);

    const key = [left, top, right, bottom].join();
    if (key === lastHoleRef.current) return;
    lastHoleRef.current = key;

    mask.style.clipPath =
      "polygon(0 0, 0 100%, " + left + "px 100%, " +
      left + "px " + top + "px, " + right + "px " + top + "px, " +
      right + "px " + bottom + "px, " + left + "px " + bottom + "px, " +
      left + "px 100%, 100% 100%, 100% 0)";
  }, []);

  useEffect(() => {
    if (!running) return undefined;

    function loop() {
      paintMask();
      frameRef.current = window.requestAnimationFrame(loop);
    }

    loop();
    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [running, paintMask]);

  /* ---- highlighting ----------------------------------------------------
     The class goes on a real DOM node, so it is cleaned off by hand rather
     than rendered: React does not own the board's markup from in here.
     --------------------------------------------------------------------- */

  function clearHighlight() {
    if (highlightRef.current) highlightRef.current.classList.remove("tour-highlight");
    highlightRef.current = null;
  }

  useEffect(() => {
    if (!running) return undefined;

    clearHighlight();
    lastHoleRef.current = "";

    if (!step.target) return undefined;

    /* The card has to be open before the steps about its insides can point
       at anything, and opening it is a state change, so the element only
       exists on the next frame. */
    const id = window.requestAnimationFrame(() => {
      const element = document.querySelector(step.target);
      if (!element) return;
      element.classList.add("tour-highlight");
      highlightRef.current = element;
      element.scrollIntoView({ block: "center", behavior: "smooth" });
    });

    return () => window.cancelAnimationFrame(id);
  }, [running, index, step, tasks]);

  /* Opening the first card for the steps that describe one. */
  useEffect(() => {
    if (!running || !step.expand) return;
    const first = tasks.find((task) => task.status !== "cancelled") || tasks[0];
    if (first && !first.expanded) updateTask(first.id, { expanded: true });
  }, [running, index, step, tasks, updateTask]);

  /* ---- starting and stopping ------------------------------------------ */

  const start = useCallback(() => {
    setIndex(0);
    setRunning(true);
  }, []);

  /* The prompt counts as answered the moment it closes, however it closed,
     so the flag is written there rather than only at the last step. It
     merges over what is stored, so a write with an opinion about one field
     leaves the rest of the record alone. */
  const remember = useCallback((extra) => {
    const stored = db.read(db.KEYS.tutorial, null) || {};
    db.write(db.KEYS.tutorial, { seen: true, completed: false, ...stored, ...extra, at: Date.now() });
  }, []);

  const finish = useCallback(
    (completed) => {
      clearHighlight();
      setRunning(false);
      lastHoleRef.current = "";
      remember({ completed });
      if (window.location.hash.includes("tour=1")) navigate("board");
    },
    [remember]
  );

  /* First visit asks; ?tour=1 from the settings page starts straight away. */
  useEffect(() => {
    if (handledRef.current) return;

    const wanted = params && params.get("tour") === "1";
    const record = db.read(db.KEYS.tutorial, null);

    if (wanted) {
      handledRef.current = true;
      start();
    } else if (!record || record.seen !== true) {
      handledRef.current = true;
      setAsking(true);
    }
  }, [params, start]);

  useEffect(() => {
    const dialog = welcomeRef.current;
    if (!dialog) return;
    if (asking && !dialog.open) {
      dialog.showModal();
      /* showModal() focuses the first button, which paints a focus ring on
         "skip for now" before the keyboard has been touched. Focus belongs
         in the dialog either way, so it goes on the dialog itself. */
      dialog.focus();
    }
    if (!asking && dialog.open) dialog.close();
  }, [asking]);

  /* ---- keyboard -------------------------------------------------------- */

  useEffect(() => {
    if (!running) return undefined;

    function onKey(event) {
      if (event.key === "Escape") finish(false);
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goBack();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, finish, goNext, goBack]);

  useEffect(() => clearHighlight, []);

  return (
    <>
      <dialog
        className="dialog"
        tabIndex={-1}
        ref={welcomeRef}
        onClose={() => {
          setAsking(false);
          remember();
        }}
      >
        <h2 className="dialog__title">//welcome</h2>
        <p className="dialog__task">first time here?</p>
        <p className="dialog__text">
          madpomo is a task board with a pomodoro timer built into it. it counts how many pomodoros you
          finish, not how many you start. the tour walks through the board, the timer and the report in
          about two minutes.
        </p>
        <p className="dialog__hint">skipping is fine. the tutorial is always in settings, under //help.</p>
        <div className="dialog__actions">
          <button
            type="button"
            className="btn"
            onClick={() => {
              setAsking(false);
              finish(false);
            }}
          >
            skip for now
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              setAsking(false);
              start();
            }}
          >
            show me around
          </button>
        </div>
      </dialog>

      {running ? (
        <>
          <div className="tour-mask" ref={maskRef} aria-hidden="true" />

          <section className="tour" aria-label="tutorial">
            <div className="tour__head">
              <p className="tour__step">step {index + 1} of {STEPS.length}</p>
              <button
                type="button"
                className="btn btn--icon"
                aria-label="close the tutorial"
                onClick={() => finish(false)}
              >
                x
              </button>
            </div>

            <h2 className="tour__title">{step.title}</h2>
            <p className="tour__body">{step.body}</p>

            <div className="tour__progress">
              <div
                className="tour__progress-value"
                style={{ width: Math.round(((index + 1) / STEPS.length) * 100) + "%" }}
              />
            </div>

            <div className="tour__actions">
              <button type="button" className="btn" disabled={index === 0} onClick={goBack}>
                back
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => (index === STEPS.length - 1 ? finish(true) : goNext())}
              >
                {index === STEPS.length - 1 ? "done" : "next"}
              </button>
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}
