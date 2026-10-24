//variables

const clock = document.getElementById("clock");
const startBtn = document.getElementById("start-btn");
const resetBtn = document.getElementById("reset-btn");
const breakBtn = document.getElementById("break-btn");
const phaseLabel = document.getElementById("phase-label");
const todoColumn = document.getElementById("column-todo");
const inProgressColumn = document.getElementById("column-in-progress");
const completedColumn = document.getElementById("column-completed");
const cancelledColumn = document.getElementById("column-cancelled");
const currentTaskLabel = document.getElementById("current-task-label");

let timerId = null;
let currentTaskId = null;
let isRunning = false;
let draggedTaskId = null;
let draggedElement = null;
let justSavedEdit = false;
let currentPhase = "focus";
let completedPomodoros = 0;
let nextTaskId = 2; // task 1 already exists, so the next one starts at 2t
let offsetX = 0;
let offsetY = 0;
let placeholder = document.createElement("div");
placeholder.className = "drop-placeholder";

const tasks = [
  {
    id: 1,
    title: "task 1",
    dueDate: "16/10/2026 | 18h00",
    notes: "add your task description here...",
    subtasks: [
      { text: "subtask 1", done: false },
      { text: "subtask 2", done: false }
    ],
    status: "todo",
    cyclesUsed: 0,
    expanded: false
  }
];



function renderTasks() {
  document.querySelectorAll(".task").forEach(function (card) {
    card.remove();
  });

  tasks.forEach(function (task) {
    const cardHTML = createTaskCardHTML(task);

    if (task.status === "todo") {
      todoColumn.insertAdjacentHTML("beforeend", cardHTML);
    } else if (task.status === "in-progress") {
      inProgressColumn.insertAdjacentHTML("beforeend", cardHTML);
    } else if (task.status === "completed") {
      completedColumn.insertAdjacentHTML("beforeend", cardHTML);
    } else if (task.status === "cancelled") {
      cancelledColumn.insertAdjacentHTML("beforeend", cardHTML);
    }
  });
}

const addTodoBtn = document.getElementById("add-todo-btn");

addTodoBtn.addEventListener("click", function () {
  const inputHTML = `
    <div class="task">
      <div class="task__head">
        <input type="text" id="new-task-input" class="task__head-input" placeholder="task title...">
      </div>
    </div>
  `;
  const todoColumnHead = todoColumn.querySelector(".column__head");
  todoColumnHead.insertAdjacentHTML("afterend", inputHTML);

  const input = document.getElementById("new-task-input");
  input.focus();

  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      const title = input.value.trim();

      if (title !== "") {
        const newTask = {
          id: nextTaskId,
          title: title,
          dueDate: "",
          notes: "",
          subtasks: [],
          status: "todo",
          cyclesUsed: 0,
          expanded: false
        };

        tasks.push(newTask);
        nextTaskId = nextTaskId + 1;
      }

      input.remove();
      renderTasks();
    }

    if (event.key === "Escape") {
      input.remove();
    }
  });
});

renderTasks();

function createTaskCardHTML(task) {
  const dueDateText = task.dueDate === "" ? "not set" : task.dueDate;
  const notesText = task.notes === "" ? "add your task description here..." : task.notes;
  const expandedAttr = task.expanded ? "checked" : "";
  const focusDisabledAttr = task.id === currentTaskId ? "disabled" : "";
  const subtasksHTML = task.subtasks.map(function (subtask, index) {
    const checkedAttr = subtask.done ? "checked" : "";
    return `
      <li class="checklist__item">
        <input type="checkbox" id="task-${task.id}-subtask-${index}" class="checklist__input" hidden ${checkedAttr}>
        <span class="checklist__item-box" data-task-id="${task.id}" data-subtask-index="${index}" data-action="toggle-subtask">${checkedAttr ? "[x]" : "[ ]"}</span>
        <span class="checklist__item-label" data-task-id="${task.id}" data-subtask-index="${index}" data-action="edit-subtask">${subtask.text}</span>
        <span class="subtask__delete" data-task-id="${task.id}" data-subtask-index="${index}">x</span>
      </li>
    `;
  }).join("");

  return `
    <div class="task" data-id="${task.id}">
      <input type="checkbox" id="task-${task.id}-toggle" class="task__toggle" hidden data-task-id="${task.id}" ${expandedAttr}>
      <div class="task__head">
        <span class="task__head-label" data-task-id="${task.id}" data-action="edit-title">${task.title}</span>
        <div class="task__actions">
          <button type="button" class="btn btn--danger" data-task-id="${task.id}" data-action="delete" aria-label="delete task">x</button>
        </div>
      </div>
      <div class="task__body">
        <p class="task__due">due date: ${dueDateText}</p>
        <p class="task__notes" data-task-id="${task.id}" data-action="edit-notes">${notesText}</p>
        <ul class="checklist">
            ${subtasksHTML}
            <li class="checklist__item checklist__item--ghost" data-task-id="${task.id}">
              <span class="checklist__item-label">+ add subtask</span>
            </li>
        </ul>
        <div class="task__footer">
          <button type="button" class="btn btn--primary" data-task-id="${task.id}" data-action="focus" ${focusDisabledAttr}>focus</button>
          <button type="button" class="btn" data-task-id="${task.id}" data-action="finish">finish</button>
        </div>
      </div>
    </div>
  `;
}

console.log(tasks);

function tick() {
  timeLeft = timeLeft - 1;
  updateClockDisplay();

  if (timeLeft <= 0) {
  clearInterval(timerId);
  setRunningState(false);
  if (currentPhase === "focus") {
    completedPomodoros = completedPomodoros + 1;

    if (currentTaskId !== null) {
      const task = tasks.find(function (t) {
        return t.id === currentTaskId;
      });
      task.cyclesUsed = task.cyclesUsed + 1;
    }
  }
  setTimeout(function () {
  if (currentPhase === "focus") {
    switchPhase("break");
  } else {
    if (completedPomodoros % 4 !== 0) {
      switchPhase("focus");
    }
  }
}, 3000);
  }
}

function switchPhase(phase) {
  currentPhase = phase;

  if (phase === "focus") {
    timeLeft = 25 * 60; //25*60 default
    const cycleNumber = (completedPomodoros % 4) + 1;
    phaseLabel.textContent = "//focus | #" + cycleNumber + " of 4";
  } else {
    if (completedPomodoros % 4 === 0) {
      timeLeft = 15 * 60; //15*60 default
    } else {
      timeLeft = 5 * 60; // 5*60 default
    }
    phaseLabel.textContent = "//break";
  }

  updateClockDisplay();
  clearInterval(timerId);
  timerId = setInterval(tick, 1000);
  setRunningState(true);
}

function setRunningState(running) {
  isRunning = running;
  startBtn.textContent = running ? "pause" : "start";
}

startBtn.addEventListener("click", function () {
  if (isRunning) {
    clearInterval(timerId);
    setRunningState(false);
  } else {
    timerId = setInterval(tick, 1000);
    setRunningState(true);
  }
});

resetBtn.addEventListener("click", function () {
  clearInterval(timerId);
  timeLeft = 25 * 60; //25 * 60 default
  updateClockDisplay();
  setRunningState(false);
});

breakBtn.addEventListener("click", function () {
  switchPhase("break");
});

let timeLeft = 25 * 60; // 25 * 60 default

function updateClockDisplay() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const minutesText = String(minutes).padStart(2, "0");
  const secondsText = String(seconds).padStart(2, "0");
  clock.textContent = minutesText + ":" + secondsText;
}

updateClockDisplay();
const cycleNumber = (completedPomodoros % 4) + 1;
phaseLabel.textContent = "//focus | #" + cycleNumber + " of 4";

document.addEventListener("click", function (event) {
  if (event.target.classList.contains("subtask__delete")) {
    const taskId = Number(event.target.dataset.taskId);
    const subtaskIndex = Number(event.target.dataset.subtaskIndex);

    const task = tasks.find(function (t) {
      return t.id === taskId;
    });

    task.subtasks.splice(subtaskIndex, 1);
    renderTasks();
    } else if (event.target.dataset.action === "toggle-subtask") {
    const taskId = Number(event.target.dataset.taskId);
    const subtaskIndex = Number(event.target.dataset.subtaskIndex);

    const task = tasks.find(function (t) {
      return t.id === taskId;
    });

    task.subtasks[subtaskIndex].done = !task.subtasks[subtaskIndex].done;
    renderTasks();
  } else if (event.target.closest(".checklist__item--ghost")) {
    const ghostItem = event.target.closest(".checklist__item--ghost");
    const taskId = Number(ghostItem.dataset.taskId);

    const inputHTML = `<input type="text" class="search__input" placeholder="subtask title...">`;
    ghostItem.insertAdjacentHTML("beforebegin", inputHTML);

    const input = ghostItem.previousElementSibling;
    input.focus();

    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        const text = input.value.trim();

        if (text !== "") {
          const task = tasks.find(function (t) {
            return t.id === taskId;
          });
          task.subtasks.push({ text: text, done: false });
        }

        input.remove();
        renderTasks();
      }

      if (event.key === "Escape") {
        input.remove();
      }
    });
  } else if (event.target.dataset.action === "finish") {
    const taskId = Number(event.target.dataset.taskId);
    const task = tasks.find(function (t) {
      return t.id === taskId;
    });

    if (taskId === currentTaskId && currentPhase === "focus") {
      task.cyclesUsed = task.cyclesUsed + 1;
      clearInterval(timerId);
      setRunningState(false);
    }

    task.status = "completed";
    renderTasks();
} else if (event.target.dataset.action === "delete") {
    const taskId = Number(event.target.dataset.taskId);
    const task = tasks.find(function (t) {
      return t.id === taskId;
    });

    if (task.status === "cancelled") {
      const taskIndex = tasks.indexOf(task);
      tasks.splice(taskIndex, 1);
    } else {
      task.status = "cancelled";
    }

    renderTasks();
} else if (event.target.dataset.action === "focus") {
    const taskId = Number(event.target.dataset.taskId);
    const task = tasks.find(function (t) {
      return t.id === taskId;
    });
    task.status = "in-progress";
    currentTaskId = taskId;
    currentTaskLabel.textContent = "current task: " + task.title;
    renderTasks();
    switchPhase("focus");
  } else if (event.target.dataset.action === "edit-title") {
    const span = event.target;
    const taskId = Number(span.dataset.taskId);
    const task = tasks.find(function (t) {
      return t.id === taskId;
    });

    const card = event.target.closest(".task");
    const toggle = document.getElementById("task-" + card.dataset.id + "-toggle");

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
      if (newTitle !== "") {
        task.title = newTitle;
      }
      justSavedEdit = true;
      renderTasks();
    }

    input.addEventListener("blur", saveTitle);
    input.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        saveTitle();
      }
    });
  } else if (event.target.dataset.action === "edit-notes") {
    const paragraph = event.target;
    const taskId = Number(paragraph.dataset.taskId);
    const task = tasks.find(function (t) {
      return t.id === taskId;
    });

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
    textarea.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        saveNotes();
      }
    });
  } else if (event.target.closest(".task__head") && !event.target.closest(".task__head-label") && !event.target.closest(".task__actions")) {
    if (justSavedEdit) {
      justSavedEdit = false;
      return;
    }
    const card = event.target.closest(".task");
    const toggle = document.getElementById("task-" + card.dataset.id + "-toggle");
    toggle.checked = !toggle.checked;
    toggle.dispatchEvent(new Event("change", { bubbles: true }));
  }
});

document.addEventListener("change", function (event) {
  if (event.target.classList.contains("task__toggle")) {
    const taskId = Number(event.target.dataset.taskId);
    const task = tasks.find(function (t) {
      return t.id === taskId;
    });
    task.expanded = event.target.checked;
  }
});

let dragStartX = 0;
let dragStartY = 0;
let isDraggingCard = false;

document.addEventListener("mousedown", function (event) {
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

    if (deltaX > 5 || deltaY > 5) {
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
  }

  if (isDraggingCard) {
    draggedElement.style.left = (event.clientX - offsetX) + "px";
    draggedElement.style.top = (event.clientY - offsetY) + "px";
    draggedElement.style.top = (event.clientY - offsetY) + "px";

    const elementBelow = document.elementFromPoint(event.clientX, event.clientY);
    const column = elementBelow ? elementBelow.closest(".column") : null;

    if (column) {
      const cardsInColumn = Array.from(column.querySelectorAll(".task")).filter(function (card) {
        return card !== draggedElement;
      });

      let nextCard = null;
      for (let i = 0; i < cardsInColumn.length; i++) {
        const rect = cardsInColumn[i].getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        if (event.clientY < midpoint) {
          nextCard = cardsInColumn[i];
          break;
        }
      }

      if (nextCard) {
        column.insertBefore(placeholder, nextCard);
      } else {
        column.appendChild(placeholder);
      }
    }
  }
});

document.addEventListener("mouseup", function (event) {
  if (draggedElement === null) return;

  if (isDraggingCard) {
    const elementBelow = document.elementFromPoint(event.clientX, event.clientY);
    const column = elementBelow ? elementBelow.closest(".column") : null;

    if (column) {
      const task = tasks.find(function (t) {
        return t.id === draggedTaskId;
      });
      task.status = column.dataset.status;

      const nextCard = placeholder.nextElementSibling;
      const nextTaskId = nextCard ? Number(nextCard.dataset.id) : null;

      const currentIndex = tasks.indexOf(task);
      tasks.splice(currentIndex, 1);

      if (nextTaskId !== null) {
        const nextIndex = tasks.findIndex(function (t) {
          return t.id === nextTaskId;
        });
        tasks.splice(nextIndex, 0, task);
      } else {
        tasks.push(task);
      }

      placeholder.remove();
      renderTasks();
    }
  }

  draggedElement = null;
  draggedTaskId = null;
  isDraggingCard = false;
  document.body.style.userSelect = "";
});