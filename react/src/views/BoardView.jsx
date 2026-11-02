import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useMadpomo } from "../store.jsx";
import TaskCard from "../components/TaskCard.jsx";
import * as db from "../lib/storage.js";

export default function BoardView() {
  const { tasks, setTasks, timer, addTask, removeTask, setTaskStatus, columns, addColumn, removeColumn } =
    useMadpomo();

  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(null); // the status a new card is being typed into
  const [newTitle, setNewTitle] = useState("");
  const [cancelFor, setCancelFor] = useState(null);
  const [deleteFor, setDeleteFor] = useState(null);
  const [reason, setReason] = useState("");
  const [namingColumn, setNamingColumn] = useState(false);
  const [columnName, setColumnName] = useState("");
  const [deleteColumnFor, setDeleteColumnFor] = useState(null);

  /* ---- search --------------------------------------------------------- */

  const searchRef = useRef(null);
  const term = search.trim().toLowerCase();

  useEffect(() => {
    function onKey(event) {
      if (event.key !== "/") return;
      const tag = document.activeElement ? document.activeElement.tagName : "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      event.preventDefault();
      if (searchRef.current) searchRef.current.focus();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function matches(task) {
    if (term === "") return true;
    return [task.title, task.notes]
      .concat(task.subtasks.map((s) => s.text))
      .join(" ")
      .toLowerCase()
      .includes(term);
  }

  const visible = tasks.filter(matches);

  const openColumnCount = useMemo(
    () => columns.filter((column) => column.kind === "open").length,
    [columns]
  );

  /* ---- drag and drop --------------------------------------------------
     Mouse-tracked, like the plain-JS version: the card follows the pointer
     and a placeholder shows the slot it would land in.
     --------------------------------------------------------------------- */

  const dragRef = useRef(null);
  const dropRef = useRef(null);
  const [dragBox, setDragBox] = useState(null);
  const [drop, setDrop] = useState(null);
  const [dragId, setDragId] = useState(null);

  function onCardMouseDown(event, task) {
    if (event.target.closest("button, input, textarea, .checklist__item, .task__notes, .task__due")) return;

    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      id: task.id,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      active: false
    };
    dropRef.current = null;
    setDragId(task.id);
    document.body.style.userSelect = "none";
  }

  useEffect(() => {
    if (dragId === null) return undefined;

    function onMove(event) {
      const drag = dragRef.current;
      if (!drag) return;

      if (!drag.active) {
        const far = Math.abs(event.clientX - drag.startX) > 5 || Math.abs(event.clientY - drag.startY) > 5;
        if (!far) return;
        drag.active = true;
      }

      setDragBox({
        x: event.clientX - drag.offsetX,
        y: event.clientY - drag.offsetY,
        width: drag.width
      });

      const below = document.elementFromPoint(event.clientX, event.clientY);
      const column = below ? below.closest(".column") : null;
      if (!column) return;

      const cards = Array.from(column.querySelectorAll(".task")).filter(
        (card) => Number(card.dataset.id) !== drag.id
      );

      let beforeId = null;
      for (const card of cards) {
        const rect = card.getBoundingClientRect();
        if (event.clientY < rect.top + rect.height / 2) {
          beforeId = Number(card.dataset.id);
          break;
        }
      }

      const next = { status: column.dataset.status, beforeId };
      dropRef.current = next;
      setDrop(next);
    }

    function onUp() {
      const drag = dragRef.current;
      const target = dropRef.current;

      if (drag && drag.active && target) {
        const moved = tasks.find((task) => task.id === drag.id);
        if (moved && moved.status !== target.status) setTaskStatus(drag.id, target.status);

        setTasks((list) => {
          const task = list.find((t) => t.id === drag.id);
          if (!task) return list;
          const rest = list.filter((t) => t.id !== drag.id);
          const index = target.beforeId === null ? -1 : rest.findIndex((t) => t.id === target.beforeId);
          if (index === -1) rest.push(task);
          else rest.splice(index, 0, task);
          return rest;
        });
      }

      dragRef.current = null;
      dropRef.current = null;
      setDragId(null);
      setDragBox(null);
      setDrop(null);
      document.body.style.userSelect = "";
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragId, tasks, setTasks, setTaskStatus]);

  /* ---- dialogs -------------------------------------------------------- */

  const cancelDialog = useRef(null);
  const deleteDialog = useRef(null);
  const deleteColumnDialog = useRef(null);

  useEffect(() => {
    const dialog = cancelDialog.current;
    if (!dialog) return;
    if (cancelFor && !dialog.open) dialog.showModal();
    if (!cancelFor && dialog.open) dialog.close();
  }, [cancelFor]);

  useEffect(() => {
    const dialog = deleteDialog.current;
    if (!dialog) return;
    if (deleteFor && !dialog.open) dialog.showModal();
    if (!deleteFor && dialog.open) dialog.close();
  }, [deleteFor]);

  useEffect(() => {
    const dialog = deleteColumnDialog.current;
    if (!dialog) return;
    if (deleteColumnFor && !dialog.open) dialog.showModal();
    if (!deleteColumnFor && dialog.open) dialog.close();
  }, [deleteColumnFor]);

  /* Says what the delete will actually do, counted at the moment it is asked. */
  const strandedText = useMemo(() => {
    if (!deleteColumnFor) return "";

    const stranded = tasks.filter((task) => task.status === deleteColumnFor.id).length;
    if (stranded === 0) return "the column is empty, so nothing moves.";

    const fallbackId = db.firstOpenColumn(columns.filter((column) => column.id !== deleteColumnFor.id));
    const fallback = columns.find((column) => column.id === fallbackId);

    return (
      stranded + (stranded === 1 ? " task moves" : " tasks move") +
      " back to " + (fallback ? fallback.name : "to do") + ". no work is deleted."
    );
  }, [deleteColumnFor, tasks, columns]);

  function openCancel(task) {
    setReason(task.cancelReason || "");
    setCancelFor(task);
  }

  function confirmCancel() {
    setTaskStatus(cancelFor.id, "cancelled", reason.trim());
    setCancelFor(null);
  }

  function confirmDelete() {
    removeTask(deleteFor.id);
    setDeleteFor(null);
  }

  /* ---- new task ------------------------------------------------------- */

  function commitNewTask() {
    const title = newTitle.trim();
    if (title !== "") addTask(title, adding);
    setAdding(null);
    setNewTitle("");
  }

  return (
    <>
      <section className="toolbar">
        <h1 className="toolbar__title">MY BOARD</h1>
        <div className="toolbar__actions">
          <div className="search">
            <input
              ref={searchRef}
              type="search"
              className="search__input"
              placeholder="/ search tasks"
              aria-label="search tasks"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn btn--primary"
            id="add-column-btn"
            onClick={() => {
              setColumnName("");
              setNamingColumn(true);
            }}
          >
            +column
          </button>
        </div>
      </section>

      <section className="board" aria-label="task board">
        {columns.map((column, index) => {
          const cards = visible.filter((task) => task.status === column.id);
          const showPlaceholderAtEnd = drop && drop.status === column.id && drop.beforeId === null;

          /* The column being named sits where it will end up: after the last
             open column, so the board does not jump when it is committed. */
          const draftGoesBefore = namingColumn && index === openColumnCount;

          return (
            <Fragment key={column.id}>
              {draftGoesBefore ? (
                <div className="column column--draft">
                  <div className="column__head">
                    <input
                      type="text"
                      className="column__name-input"
                      id="new-column-input"
                      placeholder="column name..."
                      aria-label="name the new column"
                      value={columnName}
                      autoFocus
                      onChange={(event) => setColumnName(event.target.value)}
                      onBlur={() => setNamingColumn(false)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          addColumn(columnName);
                          setNamingColumn(false);
                          setColumnName("");
                        }
                        if (event.key === "Escape") setNamingColumn(false);
                      }}
                    />
                  </div>
                </div>
              ) : null}

            <div className="column" data-status={column.id}>
              <div className="column__head">
                <div className="column__title">
                  {column.name}
                  <span className="column__count">({cards.length})</span>
                </div>
                <div className="column__tools">
                  {column.kind === "open" ? (
                    <button
                      type="button"
                      className="btn btn--icon"
                      aria-label="add task"
                      onClick={() => {
                        setAdding(column.id);
                        setNewTitle("");
                      }}
                    >
                      +
                    </button>
                  ) : null}
                  {!column.fixed ? (
                    <button
                      type="button"
                      className="btn btn--icon"
                      aria-label="delete column"
                      onClick={() => setDeleteColumnFor(column)}
                    >
                      x
                    </button>
                  ) : null}
                </div>
              </div>

              {adding === column.id ? (
                <div className="task">
                  <div className="task__head">
                    <input
                      type="text"
                      className="task__head-input"
                      placeholder="task title..."
                      value={newTitle}
                      autoFocus
                      onChange={(event) => setNewTitle(event.target.value)}
                      onBlur={() => {
                        setAdding(null);
                        setNewTitle("");
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") commitNewTask();
                        if (event.key === "Escape") {
                          setAdding(null);
                          setNewTitle("");
                        }
                      }}
                    />
                  </div>
                </div>
              ) : null}

              {cards.map((task) => (
                <div key={task.id} className="column__slot">
                  {drop && drop.status === column.id && drop.beforeId === task.id ? (
                    <div className="drop-placeholder" />
                  ) : null}
                  <TaskCard
                    task={task}
                    isCurrent={timer.taskId === task.id}
                    dragging={dragId === task.id && dragBox !== null}
                    onMouseDown={(event) => onCardMouseDown(event, task)}
                    onCancel={openCancel}
                    onDelete={setDeleteFor}
                  />
                </div>
              ))}

              {showPlaceholderAtEnd ? <div className="drop-placeholder" /> : null}
            </div>
            </Fragment>
          );
        })}

        {/* nothing open to sit in front of: the draft goes at the end */}
        {namingColumn && openColumnCount >= columns.length ? (
          <div className="column column--draft">
            <div className="column__head">
              <input
                type="text"
                className="column__name-input"
                id="new-column-input"
                placeholder="column name..."
                aria-label="name the new column"
                value={columnName}
                autoFocus
                onChange={(event) => setColumnName(event.target.value)}
                onBlur={() => setNamingColumn(false)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    addColumn(columnName);
                    setNamingColumn(false);
                    setColumnName("");
                  }
                  if (event.key === "Escape") setNamingColumn(false);
                }}
              />
            </div>
          </div>
        ) : null}
      </section>

      {/* the card under the pointer, lifted out of the flow */}
      {dragBox && dragId !== null ? (
        <div
          className="task-ghost"
          style={{ left: dragBox.x + "px", top: dragBox.y + "px", width: dragBox.width + "px" }}
        >
          <div className="task">
            <div className="task__head">
              <span className="task__head-label">
                {(tasks.find((task) => task.id === dragId) || {}).title}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      <dialog className="dialog" ref={cancelDialog} onClose={() => setCancelFor(null)}>
        <h2 className="dialog__title">//cancel task</h2>
        <p className="dialog__task">{cancelFor ? cancelFor.title : ""}</p>
        <label className="dialog__label" htmlFor="cancel-reason">why are you cancelling it?</label>
        <textarea
          id="cancel-reason"
          className="dialog__input"
          rows="3"
          placeholder="reason (optional)..."
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <div className="dialog__actions">
          <button type="button" className="btn" onClick={() => setCancelFor(null)}>keep task</button>
          <button type="button" className="btn btn--outline-danger" onClick={confirmCancel}>cancel task</button>
        </div>
      </dialog>

      <dialog className="dialog" ref={deleteDialog} onClose={() => setDeleteFor(null)}>
        <h2 className="dialog__title">//delete task</h2>
        <p className="dialog__task">{deleteFor ? deleteFor.title : ""}</p>
        <p className="dialog__hint">this removes the task for good. it cannot be undone.</p>
        <div className="dialog__actions">
          <button type="button" className="btn" onClick={() => setDeleteFor(null)}>keep it</button>
          <button type="button" className="btn btn--outline-danger" onClick={confirmDelete}>delete</button>
        </div>
      </dialog>

      <dialog className="dialog" ref={deleteColumnDialog} onClose={() => setDeleteColumnFor(null)}>
        <h2 className="dialog__title">//delete column</h2>
        <p className="dialog__task">{deleteColumnFor ? deleteColumnFor.name : ""}</p>
        <p className="dialog__hint">{strandedText}</p>
        <div className="dialog__actions">
          <button type="button" className="btn" onClick={() => setDeleteColumnFor(null)}>keep it</button>
          <button
            type="button"
            className="btn btn--outline-danger"
            onClick={() => {
              removeColumn(deleteColumnFor.id);
              setDeleteColumnFor(null);
            }}
          >
            delete column
          </button>
        </div>
      </dialog>
    </>
  );
}
