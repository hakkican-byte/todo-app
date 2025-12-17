/*
  Todo List App (Vanilla JS)

  Features:
  - Add tasks
  - Edit tasks (inline)
  - Delete tasks
  - Mark tasks as completed
  - Persist tasks with localStorage

  Data model:
  {
    id: string,
    text: string,
    completed: boolean,
    createdAt: number,
    updatedAt: number
  }
*/

(() => {
  'use strict';

  // ---- DOM helpers ----

  /** @param {string} id */
  const byId = (id) => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Missing element: #${id}`);
    return el;
  };

  const todoForm = byId('todoForm');
  const todoInput = byId('todoInput');
  const todoList = byId('todoList');
  const emptyState = byId('emptyState');
  const itemsLeft = byId('itemsLeft');
  const savedState = byId('savedState');
  const clearCompletedBtn = byId('clearCompletedBtn');
  const clearAllBtn = byId('clearAllBtn');

  // ---- Storage ----

  const STORAGE_KEY = 'todo.tasks.v1';

  /** @returns {Array<any>} */
  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /** @param {Array<any>} tasks */
  function saveTasks(tasks) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  // ---- State ----

  /** @type {Array<{id:string,text:string,completed:boolean,createdAt:number,updatedAt:number}>} */
  let tasks = loadTasks();

  /**
   * Track the currently edited task.
   * Only one task can be edited at a time for a simpler UI.
   * @type {string|null}
   */
  let editingId = null;

  /**
   * Small UX detail: show "Saving..." very briefly when state changes.
   */
  let saveIndicatorTimer = null;

  function flashSavedState() {
    savedState.textContent = 'Saving…';
    if (saveIndicatorTimer) window.clearTimeout(saveIndicatorTimer);
    saveIndicatorTimer = window.setTimeout(() => {
      savedState.textContent = 'Saved';
    }, 350);
  }

  // ---- Utilities ----

  /** @returns {string} */
  function uid() {
    // Short, collision-resistant enough for a small local app.
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }

  /** @param {string} text */
  function normalizeText(text) {
    return text.replace(/\s+/g, ' ').trim();
  }

  /** @param {number} ts */
  function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /** @param {string} s */
  function escapeAttr(s) {
    // Used only for aria-labels etc. (not for HTML injection).
    return s.replace(/"/g, '&quot;');
  }

  function persistAndRender() {
    saveTasks(tasks);
    flashSavedState();
    render();
  }

  // ---- CRUD actions ----

  /** @param {string} text */
  function addTask(text) {
    const cleaned = normalizeText(text);
    if (!cleaned) return;

    const now = Date.now();
    tasks.unshift({
      id: uid(),
      text: cleaned,
      completed: false,
      createdAt: now,
      updatedAt: now,
    });

    editingId = null;
    persistAndRender();
  }

  /** @param {string} id */
  function toggleCompleted(id) {
    tasks = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed, updatedAt: Date.now() } : t));
    persistAndRender();
  }

  /** @param {string} id */
  function deleteTask(id) {
    tasks = tasks.filter((t) => t.id !== id);
    if (editingId === id) editingId = null;
    persistAndRender();
  }

  /** @param {string} id @param {string} nextText */
  function updateTaskText(id, nextText) {
    const cleaned = normalizeText(nextText);
    if (!cleaned) return; // Ignore empty edits; user can delete instead.

    tasks = tasks.map((t) => (t.id === id ? { ...t, text: cleaned, updatedAt: Date.now() } : t));
    editingId = null;
    persistAndRender();
  }

  function clearCompleted() {
    const before = tasks.length;
    tasks = tasks.filter((t) => !t.completed);
    if (tasks.length !== before) persistAndRender();
  }

  function clearAll() {
    tasks = [];
    editingId = null;
    persistAndRender();
  }

  // ---- Rendering ----

  function updateCounts() {
    const remaining = tasks.filter((t) => !t.completed).length;
    const total = tasks.length;

    const label = total === 1 ? 'item' : 'items';
    itemsLeft.textContent = `${remaining} ${label} left`;

    // Button state
    clearCompletedBtn.disabled = tasks.every((t) => !t.completed);
    clearAllBtn.disabled = tasks.length === 0;
  }

  function setEmptyStateVisible(visible) {
    emptyState.hidden = !visible;
  }

  /**
   * Build a single task list item.
   * @param {{id:string,text:string,completed:boolean,createdAt:number,updatedAt:number}} task
   */
  function renderItem(task) {
    const li = document.createElement('li');
    li.className = `item${task.completed ? ' item--completed' : ''}`;
    li.dataset.id = task.id;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'item__check';
    checkbox.checked = task.completed;
    checkbox.setAttribute('aria-label', `Mark as completed: ${escapeAttr(task.text)}`);
    checkbox.dataset.action = 'toggle';

    const content = document.createElement('div');
    content.className = 'item__content';

    const actions = document.createElement('div');
    actions.className = 'item__actions';

    // Inline edit UI
    if (editingId === task.id) {
      const editWrap = document.createElement('div');
      editWrap.className = 'edit';

      const row = document.createElement('div');
      row.className = 'edit__row';

      const input = document.createElement('input');
      input.className = 'edit__input';
      input.type = 'text';
      input.value = task.text;
      input.maxLength = 200;
      input.setAttribute('aria-label', `Edit task: ${escapeAttr(task.text)}`);
      input.dataset.role = 'edit-input';

      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'chip chip--ok';
      saveBtn.textContent = 'Save';
      saveBtn.dataset.action = 'save';

      row.append(input, saveBtn);

      const editActions = document.createElement('div');
      editActions.className = 'edit__actions';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'chip';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.dataset.action = 'cancel';

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'chip chip--danger';
      deleteBtn.textContent = 'Delete';
      deleteBtn.dataset.action = 'delete';

      editActions.append(cancelBtn, deleteBtn);

      editWrap.append(row, editActions);
      content.append(editWrap);

      // Focus the input after insertion.
      queueMicrotask(() => {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      });
    } else {
      const p = document.createElement('p');
      p.className = 'item__text';
      p.textContent = task.text;

      const meta = document.createElement('div');
      meta.className = 'item__meta';
      meta.textContent = task.updatedAt !== task.createdAt ? `Edited • ${formatTime(task.updatedAt)}` : `Added • ${formatTime(task.createdAt)}`;

      content.append(p, meta);

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'chip';
      editBtn.textContent = 'Edit';
      editBtn.dataset.action = 'edit';

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'chip chip--danger';
      deleteBtn.textContent = 'Delete';
      deleteBtn.dataset.action = 'delete';

      actions.append(editBtn, deleteBtn);
    }

    li.append(checkbox, content, actions);
    return li;
  }

  function render() {
    todoList.replaceChildren();

    setEmptyStateVisible(tasks.length === 0);

    for (const task of tasks) {
      todoList.append(renderItem(task));
    }

    updateCounts();
  }

  // ---- Event wiring ----

  // Add task
  todoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addTask(todoInput.value);
    todoInput.value = '';
    todoInput.focus();
  });

  // Clear buttons
  clearCompletedBtn.addEventListener('click', () => clearCompleted());
  clearAllBtn.addEventListener('click', () => {
    if (tasks.length === 0) return;
    // A tiny guard against accidental clicks.
    const ok = window.confirm('Clear all tasks?');
    if (ok) clearAll();
  });

  // List interactions: event delegation (single listener)
  todoList.addEventListener('click', (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const li = target.closest('.item');
    if (!li) return;

    const id = li.dataset.id;
    if (!id) return;

    const action = target.dataset.action;
    if (!action) return;

    if (action === 'toggle') {
      toggleCompleted(id);
      return;
    }

    if (action === 'edit') {
      editingId = id;
      render();
      return;
    }

    if (action === 'cancel') {
      editingId = null;
      render();
      return;
    }

    if (action === 'delete') {
      // In edit mode, delete is more likely intentional.
      const task = tasks.find((t) => t.id === id);
      const ok = task ? window.confirm(`Delete "${task.text}"?`) : true;
      if (ok) deleteTask(id);
      return;
    }

    if (action === 'save') {
      const input = li.querySelector('[data-role="edit-input"]');
      if (input && input instanceof HTMLInputElement) {
        updateTaskText(id, input.value);
      }
      return;
    }
  });

  // Support keyboard "Enter" to save while editing.
  todoList.addEventListener('keydown', (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const li = target.closest('.item');
    if (!li) return;

    const id = li.dataset.id;
    if (!id) return;

    if (target instanceof HTMLInputElement && target.dataset.role === 'edit-input') {
      if (e.key === 'Enter') {
        e.preventDefault();
        updateTaskText(id, target.value);
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        editingId = null;
        render();
      }
    }
  });

  // Keep multiple tabs in sync.
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return;
    tasks = loadTasks();
    editingId = null;
    render();
  });

  // Initial render
  render();
})();
