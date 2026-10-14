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

This project is being built in deliberate stages — HTML, then CSS, then JavaScript, then a React + Vite rebuild — as a way to learn front-end development step by step. **The current state is HTML + CSS only.** The board, report, settings, and about pages are all built and visually complete, but none of the interactive behavior described above (timer, localStorage persistence, task cancellation, live report data) is wired up yet.

React and Vite aren't required for the app itself — plain JavaScript would cover everything — but rebuilding it in React afterward is a deliberate part of the learning path.

### Roadmap

- [ ] JavaScript: timer logic, `localStorage` persistence, task cancellation with reason capture, live report calculations
- [ ] Rebuild in React + Vite, as a comparison to the plain-JS version
- [ ] Desktop packaging for offline use and native OS notifications
- [ ] Language support: en-US and pt-BR

## Branches

- `main` — active development, moving through the stages above
- `demo-html-css` — a frozen snapshot of the HTML/CSS-only version, for anyone who wants to browse the raw design and markup without the rest of the app
