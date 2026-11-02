/* ==========================================================================
   madpomo — the board (index.html only)

   Owns the task cards: rendering, editing, status changes, search and
   drag-and-drop. The task array itself lives in MP.tasks (storage.js) because
   the timer needs to read titles out of it too.
   ========================================================================== */

(function () {
  const tasks = MP.tasks;

  const board = document.getElementById("board");

  const searchInput = document.getElementById("search-input");

  const cancelDialog = document.getElementById("cancel-dialog");
  const cancelDialogTask = document.getElementById("cancel-dialog-task");
  const cancelReasonInput = document.getElementById("cancel-reason");
  const deleteDialog = document.getElementById("delete-dialog");
  const deleteDialogTask = document.getElementById("delete-dialog-task");
  const deleteColumnDialog = document.getElementById("delete-column-dialog");
  const deleteColumnName = document.getElementById("delete-column-dialog-name");
  const deleteColumnHint = document.getElementById("delete-column-dialog-hint");

  let justSavedEdit = false;
  let searchTerm = "";
  let pendingCancelId = null;
  let pendingDeleteId = null;
  let pendingColumnId = null;

  /* Text typed by the user goes back into the page as HTML, so it has to be
     escaped — otherwise a single "<" in a note breaks the card. */
  function esc(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function findTask(id) {
    return tasks.find(function (task) {
      return task.id === id;
    });
  }

  function columnFor(status) {
    return board.querySelector('.column[data-status="' + status + '"]');
  }

  /* --------------------------------------------------------------------------
     Due dates: stored as an ISO string (what <input type="datetime-local">
     gives us), shown in the project's own format.
     -------------------------------------------------------------------------- */

  function dueDateText(task) {
    if (!task.dueDate) return "not set";
    const parsed = new Date(task.dueDate);
    if (isNaN(parsed.getTime())) return task.dueDate; // free text from an old save
    return MP.formatDate(parsed) + " | " + MP.formatTime(parsed);
  }

  function dueDateInputValue(task) {
    const parsed = new Date(task.dueDate);
    if (!task.dueDate || isNaN(parsed.getTime())) return "";
    return parsed.getFullYear() + "-" + MP.pad2(parsed.getMonth() + 1) + "-" + MP.pad2(parsed.getDate()) +
      "T" + MP.pad2(parsed.getHours()) + ":" + MP.pad2(parsed.getMinutes());
  }

  /* --------------------------------------------------------------------------
     Status changes — one door in, so the timestamps the report needs are
     always written.
     -------------------------------------------------------------------------- */

  function setStatus(task, status, reason) {
    task.status = status;

    if (status === "completed") {
      task.completedAt = Date.now();
      task.cancelledAt = null;
    } else if (status === "cancelled") {
      task.cancelledAt = Date.now();
      task.completedAt = null;
      if (reason !== undefined) task.cancelReason = reason;
    } else {
      task.completedAt = null;
      task.cancelledAt = null;
    }

    if ((status === "completed" || status === "cancelled") && MP.timer) {
      if (status === "completed") MP.timer.taskFinished(task.id);
      else MP.timer.taskRemoved(task.id);
    }
  }

  /* --------------------------------------------------------------------------
     Render
     -------------------------------------------------------------------------- */

  function matchesSearch(task) {
    if (searchTerm === "") return true;

    const haystack = [task.title, task.notes]
      .concat(task.subtasks.map(function (subtask) { return subtask.text; }))
      .join(" ")
      .toLowerCase();

    return haystack.indexOf(searchTerm) !== -1;
  }

  function createTaskCardHTML(task) {
    const notesText = task.notes === "" ? "add your task description here..." : task.notes;
    const expandedAttr = task.expanded ? "checked" : "";
    const isCurrent = MP.timer !== null && MP.timer.currentTaskId() === task.id;
    const focusDisabledAttr = isCurrent ? "disabled" : "";
    const done = task.status === "completed" || task.status === "cancelled";

    const subtasksHTML = task.subtasks.map(function (subtask, index) {
      return `
        <li class="checklist__item">
          <span class="checklist__item-box" data-task-id="${task.id}" data-subtask-index="${index}" data-action="toggle-subtask">${subtask.done ? "[x]" : "[ ]"}</span>
          <span class="checklist__item-label" data-task-id="${task.id}" data-subtask-index="${index}" data-action="edit-subtask">${esc(subtask.text)}</span>
          <span class="subtask__delete" data-task-id="${task.id}" data-subtask-index="${index}">x</span>
        </li>
      `;
    }).join("");

    const reasonHTML = task.status === "cancelled" && task.cancelReason
      ? `<p class="task__reason">cancelled: ${esc(task.cancelReason)}</p>`
      : "";

    const cyclesHTML = task.cyclesUsed > 0
      ? `<p class="task__cycles">${task.cyclesUsed} pomodoro${task.cyclesUsed === 1 ? "" : "s"} done</p>`
      : "";

    /* The red slot is always the last button: "cancel" everywhere, except in
       the cancelled column where the only thing left to do is delete. */
    const redButton = task.status === "cancelled"
      ? `<button type="button" class="btn btn--outline-danger" data-task-id="${task.id}" data-action="delete">delete</button>`
      : `<button type="button" class="btn btn--outline-danger" data-task-id="${task.id}" data-action="cancel">cancel</button>`;

    const footerHTML = done
      ? `
        <div class="task__footer">
          <button type="button" class="btn" data-task-id="${task.id}" data-action="reopen">reopen</button>
          ${redButton}
        </div>
      `
      : `
        <div class="task__footer">
          <button type="button" class="btn btn--primary" data-task-id="${task.id}" data-action="focus" ${focusDisabledAttr}>focus</button>
          <button type="button" class="btn" data-task-id="${task.id}" data-action="finish">finish</button>
          ${redButton}
        </div>
      `;

    return `
      <div class="task${isCurrent ? " task--current" : ""}" data-id="${task.id}">
        <input type="checkbox" id="task-${task.id}-toggle" class="task__toggle" hidden data-task-id="${task.id}" ${expandedAttr}>
        <div class="task__head">
          <span class="task__head-label" data-task-id="${task.id}" data-action="edit-title">${esc(task.title)}</span>
          <div class="task__actions">
            <button type="button" class="btn btn--icon btn--minimize" data-task-id="${task.id}" data-action="collapse" aria-label="minimize task">_</button>
          </div>
        </div>
        <div class="task__body">
          <p class="task__due" data-task-id="${task.id}" data-action="edit-due">due date: ${esc(dueDateText(task))}</p>
          ${reasonHTML}
          <p class="task__notes" data-task-id="${task.id}" data-action="edit-notes">${esc(notesText)}</p>
          <ul class="checklist">
              ${subtasksHTML}
              <li class="checklist__item checklist__item--ghost" data-task-id="${task.id}">
                <span class="checklist__item-label">+ add subtask</span>
              </li>
          </ul>
          ${cyclesHTML}
          ${footerHTML}
        </div>
      </div>
    `;
  }

  /* The id doubles as the add button's id, so the built-in columns keep the
     ids the tutorial points at (#add-todo-btn, #add-in-progress-btn). */
  function createColumnHTML(column) {
    const tools = [];

    if (column.kind === "open") {
      tools.push(
        '<button type="button" class="btn btn--icon" aria-label="add task" ' +
        'id="add-' + column.id + '-btn" data-action="add-task">+</button>'
      );
    }

    if (!column.fixed) {
      tools.push(
        '<button type="button" class="btn btn--icon" aria-label="delete column" ' +
        'data-action="delete-column">x</button>'
      );
    }

    return (
      '<div class="column" id="column-' + column.id + '" data-status="' + esc(column.id) + '">' +
        '<div class="column__head">' +
          '<div class="column__title">' + esc(column.name) +
            ' <span class="column__count">(0)</span>' +
          '</div>' +
          '<div class="column__tools">' + tools.join("") + '</div>' +
        '</div>' +
      '</div>'
    );
  }

  /* Only run when the set of columns changes: it throws away the board, so
     anything half-typed inside it goes with it. */
  function renderColumns() {
    board.innerHTML = MP.columns.map(createColumnHTML).join("");
  }

  let rendering = false;

  function renderTasks() {
    rendering = true;
    MP.saveTasks();

    document.querySelectorAll(".task").forEach(function (card) {
      card.remove();
    });

    const counts = {};
    MP.columns.forEach(function (column) {
      counts[column.id] = 0;
    });

    tasks.forEach(function (task) {
      if (!matchesSearch(task)) return;

      const column = columnFor(task.status);
      if (!column) return;

      counts[task.status] = (counts[task.status] || 0) + 1;
      column.insertAdjacentHTML("beforeend", createTaskCardHTML(task));
    });

    MP.columns.forEach(function (column) {
      const el = columnFor(column.id);
      const label = el ? el.querySelector(".column__count") : null;
      if (label) label.textContent = "(" + counts[column.id] + ")";
    });

    MP.dataChanged();
    rendering = false;
  }

  /* Redraw when something outside the board changes a task — the timer bumps
     cyclesUsed when a pomodoro lands. The flag stops the loop, since
     renderTasks itself announces the change for the sidebar. */
  MP.onDataChanged(function () {
    if (rendering) return;
    renderTasks();
  });

  /* --------------------------------------------------------------------------
     Adding tasks
     -------------------------------------------------------------------------- */

  function startNewTask(column, status) {
    const existing = document.getElementById("new-task-input");
    if (existing) existing.remove();

    const inputHTML = `
      <div class="task">
        <div class="task__head">
          <input type="text" id="new-task-input" class="task__head-input" placeholder="task title...">
        </div>
      </div>
    `;

    const head = column.querySelector(".column__head");
    head.insertAdjacentHTML("afterend", inputHTML);

    const input = document.getElementById("new-task-input");
    input.focus();

    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        const title = input.value.trim();

        if (title !== "") {
          tasks.push(MP.normalizeTask({
            id: MP.nextTaskId,
            title: title,
            status: status,
            createdAt: Date.now()
          }));
          MP.nextTaskId = MP.nextTaskId + 1;
        }

        input.remove();
        renderTasks();
      }

      if (event.key === "Escape") {
        input.closest(".task").remove();
      }
    });

    input.addEventListener("blur", function () {
      const card = input.closest(".task");
      if (card) card.remove();
    });
  }

  /* The column heads are redrawn whenever the columns change, so their
     buttons are caught on the way up instead of being bound one by one. */
  board.addEventListener("click", function (event) {
    const addButton = event.target.closest('[data-action="add-task"]');
    if (addButton) {
      const column = addButton.closest(".column");
      startNewTask(column, column.dataset.status);
      return;
    }

    const deleteButton = event.target.closest('[data-action="delete-column"]');
    if (deleteButton) {
      openDeleteColumnDialog(deleteButton.closest(".column").dataset.status);
    }
  });

  /* --------------------------------------------------------------------------
     Adding and deleting columns

     A new column is typed in place, the same way a new task is: a draft
     column with an input where its name goes. It lands after the last open
     column, so completed and cancelled stay on the right where finish and
     cancel put things.
     -------------------------------------------------------------------------- */

  function openColumnCount() {
    return MP.columns.filter(function (column) {
      return column.kind === "open";
    }).length;
  }

  function startNewColumn() {
    const existing = document.getElementById("new-column-input");
    if (existing) {
      existing.focus();
      return;
    }

    const draft = document.createElement("div");
    draft.className = "column column--draft";
    draft.innerHTML =
      '<div class="column__head">' +
        '<input type="text" id="new-column-input" class="column__name-input" ' +
        'placeholder="column name..." aria-label="name the new column">' +
      '</div>';

    /* Before the first column that is not an open one, i.e. before completed. */
    const columnElements = Array.from(board.querySelectorAll(".column"));
    const firstClosed = columnElements[openColumnCount()] || null;
    if (firstClosed) board.insertBefore(draft, firstClosed);
    else board.appendChild(draft);

    const input = draft.querySelector("input");
    input.focus();
    draft.scrollIntoView({ block: "nearest", inline: "end", behavior: "smooth" });

    /* Taking the input out of the page blurs it, which would call this a
       second time, so the draft is only ever settled once. */
    let settled = false;

    function closeDraft() {
      if (settled) return false;
      settled = true;
      input.removeEventListener("blur", closeDraft);
      if (draft.parentNode) draft.remove();
      return true;
    }

    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        const name = input.value.trim();
        if (name === "") {
          closeDraft();
          return;
        }

        const column = {
          id: "col-" + Date.now().toString(36),
          name: name,
          kind: "open",
          fixed: false
        };

        MP.columns.splice(openColumnCount(), 0, column);
        MP.saveColumns();

        closeDraft();
        renderColumns();
        renderTasks();
      }

      if (event.key === "Escape") closeDraft();
    });

    input.addEventListener("blur", closeDraft);
  }

  const addColumnBtn = document.getElementById("add-column-btn");
  if (addColumnBtn) addColumnBtn.addEventListener("click", startNewColumn);

  function openDeleteColumnDialog(id) {
    const column = MP.columnById(id);
    if (!column || column.fixed) return;

    const stranded = tasks.filter(function (task) {
      return task.status === id;
    }).length;

    const fallback = MP.columnById(MP.firstOpenColumn());

    pendingColumnId = id;
    deleteColumnName.textContent = column.name;
    deleteColumnHint.textContent = stranded === 0
      ? "the column is empty, so nothing moves."
      : stranded + (stranded === 1 ? " task moves" : " tasks move") +
        " back to " + (fallback ? fallback.name : "to do") + ". no work is deleted.";

    deleteColumnDialog.showModal();
  }

  function closeDeleteColumnDialog() {
    pendingColumnId = null;
    deleteColumnDialog.close();
  }

  document.getElementById("delete-column-keep").addEventListener("click", closeDeleteColumnDialog);

  document.getElementById("delete-column-confirm").addEventListener("click", function () {
    const id = pendingColumnId;
    if (id === null) return;

    MP.columns = MP.columns.filter(function (column) {
      return column.id !== id;
    });
    MP.saveColumns();

    /* The tasks outlive the column they were in. */
    const fallback = MP.firstOpenColumn();
    tasks.forEach(function (task) {
      if (task.status === id) task.status = fallback;
    });

    closeDeleteColumnDialog();
    renderColumns();
    renderTasks();
  });

  /* --------------------------------------------------------------------------
     Search
     -------------------------------------------------------------------------- */

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      searchTerm = searchInput.value.trim().toLowerCase();
      renderTasks();
    });
  }

  /* "/" focuses the search box, like the placeholder promises. */
  document.addEventListener("keydown", function (event) {
    if (event.key !== "/") return;
    const tag = document.activeElement ? document.activeElement.tagName : "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (!searchInput) return;
    event.preventDefault();
    searchInput.focus();
  });

  /* --------------------------------------------------------------------------
     Cancel / delete dialogs
     -------------------------------------------------------------------------- */

  function openCancelDialog(task) {
    pendingCancelId = task.id;
    cancelDialogTask.textContent = task.title;
    cancelReasonInput.value = task.cancelReason || "";
    cancelDialog.showModal();
    cancelReasonInput.focus();
  }

  function openDeleteDialog(task) {
    pendingDeleteId = task.id;
    deleteDialogTask.textContent = task.title;
    deleteDialog.showModal();
  }

  if (cancelDialog) {
    document.getElementById("cancel-dialog-keep").addEventListener("click", function () {
      pendingCancelId = null;
      cancelDialog.close();
    });

    document.getElementById("cancel-dialog-confirm").addEventListener("click", function () {
      const task = findTask(pendingCancelId);
      if (task) setStatus(task, "cancelled", cancelReasonInput.value.trim());
      pendingCancelId = null;
      cancelDialog.close();
      renderTasks();
    });
  }

  if (deleteDialog) {
    document.getElementById("delete-dialog-keep").addEventListener("click", function () {
      pendingDeleteId = null;
      deleteDialog.close();
    });

    document.getElementById("delete-dialog-confirm").addEventListener("click", function () {
      const task = findTask(pendingDeleteId);
      if (task) {
        if (MP.timer) MP.timer.taskRemoved(task.id);
        tasks.splice(tasks.indexOf(task), 1);
      }
      pendingDeleteId = null;
      deleteDialog.close();
      renderTasks();
    });
  }

  /* --------------------------------------------------------------------------
     One click listener for the whole board (event delegation)
     -------------------------------------------------------------------------- */

  document.addEventListener("click", function (event) {
    const action = event.target.dataset ? event.target.dataset.action : undefined;
    const taskId = event.target.dataset && event.target.dataset.taskId !== undefined
      ? Number(event.target.dataset.taskId)
      : null;

    if (event.target.classList.contains("subtask__delete")) {
      const task = findTask(taskId);
      task.subtasks.splice(Number(event.target.dataset.subtaskIndex), 1);
      renderTasks();
      return;
    }

    if (action === "toggle-subtask") {
      const task = findTask(taskId);
      const index = Number(event.target.dataset.subtaskIndex);
      task.subtasks[index].done = !task.subtasks[index].done;
      renderTasks();
      return;
    }

    if (event.target.closest(".checklist__item--ghost")) {
      const ghostItem = event.target.closest(".checklist__item--ghost");
      const id = Number(ghostItem.dataset.taskId);

      const inputHTML = `<input type="text" class="search__input" placeholder="subtask title...">`;
      ghostItem.insertAdjacentHTML("beforebegin", inputHTML);

      const input = ghostItem.previousElementSibling;
      input.focus();

      input.addEventListener("keydown", function (keyEvent) {
        if (keyEvent.key === "Enter") {
          const text = input.value.trim();
          if (text !== "") findTask(id).subtasks.push({ text: text, done: false });
          input.remove();
          renderTasks();
        }

        if (keyEvent.key === "Escape") input.remove();
      });
      return;
    }

    if (action === "edit-subtask") {
      const span = event.target;
      const task = findTask(taskId);
      const index = Number(span.dataset.subtaskIndex);

      const input = document.createElement("input");
      input.type = "text";
      input.className = "search__input";
      input.value = task.subtasks[index].text;
      span.replaceWith(input);
      input.focus();

      function saveSubtask() {
        const text = input.value.trim();
        if (text !== "") task.subtasks[index].text = text;
        justSavedEdit = true;
        renderTasks();
      }

      input.addEventListener("blur", saveSubtask);
      input.addEventListener("keydown", function (keyEvent) {
        if (keyEvent.key === "Enter" || keyEvent.key === "Escape") saveSubtask();
      });
      return;
    }

    if (action === "finish") {
      const task = findTask(taskId);
      setStatus(task, "completed");
      renderTasks();
      return;
    }

    if (action === "reopen") {
      const task = findTask(taskId);
      setStatus(task, "todo");
      task.cancelReason = "";
      renderTasks();
      return;
    }

    if (action === "cancel") {
      openCancelDialog(findTask(taskId));
      return;
    }

    if (action === "delete") {
      openDeleteDialog(findTask(taskId));
      return;
    }

    if (action === "collapse") {
      const card = event.target.closest(".task");
      const toggle = document.getElementById("task-" + card.dataset.id + "-toggle");
      toggle.checked = false;
      toggle.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }

    if (action === "focus") {
      const task = findTask(taskId);

      /* Starting a pomodoro on a task means it is being worked on now, from
         whichever waiting column it sat in. A task already finished or
         cancelled stays where it is. */
      const from = MP.columnById(task.status);
      if (from && from.kind === "open" && task.status !== "in-progress") {
        setStatus(task, "in-progress");
      }
      if (MP.timer) MP.timer.focusTask(taskId);
      renderTasks();
      return;
    }

    if (action === "edit-title") {
      const span = event.target;
      const task = findTask(taskId);
      const card = span.closest(".task");
      const toggle = document.getElementById("task-" + card.dataset.id + "-toggle");

      // First click on a collapsed card opens it; editing needs a second click.
      if (!toggle.checked) {
        toggle.checked = true;
        toggle.dispatchEvent(new Event("change", { bubbles: true }));
        return;
      }

      const input = document.createElement("input");
      input.type = "text";
      input.className = "task__head-input";
      input.value = task.title;
      span.replaceWith(input);
      input.focus();

      function saveTitle() {
        const newTitle = input.value.trim();
        if (newTitle !== "") task.title = newTitle;
        justSavedEdit = true;
        renderTasks();
        if (MP.timer) MP.timer.render();
      }

      input.addEventListener("blur", saveTitle);
      input.addEventListener("keydown", function (keyEvent) {
        if (keyEvent.key === "Enter" || keyEvent.key === "Escape") saveTitle();
      });
      return;
    }

    if (action === "edit-notes") {
      const paragraph = event.target;
      const task = findTask(taskId);

      const textarea = document.createElement("textarea");
      textarea.className = "task__notes-input";
      textarea.value = task.notes;
      paragraph.replaceWith(textarea);
      textarea.focus();

      function saveNotes() {
        task.notes = textarea.value.trim();
        justSavedEdit = true;
        renderTasks();
      }

      textarea.addEventListener("blur", saveNotes);
      textarea.addEventListener("keydown", function (keyEvent) {
        if (keyEvent.key === "Escape") saveNotes();
      });
      return;
    }

    if (action === "edit-due") {
      const paragraph = event.target;
      const task = findTask(taskId);

      const input = document.createElement("input");
      input.type = "datetime-local";
      input.className = "task__due-input";
      input.value = dueDateInputValue(task);
      paragraph.replaceWith(input);
      input.focus();

      function saveDue() {
        task.dueDate = input.value === "" ? "" : new Date(input.value).toISOString();
        justSavedEdit = true;
        renderTasks();
      }

      input.addEventListener("blur", saveDue);
      input.addEventListener("keydown", function (keyEvent) {
        if (keyEvent.key === "Enter" || keyEvent.key === "Escape") saveDue();
      });
      return;
    }

    // Clicking the empty part of a card's head expands or collapses it.
    if (event.target.closest(".task__head") &&
        !event.target.closest(".task__head-label") &&
        !event.target.closest(".task__actions")) {
      if (justSavedEdit) {
        justSavedEdit = false;
        return;
      }

      const card = event.target.closest(".task");
      if (!card.dataset.id) return;
      const toggle = document.getElementById("task-" + card.dataset.id + "-toggle");
      toggle.checked = !toggle.checked;
      toggle.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });

  document.addEventListener("change", function (event) {
    if (!event.target.classList.contains("task__toggle")) return;
    const task = findTask(Number(event.target.dataset.taskId));
    if (!task) return;
    task.expanded = event.target.checked;
    MP.saveTasks();
  });

  /* --------------------------------------------------------------------------
     Drag and drop — mouse-tracked, not the native HTML5 API
     -------------------------------------------------------------------------- */

  const placeholder = document.createElement("div");
  placeholder.className = "drop-placeholder";

  let draggedElement = null;
  let draggedTaskId = null;
  let dragStartX = 0;
  let dragStartY = 0;
  let offsetX = 0;
  let offsetY = 0;
  let isDraggingCard = false;

  document.addEventListener("mousedown", function (event) {
    // Controls inside a card must keep working, so they never start a drag.
    if (event.target.closest("button, input, textarea, .checklist__item, .task__notes, .task__due")) return;

    const card = event.target.closest(".task");
    if (!card || !card.dataset.id) return;

    document.body.style.userSelect = "none";
    draggedElement = card;
    draggedTaskId = Number(card.dataset.id);
    dragStartX = event.clientX;
    dragStartY = event.clientY;
  });

  document.addEventListener("mousemove", function (event) {
    if (draggedElement === null) return;

    if (!isDraggingCard) {
      const deltaX = Math.abs(event.clientX - dragStartX);
      const deltaY = Math.abs(event.clientY - dragStartY);
      if (deltaX <= 5 && deltaY <= 5) return;

      isDraggingCard = true;

      const rect = draggedElement.getBoundingClientRect();
      offsetX = dragStartX - rect.left;
      offsetY = dragStartY - rect.top;

      draggedElement.style.position = "fixed";
      draggedElement.style.zIndex = "1000";
      draggedElement.style.width = rect.width + "px";
      draggedElement.style.left = rect.left + "px";
      draggedElement.style.top = rect.top + "px";
      draggedElement.style.pointerEvents = "none";
    }

    draggedElement.style.left = (event.clientX - offsetX) + "px";
    draggedElement.style.top = (event.clientY - offsetY) + "px";

    const elementBelow = document.elementFromPoint(event.clientX, event.clientY);
    const column = elementBelow ? elementBelow.closest(".column") : null;
    if (!column) return;

    const cardsInColumn = Array.from(column.querySelectorAll(".task")).filter(function (card) {
      return card !== draggedElement;
    });

    let nextCard = null;
    for (let i = 0; i < cardsInColumn.length; i = i + 1) {
      const rect = cardsInColumn[i].getBoundingClientRect();
      if (event.clientY < rect.top + rect.height / 2) {
        nextCard = cardsInColumn[i];
        break;
      }
    }

    if (nextCard) column.insertBefore(placeholder, nextCard);
    else column.appendChild(placeholder);
  });

  document.addEventListener("mouseup", function (event) {
    if (draggedElement === null) return;

    if (isDraggingCard) {
      const elementBelow = document.elementFromPoint(event.clientX, event.clientY);
      const column = elementBelow ? elementBelow.closest(".column") : null;

      if (column) {
        const task = findTask(draggedTaskId);
        if (task.status !== column.dataset.status) setStatus(task, column.dataset.status);

        const nextCard = placeholder.nextElementSibling;
        const nextId = nextCard && nextCard.dataset.id ? Number(nextCard.dataset.id) : null;

        tasks.splice(tasks.indexOf(task), 1);

        if (nextId !== null) {
          tasks.splice(tasks.findIndex(function (t) { return t.id === nextId; }), 0, task);
        } else {
          tasks.push(task);
        }
      }

      placeholder.remove();
      renderTasks();
    }

    draggedElement = null;
    draggedTaskId = null;
    isDraggingCard = false;
    document.body.style.userSelect = "";
  });

  /* --------------------------------------------------------------------------
     Go
     -------------------------------------------------------------------------- */

  renderColumns();
  renderTasks();
})();
