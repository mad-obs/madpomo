import { useEffect, useRef, useState } from "react";
import { useMadpomo } from "../store.jsx";
import { pad2 } from "../lib/stats.js";
import { navigate } from "../hooks/useHashRoute.js";
import * as db from "../lib/storage.js";

const STEPPERS = [
  { key: "focusMinutes", label: "focus length", hint: "Minutes per pomodoro", min: 1, max: 90 },
  { key: "shortBreakMinutes", label: "short break", hint: "Minutes between pomodoros", min: 1, max: 30 },
  { key: "longBreakMinutes", label: "long break", hint: "Minutes after a full cycle", min: 1, max: 60 },
  { key: "cycleLength", label: "cycle length", hint: "Pomodoros before a long break", min: 2, max: 8 }
];

export default function SettingsView({ params }) {
  const { settings, setSettings, tasks, sessions, columns } = useMadpomo();
  const [legal, setLegal] = useState(params ? params.get("legal") : null);
  const [resetting, setResetting] = useState(false);
  const [promptReset, setPromptReset] = useState(false);

  const legalDialog = useRef(null);
  const resetDialog = useRef(null);

  useEffect(() => {
    const dialog = legalDialog.current;
    if (!dialog) return;
    if (legal && !dialog.open) dialog.showModal();
    if (!legal && dialog.open) dialog.close();
  }, [legal]);

  useEffect(() => {
    const dialog = resetDialog.current;
    if (!dialog) return;
    if (resetting && !dialog.open) dialog.showModal();
    if (!resetting && dialog.open) dialog.close();
  }, [resetting]);

  function step(key, direction, min, max) {
    setSettings((current) => ({
      ...current,
      [key]: Math.min(max, Math.max(min, current[key] + direction))
    }));
  }

  function toggle(key, checked) {
    if (key === "desktopNotifications" && checked && "Notification" in window) {
      if (Notification.permission === "denied") {
        window.alert("notifications are blocked for this site in your browser settings.");
        return;
      }
      if (Notification.permission !== "granted") {
        Notification.requestPermission().then((result) => {
          if (result !== "granted") setSettings((current) => ({ ...current, [key]: false }));
        });
      }
    }

    setSettings((current) => ({ ...current, [key]: checked }));
  }

  function exportData() {
    const payload = {
      app: "madpomo",
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      columns,
      tasks,
      sessions
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const today = new Date();
    const stamp = today.getFullYear() + "-" + pad2(today.getMonth() + 1) + "-" + pad2(today.getDate());

    const link = document.createElement("a");
    link.href = url;
    link.download = "madpomo-" + stamp + ".json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function wipeEverything() {
    db.clearAll();
    setResetting(false);
    window.location.reload();
  }

  return (
    <>
      <section className="toolbar">
        <h1 className="toolbar__title">Settings</h1>
      </section>

      <div className="content">
        <div className="settings-grid">
          <div className="settings-grid__left">
            <div className="card">
              <h2 className="card__title">//timer</h2>
              {STEPPERS.map((item) => (
                <div className="setting" key={item.key}>
                  <div className="setting__text">
                    <p className="setting__label">{item.label}</p>
                    <p className="setting__hint">{item.hint}</p>
                  </div>
                  <div className="stepper">
                    <button
                      type="button"
                      className="stepper__btn"
                      aria-label={"decrease " + item.label}
                      onClick={() => step(item.key, -1, item.min, item.max)}
                    >
                      -
                    </button>
                    <p className="stepper__value">{settings[item.key]}</p>
                    <button
                      type="button"
                      className="stepper__btn"
                      aria-label={"increase " + item.label}
                      onClick={() => step(item.key, 1, item.min, item.max)}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}

              <div className="setting">
                <div className="setting__text">
                  <p className="setting__label">auto-start next session</p>
                  <p className="setting__hint">Start the break or focus automatically</p>
                </div>
                <input
                  type="checkbox"
                  id="auto-start-toggle"
                  className="toggle__input"
                  hidden
                  checked={settings.autoStart}
                  onChange={(event) => toggle("autoStart", event.target.checked)}
                />
                <label htmlFor="auto-start-toggle" className="toggle"><span className="toggle__knob" /></label>
              </div>
            </div>

            <div className="card">
              <h2 className="card__title">//notifications</h2>

              <div className="setting">
                <div className="setting__text">
                  <p className="setting__label">sound when a session ends</p>
                  <p className="setting__hint">A short tone at the end of focus and breaks</p>
                </div>
                <input
                  type="checkbox"
                  id="sound-toggle"
                  className="toggle__input"
                  hidden
                  checked={settings.sound}
                  onChange={(event) => toggle("sound", event.target.checked)}
                />
                <label htmlFor="sound-toggle" className="toggle"><span className="toggle__knob" /></label>
              </div>

              <div className="setting">
                <div className="setting__text">
                  <p className="setting__label">desktop notifications</p>
                  <p className="setting__hint">Show an alert when the timer finishes</p>
                </div>
                <input
                  type="checkbox"
                  id="desktop-toggle"
                  className="toggle__input"
                  hidden
                  checked={settings.desktopNotifications}
                  onChange={(event) => toggle("desktopNotifications", event.target.checked)}
                />
                <label htmlFor="desktop-toggle" className="toggle"><span className="toggle__knob" /></label>
              </div>
            </div>

            <div className="card">
              <h2 className="card__title">//general</h2>

              {[
                { key: "timeFormat", label: "time format", options: ["24H", "12H"] },
                { key: "weekStartsOn", label: "week starts on", options: ["MON", "SUN"] }
              ].map((group) => (
                <div className="setting" key={group.key}>
                  <div className="setting__text">
                    <p className="setting__label">{group.label}</p>
                  </div>
                  <div className="segmented">
                    {group.options.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={
                          "segmented__item" + (settings[group.key] === option ? " segmented__item--active" : "")
                        }
                        onClick={() => setSettings((current) => ({ ...current, [group.key]: option }))}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="settings-grid__right">
            <div className="card">
              <h2 className="card__title">//help</h2>

              <div className="setting">
                <div className="setting__text">
                  <p className="setting__label">tutorial</p>
                  <p className="setting__hint">A guided tour of the board, the timer and the report</p>
                </div>
                <button type="button" className="btn btn--primary" onClick={() => navigate("board", "tour=1")}>
                  open tutorial
                </button>
              </div>

              <div className="setting">
                <div className="setting__text">
                  <p className="setting__label">welcome prompt</p>
                  <p className="setting__hint">Ask again, next time the board opens</p>
                </div>
                <button
                  type="button"
                  className="btn"
                  disabled={promptReset}
                  onClick={() => {
                    try {
                      localStorage.removeItem(db.KEYS.tutorial);
                    } catch (error) {
                      console.warn("madpomo: could not clear the tutorial flag.", error);
                    }
                    setPromptReset(true);
                  }}
                >
                  {promptReset ? "it will ask again" : "show again"}
                </button>
              </div>
            </div>

            <div className="card">
              <h2 className="card__title">//data</h2>

              <div className="setting">
                <div className="setting__text">
                  <p className="setting__label">export my data</p>
                  <p className="setting__hint">Download tasks and pomodoros as a file</p>
                </div>
                <button type="button" className="btn" onClick={exportData}>export</button>
              </div>
            </div>

            <div className="card">
              <h2 className="card__title">//legal</h2>

              <button type="button" className="link" onClick={() => setLegal("terms")}>
                <div className="setting__text">
                  <p className="setting__label">terms of use</p>
                  <p className="setting__hint">What you agree to by using madpomo</p>
                </div>
                <span className="link__arrow">-&gt;</span>
              </button>

              <button type="button" className="link" onClick={() => setLegal("privacy")}>
                <div className="setting__text">
                  <p className="setting__label">privacy policy</p>
                  <p className="setting__hint">What is stored, and where it stays</p>
                </div>
                <span className="link__arrow">-&gt;</span>
              </button>
            </div>

            <div className="card card--danger">
              <h2 className="card__title">//danger zone</h2>
              <div className="setting setting--stack">
                <div className="setting__text">
                  <p className="setting__label">reset everything</p>
                  <p className="setting__hint">Deletes all tasks, pomodoros and reports. This cannot be undone.</p>
                </div>
                <button type="button" className="btn btn--outline-danger" onClick={() => setResetting(true)}>
                  reset
                </button>
              </div>
            </div>

            <p className="settings-note">Changes are saved automatically.</p>
          </div>
        </div>
      </div>

      <dialog className="dialog dialog--doc" ref={legalDialog} onClose={() => setLegal(null)}>
        {legal === "privacy" ? (
          <>
            <h2 className="dialog__title">//privacy policy</h2>
            <h3 className="dialog__heading">What Is Collected</h3>
            <p className="dialog__text">Nothing. No account, no analytics, no cookies, no tracking of any kind. There is no server to send anything to.</p>
            <h3 className="dialog__heading">What Is Stored, and Where</h3>
            <p className="dialog__text">Your tasks, your pomodoro log, the timer state and your settings are saved in this browser&apos;s localStorage, on this device. They are not synced anywhere and nobody else can read them.</p>
            <h3 className="dialog__heading">What the Page Requests</h3>
            <p className="dialog__text">Two things. The app files, from wherever it is hosted. And the Space Mono typeface from Google Fonts, which means Google sees your IP address when the page loads. Nothing else goes out.</p>
            <h3 className="dialog__heading">Deleting It</h3>
            <p className="dialog__text">Reset everything under //danger zone wipes all of it at once. Clearing your browser data does the same.</p>
            <h3 className="dialog__heading">Checking Any of This</h3>
            <p className="dialog__text">The code is public. Open the network tab, or read the source.</p>
          </>
        ) : (
          <>
            <h2 className="dialog__title">//terms of use</h2>
            <h3 className="dialog__heading">What This Is</h3>
            <p className="dialog__text">madpomo is a task board with a pomodoro timer built into it. It is free, it is open source, and it runs in your browser. There is no account, no subscription, and no server behind it.</p>
            <h3 className="dialog__heading">No Warranty</h3>
            <p className="dialog__text">The app is provided as-is. It has bugs I have not found yet, and it can lose your work: clearing your browser storage erases everything madpomo has saved. I am not liable for lost work or lost time.</p>
            <h3 className="dialog__heading">Backups Are Yours to Make</h3>
            <p className="dialog__text">Everything you type stays on your device, so nobody else can read it and nobody else can recover it for you. The export button under //data writes all of it to a file. Use it.</p>
            <h3 className="dialog__heading">The Code</h3>
            <p className="dialog__text">The source is public on GitHub under the Apache License 2.0. Read it, change it, build your own version on it, for free. Keep the licence and the credit with whatever you pass on. The one thing it does not hand over is the name: call your version something other than madpomo.</p>
            <h3 className="dialog__heading">Changes</h3>
            <p className="dialog__text">These terms change when the app does. The version in this window is the current one.</p>
          </>
        )}
        <div className="dialog__actions">
          <button type="button" className="btn btn--primary" onClick={() => setLegal(null)}>close</button>
        </div>
      </dialog>

      <dialog className="dialog" ref={resetDialog} onClose={() => setResetting(false)}>
        <h2 className="dialog__title">//reset everything</h2>
        <p className="dialog__hint">this deletes every task, pomodoro and setting stored in this browser. it cannot be undone.</p>
        <div className="dialog__actions">
          <button type="button" className="btn" onClick={() => setResetting(false)}>keep my data</button>
          <button type="button" className="btn btn--outline-danger" onClick={wipeEverything}>reset everything</button>
        </div>
      </dialog>
    </>
  );
}
