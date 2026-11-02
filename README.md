# madpomo

A minimalist kanban board with a built-in pomodoro timer and a self-performance report. Built as both a personal productivity tool and a front-end learning project.

## Why

Objectively evaluating your own performance — and avoiding procrastination — is hard. I'd known about the pomodoro technique for years but never used it with any real discipline. Instead of picking an existing app, I designed this one: a mix of kanban + pomodoro + report, built around one specific question — *do I actually finish what I start, and where do I keep getting pulled away?*

The interface is deliberately minimalist: no motion or animation, no external UI libraries, no assets or accounts. It's built to be read and understood at a glance.

## What it does

- **Board** — a kanban-style task list. Each card holds a due date, a description, and subtasks.
- **Pomodoro timer** — focus/break sessions tied to the active task.
- **Report** — a summary of pomodoros completed, follow-through rate, pauses, and task-level stats, with a short written insight based on your own numbers.
- **Settings** — timer lengths, notification preferences, and data controls.

Clicking the "x" on a card is meant to mark it as cancelled rather than deleted, prompting for a short reason so cancellations show up as data in the report instead of just disappearing.

## Data & privacy

No backend, no database, no account system. Everything is designed to live entirely in your browser via `localStorage` — nothing you enter is ever sent anywhere, aside from whatever's needed to load the page itself (a static host, online or local).

## Design

Designed first in Figma, refined through a few rounds of feedback, then hand-built in plain HTML and CSS — no framework, no CSS library. The design system (tokens, components) was built from scratch; Claude helped structure and comment the final CSS for readability.

## Status

This project is being built in deliberate stages — HTML, then CSS, then JavaScript, then a React + Vite rebuild — as a way to learn front-end development step by step. **The plain-JavaScript app is complete and working.** Everything described above runs: the timer (and it keeps counting as you move between pages), the board, cancellation with a reason, the settings, and a report built entirely from your own logged sessions.

React and Vite aren't required for the app itself — plain JavaScript would cover everything — but rebuilding it in React afterward is a deliberate part of the learning path.

### How it is put together

No build step and no dependencies. Open `index.html` and it runs.

| File | What it does |
|---|---|
| `storage.js` | the four `localStorage` keys, defaults, and the shared `MP` namespace |
| `stats.js` | dates and every number the report and sidebar show |
| `timer.js` | the pomodoro timer, on every page |
| `shell.js` | header date, task overview, 7-day heatmap |
| `app.js` | the board: cards, editing, drag-and-drop, search |
| `report.js` | the report page |
| `settings-ui.js` | the settings page |
| `tokens.css` / `style.css` | design tokens and all layout + components |

Each focus session is written to `madpomo.sessions` with how long it ran, how many times it was paused, and whether it reached 00:00. The report is derived from that log, so nothing on it is hardcoded.

### Roadmap

- [x] JavaScript: timer logic, `localStorage` persistence, task cancellation with reason capture, live report calculations
- [x] Rebuild in React + Vite as a single page, as a comparison to the plain-JS version
- [ ] Windows install package (Tauri), with real Windows toast notifications instead of browser ones
- [ ] Language support: en-US and pt-BR

## Versions

- **Design demo** — HTML and CSS only, nothing wired up. A frozen snapshot of the markup and the design system, for anyone who wants to read those without the app around them. Branch `demo-html-css`.
- **Web app** — the full thing described above, plain JavaScript, no build step. Four HTML pages, one per view.
- **React app** — the same app as a single page, in `react/`. Clicking settings, the report or about swaps the view without a reload, and the pomodoro keeps counting while you move around. Same `localStorage` keys and the same `style.css`, so the two versions share both their data and their design system. `npm run dev` to run it, `npm run build` for `react/dist`.
- **Windows app** — planned. The same code in a Tauri shell, so the end of a pomodoro raises a real Windows notification in the corner whether or not a browser is open. See `TODO.md` for the plan.

## License

Apache License 2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE). Free to read, use, change and ship, commercially included. Keep the notice with whatever you redistribute, and say where it came from.

The name stays with this project. Section 6 of the licence covers trade names, so a fork goes out under a name of its own.

The design side — `tokens.css`, `style.css`, the Figma file and the written copy — is additionally available under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/): the same bargain in Creative Commons terms, use it anywhere and credit the original.
