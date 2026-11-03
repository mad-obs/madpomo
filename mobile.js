/* ==========================================================================
   madpomo — the mobile shell

   Everything the phone layout needs that CSS cannot do on its own. It runs on
   every page and does nothing at all above 720px.

     1. the bottom sheet   — open, close, drag down to dismiss, focus
     2. the timer bar      — mirrors the sidebar clock, proxies its buttons
     3. the column pager   — chips built from whatever columns the board has
     4. the service worker — registered so the app opens offline

   It deliberately knows nothing about the timer. The sidebar is the timer's
   only view; this file watches that view and copies what it says into the
   bar, and the bar's button clicks the sidebar's button. So changing a phase
   name or adding a state in timer.js needs no change here, and there is no
   second copy of the timer's state to drift out of step.
   ========================================================================== */

(function () {
  const PHONE = "(max-width: 720px)";
  const phone = window.matchMedia(PHONE);

  /* --------------------------------------------------------------------------
     1. The bottom sheet — the sidebar, brought up from the bottom edge
     -------------------------------------------------------------------------- */

  const sidebar = document.querySelector(".sidebar");
  const scrim = document.getElementById("sheet-scrim");
  const openBtn = document.getElementById("nowbar-open");
  const closeBtn = document.getElementById("sheet-close");
  const sheetHead = document.querySelector(".sheet__head");

  /* What had focus before the sheet took it, so Esc or x can hand it back
     instead of dropping the keyboard user at the top of the page. */
  let lastFocused = null;

  function sheetIsOpen() {
    return document.body.classList.contains("sheet-open");
  }

  function openSheet() {
    if (!sidebar) return;
    lastFocused = document.activeElement;
    document.body.classList.add("sheet-open");
    if (scrim) scrim.hidden = false;
    if (openBtn) openBtn.setAttribute("aria-expanded", "true");
    if (closeBtn) closeBtn.focus();
  }

  function closeSheet() {
    if (!sidebar) return;
    document.body.classList.remove("sheet-open");
    sidebar.style.transform = "";
    if (scrim) scrim.hidden = true;
    if (openBtn) openBtn.setAttribute("aria-expanded", "false");
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    lastFocused = null;
  }

  if (openBtn) {
    openBtn.addEventListener("click", function () {
      if (sheetIsOpen()) closeSheet();
      else openSheet();
    });
  }

  if (closeBtn) closeBtn.addEventListener("click", closeSheet);
  if (scrim) scrim.addEventListener("click", closeSheet);

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && sheetIsOpen()) closeSheet();
  });

  /* Back above 720px the sidebar is a column of the grid again, so a sheet
     left open would be a stray class on the body. */
  phone.addEventListener("change", function (event) {
    if (!event.matches && sheetIsOpen()) closeSheet();
  });

  /* Drag the head down to dismiss. The sheet follows the finger one-to-one
     while it is moving — a sheet that waits for the gesture to finish before
     it reacts is the clearest sign a panel is not really a sheet. Past a
     third of its own height, or on a fast flick, it goes.

     The head is the only part with `touch-action: none` (mobile.css), so the
     rest of the sheet still scrolls normally and this never fights it. */
  if (sheetHead && sidebar) {
    let startY = 0;
    let startAt = 0;
    let delta = 0;
    let dragging = false;

    sheetHead.addEventListener("pointerdown", function (event) {
      if (!phone.matches || !sheetIsOpen()) return;

      /* The x button lives in this strip. Capturing the pointer for a drag
         would redirect the click that follows to the strip instead of the
         button, so the one control in here never starts one. */
      if (event.target.closest("button")) return;

      dragging = true;
      startY = event.clientY;
      startAt = Date.now();
      delta = 0;
      sidebar.style.transition = "none";
      sheetHead.setPointerCapture(event.pointerId);
    });

    sheetHead.addEventListener("pointermove", function (event) {
      if (!dragging) return;
      // upward drags do nothing: the sheet is already as far up as it goes
      delta = Math.max(0, event.clientY - startY);
      sidebar.style.transform = "translateY(" + delta + "px)";
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      sidebar.style.transition = "";

      const far = delta > sidebar.offsetHeight / 3;
      const flick = delta > 40 && Date.now() - startAt < 250;

      if (far || flick) closeSheet();
      else sidebar.style.transform = "";
    }

    sheetHead.addEventListener("pointerup", endDrag);
    sheetHead.addEventListener("pointercancel", endDrag);
  }

  /* --------------------------------------------------------------------------
     2. The timer bar — a mini player for the pomodoro
     -------------------------------------------------------------------------- */

  const nowbar = document.getElementById("nowbar");
  const clock = document.getElementById("clock");
  const phaseLabel = document.getElementById("phase-label");
  const taskLabel = document.getElementById("current-task-label");
  const startBtn = document.getElementById("start-btn");

  if (nowbar && clock && startBtn) {
    const barClock = document.getElementById("nowbar-clock");
    const barPhase = document.getElementById("nowbar-phase");
    const barTask = document.getElementById("nowbar-task");
    const barAction = document.getElementById("nowbar-start");

    /* "current task: none" in English, "tarefa atual: nenhuma" in Portuguese.
       Cutting at the first colon drops the label in either language without
       this file needing to know a single word of it. */
    function withoutLabel(text) {
      return text.replace(/^[^:]*:\s*/, "");
    }

    function syncBar() {
      barClock.textContent = clock.textContent;
      barPhase.textContent = phaseLabel ? phaseLabel.textContent : "";
      barTask.textContent = taskLabel ? withoutLabel(taskLabel.textContent) : "";
      barAction.textContent = startBtn.textContent;
      /* The sidebar's button reads "pause" only while the clock is running,
         which makes it the honest signal for the accent. */
      nowbar.classList.toggle("nowbar--running", startBtn.textContent === "pause");
    }

    /* The timer renders into the sidebar once a second. Watching those nodes
       is cheaper than a second interval and can never disagree with them. */
    const observer = new MutationObserver(syncBar);
    const watch = { childList: true, characterData: true, subtree: true };

    observer.observe(clock, watch);
    observer.observe(startBtn, watch);
    if (phaseLabel) observer.observe(phaseLabel, watch);
    if (taskLabel) observer.observe(taskLabel, watch);

    barAction.addEventListener("click", function () {
      startBtn.click();
    });

    syncBar();
  }

  /* --------------------------------------------------------------------------
     3. The column pager — one chip per column

     A phone shows one full-width column, so the other five are off-screen.
     The chips are built from the board rather than from MP.columns, because
     the board is what is actually on screen: a search that empties a column
     still shows (0) on its chip, and a column the user adds appears without
     this file subscribing to anything.
     -------------------------------------------------------------------------- */

  const pager = document.getElementById("pager");
  const board = document.getElementById("board");

  if (pager && board) {
    let signature = "";

    function columnEls() {
      return Array.prototype.slice.call(board.querySelectorAll(".column"));
    }

    /* The column head is `name <span class="column__count">(3)</span>`, so
       the name is the text before the count. */
    function columnName(column) {
      const title = column.querySelector(".column__title");
      if (!title) return "";
      const first = title.firstChild;
      return first ? first.textContent.trim() : title.textContent.trim();
    }

    function columnCount(column) {
      const count = column.querySelector(".column__count");
      return count ? count.textContent.trim() : "";
    }

    function boardSignature() {
      return columnEls().map(function (column) {
        return column.dataset.status + columnCount(column);
      }).join("|");
    }

    function markCurrent() {
      const width = board.clientWidth;
      if (width === 0) return;

      const index = Math.round(board.scrollLeft / width);
      const chips = pager.querySelectorAll(".pager__chip");

      for (let i = 0; i < chips.length; i = i + 1) {
        if (i === index) chips[i].setAttribute("aria-current", "true");
        else chips[i].removeAttribute("aria-current");
      }
    }

    function buildPager() {
      signature = boardSignature();

      pager.innerHTML = columnEls().map(function (column, index) {
        return (
          '<button type="button" class="pager__chip" data-index="' + index +
          '" data-status="' + column.dataset.status + '">' +
            columnName(column) +
            ' <span class="pager__count">' + columnCount(column) + "</span>" +
          "</button>"
        );
      }).join("");

      markCurrent();
    }

    pager.addEventListener("click", function (event) {
      const chip = event.target.closest(".pager__chip");
      if (!chip) return;
      board.scrollTo({
        left: Number(chip.dataset.index) * board.clientWidth,
        behavior: "smooth"
      });
    });

    /* Scroll fires many times a frame on a flick; one read per frame is
       enough and keeps the main thread free for the scroll itself. */
    let queued = false;
    board.addEventListener("scroll", function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        markCurrent();
      });
    }, { passive: true });

    /* app.js redraws the board on every change, and i18n.js rewrites text
       nodes after it. Rebuilding only when the columns or their counts
       actually changed keeps those two from triggering each other forever. */
    new MutationObserver(function () {
      if (!phone.matches) return;
      if (boardSignature() === signature) return;
      buildPager();
    }).observe(board, { childList: true, characterData: true, subtree: true });

    if (phone.matches) buildPager();
    phone.addEventListener("change", function (event) {
      if (event.matches) buildPager();
    });
  }

  /* --------------------------------------------------------------------------
     4. The service worker — what makes it an app rather than a bookmark

     Installed to the home screen, madpomo opens with no browser chrome, from
     cache, with no network at all. The data was always local; now the shell
     is too. Registered with a relative path so the scope follows wherever the
     app is deployed, and skipped on file:// where workers are not allowed.
     -------------------------------------------------------------------------- */

  if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {
        /* No worker means no offline start. Everything else still works, so
           this is not worth a message on the page. */
      });
    });
  }
})();
