document.addEventListener('DOMContentLoaded', function() {
    // Dark mode init
    initDarkMode();

    // Tasks page functionality
    if (document.getElementById('taskForm')) {
        const taskForm = document.getElementById('taskForm');
        const tasksContainer = document.getElementById('tasks');

        taskForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const title = document.getElementById('title').value;
            const description = document.getElementById('description').value;
            const dueDate = document.getElementById('due_date').value;
            const category = document.getElementById('category').value;
            const priority = document.getElementById('priority').value;

            fetch('/api/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title,
                    description,
                    due_date: dueDate,
                    category,
                    priority
                })
            })
            .then(response => response.json())
            .then(task => {
                addTaskToDOM(task, true);
                taskForm.reset();
                showToast('Task added');
                updateProgress();
            })
            .catch(error => console.error('Error:', error));
        });

        document.getElementById('applyFilters').addEventListener('click', function() {
            loadTasks();
        });

        document.getElementById('search').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                loadTasks();
            }
        });

        loadTasks();
    }

    // Completed tasks page functionality
    if (document.getElementById('completed-tasks')) {
        const applyBtn = document.getElementById('applyFiltersCompleted');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => loadCompletedTasks());
        }
        loadCompletedTasks();
    }

    // Profile page functionality
    if (document.getElementById('total-tasks')) {
        loadProfileStats();
    }
});

function loadTasks() {
    const q = document.getElementById('search')?.value || '';
    const category = document.getElementById('filterCategory')?.value || '';
    const priority = document.getElementById('filterPriority')?.value || '';
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category) params.set('category', category);
    if (priority) params.set('priority', priority);

    fetch(`/api/tasks?${params.toString()}`)
        .then(response => response.json())
        .then(tasks => {
            const tasksContainer = document.getElementById('tasks');
            tasksContainer.innerHTML = '';

            if (tasks.length === 0) {
                tasksContainer.innerHTML = '<p class="text-muted">No tasks yet. Add your first task above!</p>';
                updateProgress();
                return;
            }

            tasks.forEach(task => addTaskToDOM(task));
            updateProgress();
        })
        .catch(error => console.error('Error:', error));
}

function loadCompletedTasks() {
    const q = document.getElementById('searchCompleted')?.value || '';
    const category = document.getElementById('filterCategoryCompleted')?.value || '';
    const priority = document.getElementById('filterPriorityCompleted')?.value || '';
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category) params.set('category', category);
    if (priority) params.set('priority', priority);

    fetch(`/api/completed_tasks?${params.toString()}`)
        .then(response => response.json())
        .then(tasks => {
            const tasksContainer = document.getElementById('completed-tasks');
            tasksContainer.innerHTML = '';

            if (tasks.length === 0) {
                tasksContainer.innerHTML = '<p class="text-muted">No completed tasks yet.</p>';
                return;
            }

            tasks.forEach(task => addCompletedTaskToDOM(task));
        })
        .catch(error => console.error('Error:', error));
}

function addTaskToDOM(task, animate=false) {
    const tasksContainer = document.getElementById('tasks');
    const col = document.createElement('div');
    col.className = 'col';
    col.id = `task-${task.id}`;

    const dueDate = task.due_date ? new Date(task.due_date).toLocaleString() : 'No due date';
    const badgeClass = task.priority === 'High' ? 'bg-danger' : (task.priority === 'Low' ? 'bg-secondary' : 'bg-primary');

    col.innerHTML = `
        <div class="card h-100 shadow-sm">
            <div class="card-body d-flex flex-column">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h5 class="card-title mb-0">${escapeHtml(task.title)}</h5>
                    <span class="badge ${badgeClass}">${escapeHtml(task.priority || 'Medium')}</span>
                </div>
                <p class="card-text text-muted small mb-2">${escapeHtml(task.description || 'No description')}</p>
                <div class="d-flex flex-wrap gap-2 mb-3">
                    <span class="badge text-bg-info">${escapeHtml(task.category || 'Personal')}</span>
                    <span class="badge text-bg-light"><i class="bi bi-clock"></i> ${dueDate}</span>
                </div>
                <div class="mt-auto d-flex gap-2">
                    <button class="btn btn-success btn-sm" onclick="completeTask(${task.id})">Complete</button>
                    <button class="btn btn-outline-secondary btn-sm" onclick="editTask(${task.id})">Edit</button>
                    <button class="btn btn-outline-danger btn-sm" onclick="deleteTask(${task.id})">Delete</button>
                </div>
            </div>
        </div>
    `;

    tasksContainer.appendChild(col);
    if (animate && window.gsap) {
        gsap.from(col, {duration: 0.4, y: 12, opacity: 0, ease: 'power2.out'});
    }
}

function addCompletedTaskToDOM(task) {
    const tasksContainer = document.getElementById('completed-tasks');
    const col = document.createElement('div');
    col.className = 'col';
    col.id = `task-${task.id}`;

    const dueDate = task.due_date ? new Date(task.due_date).toLocaleString() : 'No due date';

    col.innerHTML = `
        <div class="card h-100 border-success-subtle">
            <div class="card-body d-flex flex-column">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h5 class="card-title mb-0">${escapeHtml(task.title)}</h5>
                    <span class="badge text-bg-success">Completed</span>
                </div>
                <p class="card-text text-muted small mb-2">${escapeHtml(task.description || 'No description')}</p>
                <div class="d-flex flex-wrap gap-2 mb-3">
                    <span class="badge text-bg-info">${escapeHtml(task.category || 'Personal')}</span>
                    <span class="badge text-bg-light">${dueDate}</span>
                </div>
                <div class="mt-auto d-flex gap-2">
                    <button class="btn btn-outline-secondary btn-sm" onclick="reopenTask(${task.id})">Reopen</button>
                    <button class="btn btn-outline-danger btn-sm" onclick="deleteTask(${task.id})">Delete</button>
                </div>
            </div>
        </div>
    `;

    tasksContainer.appendChild(col);
}

function completeTask(taskId) {
    fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            completed: true
        })
    })
    .then(response => response.json())
    .then(() => {
                const el = document.getElementById(`task-${taskId}`);
                if (el && window.gsap) {
                    gsap.to(el, {duration: 0.25, y: -10, opacity: 0, onComplete: () => el.remove()});
                } else if (el) {
                    el.remove();
                }
                showToast('Task completed');
                loadTasks();
    })
    .catch(error => console.error('Error:', error));
}

function reopenTask(taskId) {
    fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            completed: false
        })
    })
    .then(response => response.json())
    .then(() => {
        document.getElementById(`task-${taskId}`).remove();
                showToast('Task reopened');
                loadCompletedTasks();
                // Also refresh pending list if available
                if (document.getElementById('tasks')) {
                    loadTasks();
                }
    })
    .catch(error => console.error('Error:', error));
}

function editTask(taskId) {
    const taskElement = document.getElementById(`task-${taskId}`);
    const title = taskElement.querySelector('.card-title').textContent;
    const description = taskElement.querySelector('.card-text').textContent;
    
    const newTitle = prompt('Edit title:', title);
    if (newTitle === null) return;
    
    const newDescription = prompt('Edit description:', description);
    
    fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            title: newTitle,
            description: newDescription
        })
    })
    .then(response => response.json())
    .then(() => {
        showToast('Task updated');
        loadTasks();
    })
    .catch(error => console.error('Error:', error));
}

function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(() => {
                const el = document.getElementById(`task-${taskId}`);
                if (el && window.gsap) {
                    gsap.to(el, {duration: 0.25, x: 20, opacity: 0, onComplete: () => el.remove()});
                } else if (el) {
                    el.remove();
                }
                showToast('Task deleted');
                updateProgress();
    })
    .catch(error => console.error('Error:', error));
}

function loadProfileStats() {
    fetch('/api/stats')
        .then(res => res.json())
        .then(stat => {
            document.getElementById('total-tasks').textContent = stat.total;
            document.getElementById('completed-tasks').textContent = stat.completed;
            document.getElementById('pending-tasks').textContent = stat.pending;
        })
        .catch(error => console.error('Error:', error));
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Toasts using Bootstrap 5
function showToast(message) {
    const container = document.getElementById('toastContainer');
    const toastEl = document.createElement('div');
    toastEl.className = 'toast align-items-center text-bg-dark border-0';
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');
    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${escapeHtml(message)}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    container.appendChild(toastEl);
    const toast = new bootstrap.Toast(toastEl, { delay: 2000 });
    toast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

// Dark mode toggle using Bootstrap's data-bs-theme
function initDarkMode() {
    const body = document.body;
    const toggle = document.getElementById('darkModeToggle');
    const saved = localStorage.getItem('theme') || 'light';
    body.setAttribute('data-bs-theme', saved);
    if (saved === 'dark' && toggle) toggle.checked = true;
    updateBodyBg(saved);
    if (toggle) {
        toggle.addEventListener('change', () => {
            const mode = toggle.checked ? 'dark' : 'light';
            body.setAttribute('data-bs-theme', mode);
            localStorage.setItem('theme', mode);
            updateBodyBg(mode);
        });
    }
}

function updateBodyBg(mode) {
    if (mode === 'dark') {
        document.body.classList.remove('bg-light');
        document.body.classList.add('bg-dark');
    } else {
        document.body.classList.add('bg-light');
        document.body.classList.remove('bg-dark');
    }
}

function updateProgress() {
    fetch('/api/stats')
        .then(res => res.json())
        .then(stat => {
            const pct = Math.round(stat.percent);
            const bar = document.getElementById('progressBar');
            const barM = document.getElementById('progressBarMobile');
            if (bar) {
                bar.style.width = pct + '%';
                bar.textContent = pct + '%';
            }
            if (barM) {
                barM.style.width = pct + '%';
                barM.textContent = pct + '%';
            }
        });
}