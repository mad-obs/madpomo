/* ==========================================================================
   madpomo — the settings page (settings.html only)

   Each control names the setting it edits with a data- attribute, so the
   wiring is one loop per control type instead of one listener per row.
   Every change is written to localStorage immediately.
   ========================================================================== */

(function () {
  const page = document.getElementById("settings-page");
  if (!page) return;

  const resetDialog = document.getElementById("reset-dialog");

  /* --------------------------------------------------------------------------
     Draw the stored values into the controls
     -------------------------------------------------------------------------- */

  function renderSteppers() {
    page.querySelectorAll(".stepper").forEach(function (stepper) {
      const value = MP.settings[stepper.dataset.setting];
      stepper.querySelector(".stepper__value").textContent = value;
    });
  }

  function renderToggles() {
    page.querySelectorAll(".toggle__input").forEach(function (input) {
      input.checked = Boolean(MP.settings[input.dataset.setting]);
    });
  }

  function renderSegmented() {
    page.querySelectorAll(".segmented[data-setting]").forEach(function (group) {
      const value = MP.settings[group.dataset.setting];

      group.querySelectorAll(".segmented__item").forEach(function (item) {
        item.classList.toggle("segmented__item--active", item.dataset.value === value);
      });
    });
  }

  function renderAll() {
    renderSteppers();
    renderToggles();
    renderSegmented();
  }

  /* --------------------------------------------------------------------------
     Changes
     -------------------------------------------------------------------------- */

  function applyChange() {
    MP.saveSettings();
    if (MP.timer) MP.timer.settingsChanged();
    MP.dataChanged();
    renderAll();
  }

  page.addEventListener("click", function (event) {
    const stepperBtn = event.target.closest(".stepper__btn");

    if (stepperBtn) {
      const stepper = stepperBtn.closest(".stepper");
      const key = stepper.dataset.setting;
      const min = Number(stepper.dataset.min);
      const max = Number(stepper.dataset.max);
      const step = Number(stepper.dataset.step || 1);
      const direction = stepperBtn.dataset.direction === "down" ? -1 : 1;

      const next = MP.settings[key] + direction * step;
      MP.settings[key] = Math.min(max, Math.max(min, next));
      applyChange();
      return;
    }

    const segmentedItem = event.target.closest(".segmented[data-setting] .segmented__item");

    if (segmentedItem) {
      const group = segmentedItem.closest(".segmented");
      MP.settings[group.dataset.setting] = segmentedItem.dataset.value;
      applyChange();
    }
  });

  page.addEventListener("change", function (event) {
    const input = event.target;
    if (!input.classList.contains("toggle__input")) return;

    const key = input.dataset.setting;
    MP.settings[key] = input.checked;

    /* Desktop notifications need the browser's permission, and a browser
       only grants it from a real click, which this is. */
    if (key === "desktopNotifications" && input.checked && "Notification" in window) {
      if (Notification.permission === "denied") {
        MP.settings[key] = false;
        input.checked = false;
        window.alert("notifications are blocked for this site in your browser settings.");
      } else if (Notification.permission !== "granted") {
        Notification.requestPermission().then(function (result) {
          if (result !== "granted") {
            MP.settings[key] = false;
            MP.saveSettings();
            renderToggles();
          }
        });
      }
    }

    applyChange();
  });

  /* --------------------------------------------------------------------------
     Export
     -------------------------------------------------------------------------- */

  const exportBtn = document.getElementById("export-btn");

  if (exportBtn) {
    exportBtn.addEventListener("click", function () {
      const payload = {
        app: "madpomo",
        version: 1,
        exportedAt: new Date().toISOString(),
        settings: MP.settings,
        columns: MP.columns,
        tasks: MP.tasks,
        sessions: MP.loadSessions()
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const today = new Date();
      const stamp = today.getFullYear() + "-" + MP.pad2(today.getMonth() + 1) + "-" + MP.pad2(today.getDate());

      const link = document.createElement("a");
      link.href = url;
      link.download = "madpomo-" + stamp + ".json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    });
  }

  /* --------------------------------------------------------------------------
     Help — the tutorial lives on the board, so both buttons send you there
     -------------------------------------------------------------------------- */

  const tutorialBtn = document.getElementById("tutorial-btn");

  if (tutorialBtn) {
    tutorialBtn.addEventListener("click", function () {
      window.location.href = "index.html?tour=1";
    });
  }

  const welcomeResetBtn = document.getElementById("welcome-reset-btn");

  if (welcomeResetBtn) {
    welcomeResetBtn.addEventListener("click", function () {
      try {
        localStorage.removeItem(MP.KEYS.tutorial);
      } catch (error) {
        console.warn("madpomo: could not clear the tutorial flag.", error);
      }
      welcomeResetBtn.textContent = "it will ask again";
      welcomeResetBtn.disabled = true;
    });
  }

  /* --------------------------------------------------------------------------
     Legal — terms and privacy are dialogs, not pages
     -------------------------------------------------------------------------- */

  page.addEventListener("click", function (event) {
    const opener = event.target.closest("[data-dialog]");
    if (!opener) return;
    const dialog = document.getElementById(opener.dataset.dialog);
    if (dialog) dialog.showModal();
  });

  document.querySelectorAll("[data-dialog-close]").forEach(function (button) {
    button.addEventListener("click", function () {
      const dialog = button.closest("dialog");
      if (dialog) dialog.close();
    });
  });

  /* The about page links here with ?legal=terms or ?legal=privacy, so the
     texts only exist once. */
  const legal = new URLSearchParams(window.location.search).get("legal");

  if (legal === "terms" || legal === "privacy") {
    const dialog = document.getElementById(legal + "-dialog");
    if (dialog) dialog.showModal();
    window.history.replaceState({}, "", window.location.pathname);
  }

  /* --------------------------------------------------------------------------
     Danger zone
     -------------------------------------------------------------------------- */

  const resetAllBtn = document.getElementById("reset-all-btn");

  if (resetAllBtn && resetDialog) {
    resetAllBtn.addEventListener("click", function () {
      resetDialog.showModal();
    });

    document.getElementById("reset-dialog-keep").addEventListener("click", function () {
      resetDialog.close();
    });

    document.getElementById("reset-dialog-confirm").addEventListener("click", function () {
      Object.keys(MP.KEYS).forEach(function (name) {
        try {
          localStorage.removeItem(MP.KEYS[name]);
        } catch (error) {
          console.warn("madpomo: could not clear " + MP.KEYS[name] + ".", error);
        }
      });

      resetDialog.close();
      window.location.reload();
    });
  }

  renderAll();
})();
