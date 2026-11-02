/* One task card. In the plain-JS build this was a template string plus a lot
   of replaceWith() surgery to turn a label into an input; here the card just
   renders an input when it is being edited, which is the clearest difference
   between the two versions. */

import { useState } from "react";
import { useMadpomo } from "../store.jsx";
import { formatDate, formatTime, pad2 } from "../lib/stats.js";

function dueDateText(task, settings) {
  if (!task.dueDate) return "not set";
  const parsed = new Date(task.dueDate);
  if (Number.isNaN(parsed.getTime())) return task.dueDate; // free text from an old save
  return formatDate(parsed) + " | " + formatTime(parsed, settings);
}

function dueDateInputValue(task) {
  const parsed = new Date(task.dueDate);
  if (!task.dueDate || Number.isNaN(parsed.getTime())) return "";
  return (
    parsed.getFullYear() +
    "-" + pad2(parsed.getMonth() + 1) +
    "-" + pad2(parsed.getDate()) +
    "T" + pad2(parsed.getHours()) +
    ":" + pad2(parsed.getMinutes())
  );
}

export default function TaskCard({ task, isCurrent, onCancel, onDelete, onMouseDown, dragging }) {
  const { settings, updateTask, setTaskStatus, focusTask, columns } = useMadpomo();
  const [editing, setEditing] = useState(null); // "title" | "notes" | "due" | number (subtask index)
  const [draft, setDraft] = useState("");
  const [newSubtask, setNewSubtask] = useState(null);

  const done = task.status === "completed" || task.status === "cancelled";

  function startEdit(field, value) {
    setEditing(field);
    setDraft(value);
  }

  function commit() {
    const value = draft.trim();

    if (editing === "title" && value !== "") updateTask(task.id, { title: value });
    if (editing === "notes") updateTask(task.id, { notes: value });
    if (editing === "due") {
      updateTask(task.id, { dueDate: value === "" ? "" : new Date(value).toISOString() });
    }
    if (typeof editing === "number" && value !== "") {
      updateTask(task.id, {
        subtasks: task.subtasks.map((s, i) => (i === editing ? { ...s, text: value } : s))
      });
    }

    setEditing(null);
  }

  function onEditKey(event) {
    if (event.key === "Escape" || (event.key === "Enter" && editing !== "notes")) {
      event.preventDefault();
      commit();
    }
  }

  function toggleSubtask(index) {
    updateTask(task.id, {
      subtasks: task.subtasks.map((s, i) => (i === index ? { ...s, done: !s.done } : s))
    });
  }

  function removeSubtask(index) {
    updateTask(task.id, { subtasks: task.subtasks.filter((_, i) => i !== index) });
  }

  function addSubtask() {
    const text = (newSubtask || "").trim();
    if (text !== "") updateTask(task.id, { subtasks: task.subtasks.concat({ text, done: false }) });
    setNewSubtask(null);
  }

  return (
    <div
      className={"task" + (isCurrent ? " task--current" : "") + (dragging ? " task--dragging" : "")}
      data-id={task.id}
      onMouseDown={onMouseDown}
    >
      <div className="task__head">
        {editing === "title" ? (
          <input
            type="text"
            className="task__head-input"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={onEditKey}
          />
        ) : (
          <span
            className="task__head-label"
            onClick={() => (task.expanded ? startEdit("title", task.title) : updateTask(task.id, { expanded: true }))}
          >
            {task.title}
          </span>
        )}

        {task.expanded ? (
          <div className="task__actions">
            <button
              type="button"
              className="btn btn--icon btn--minimize"
              aria-label="minimize task"
              onClick={() => updateTask(task.id, { expanded: false })}
            >
              _
            </button>
          </div>
        ) : null}
      </div>

      {task.expanded ? (
        <div className="task__body">
          {editing === "due" ? (
            <input
              type="datetime-local"
              className="task__due-input"
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={onEditKey}
            />
          ) : (
            <p className="task__due" onClick={() => startEdit("due", dueDateInputValue(task))}>
              due date: {dueDateText(task, settings)}
            </p>
          )}

          {task.status === "cancelled" && task.cancelReason ? (
            <p className="task__reason">cancelled: {task.cancelReason}</p>
          ) : null}

          {editing === "notes" ? (
            <textarea
              className="task__notes-input"
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={onEditKey}
            />
          ) : (
            <p className="task__notes" onClick={() => startEdit("notes", task.notes)}>
              {task.notes === "" ? "add your task description here..." : task.notes}
            </p>
          )}

          <ul className="checklist">
            {task.subtasks.map((subtask, index) => (
              <li key={index} className="checklist__item">
                <span className="checklist__item-box" onClick={() => toggleSubtask(index)}>
                  {subtask.done ? "[x]" : "[ ]"}
                </span>

                {editing === index ? (
                  <input
                    type="text"
                    className="search__input"
                    value={draft}
                    autoFocus
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commit}
                    onKeyDown={onEditKey}
                  />
                ) : (
                  <span className="checklist__item-label" onClick={() => startEdit(index, subtask.text)}>
                    {subtask.text}
                  </span>
                )}

                <span className="subtask__delete" onClick={() => removeSubtask(index)}>x</span>
              </li>
            ))}

            {newSubtask === null ? (
              <li className="checklist__item checklist__item--ghost" onClick={() => setNewSubtask("")}>
                <span className="checklist__item-label">+ add subtask</span>
              </li>
            ) : (
              <li className="checklist__item">
                <input
                  type="text"
                  className="search__input"
                  placeholder="subtask title..."
                  value={newSubtask}
                  autoFocus
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onBlur={addSubtask}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addSubtask();
                    if (e.key === "Escape") setNewSubtask(null);
                  }}
                />
              </li>
            )}
          </ul>

          {task.cyclesUsed > 0 ? (
            <p className="task__cycles">
              {task.cyclesUsed} pomodoro{task.cyclesUsed === 1 ? "" : "s"} done
            </p>
          ) : null}

          <div className="task__footer">
            {done ? (
              <button type="button" className="btn" onClick={() => setTaskStatus(task.id, "todo")}>
                reopen
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={isCurrent}
                  onClick={() => {
                    /* Starting a pomodoro means the task is being worked on
                       now, from whichever waiting column it sat in. */
                    const from = columns.find((column) => column.id === task.status);
                    if (from && from.kind === "open" && task.status !== "in-progress") {
                      setTaskStatus(task.id, "in-progress");
                    }
                    focusTask(task.id);
                  }}
                >
                  focus
                </button>
                <button type="button" className="btn" onClick={() => setTaskStatus(task.id, "completed")}>
                  finish
                </button>
              </>
            )}

            {task.status === "cancelled" ? (
              <button type="button" className="btn btn--outline-danger" onClick={() => onDelete(task)}>
                delete
              </button>
            ) : (
              <button type="button" className="btn btn--outline-danger" onClick={() => onCancel(task)}>
                cancel
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
