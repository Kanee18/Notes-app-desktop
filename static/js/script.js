// static/js/script.js

const applyTheme = (theme) => {
    document.body.classList.toggle('dark-mode', theme === 'dark');

    document.querySelectorAll('.theme-switcher .theme-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
};
const savedTheme = localStorage.getItem('theme') || 'light';
applyTheme(savedTheme);

const API_BASE_URL = 'http://127.0.0.1:5000';
let calendar = null;
let allTasks = []; // Global variable to store tasks

const socket = io('http://127.0.0.1:5000');
socket.on('notes_updated', (data) => {
    renderKanbanBoard(data.notes);
    renderCalendar(data.notes);
});

document.addEventListener('DOMContentLoaded', () => {
    const syncButton = document.getElementById('sync-button');
    const kanbanBoard = document.getElementById('kanban-board');
    const modal = document.getElementById('add-task-modal');
    const addTaskForm = document.getElementById('add-task-form');
    const cancelButton = document.getElementById('cancel-button');
    const settingsButton = document.getElementById('settings-button');
    const settingsPanel = document.getElementById('settings-panel');
    const settingsOverlay = document.getElementById('settings-overlay');
    const closeSettingsButton = document.getElementById('close-settings-button');
    const themeOptions = document.querySelectorAll('.theme-switcher .theme-option');
    const saveSettingsButton = document.getElementById('save-settings-button');
    const tokenInput = document.getElementById('telegram-token');
    const idInput = document.getElementById('telegram-id');


    const loadSettingsIntoForm = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/settings`);
            const settings = await response.json();
            tokenInput.value = settings.telegram_token || '';
            idInput.value = settings.telegram_id || '';

        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    };

    settingsButton.addEventListener('click', () => {
        openSettings();
        loadSettingsIntoForm();
    });

    saveSettingsButton.addEventListener('click', async () => {
        const newSettings = {
            telegram_token: tokenInput.value,
            telegram_id: idInput.value,

        };
        try {
            const response = await fetch(`${API_BASE_URL}/api/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSettings)
            });
            const result = await response.json();
            alert(result.message);
            closeSettings();
        } catch (error) {
            console.error('Failed to save settings:', error);
            alert('Failed to save settings.');
        }
    });

    const openSettings = () => {
        settingsPanel.classList.add('open');
        settingsOverlay.classList.remove('hidden');
    };
    const closeSettings = () => {
        settingsPanel.classList.remove('open');
        settingsOverlay.classList.add('hidden');
    };

    settingsButton.addEventListener('click', openSettings);
    closeSettingsButton.addEventListener('click', closeSettings);
    settingsOverlay.addEventListener('click', closeSettings);

    themeOptions.forEach(option => {
        option.addEventListener('click', () => {
            const selectedTheme = option.dataset.theme;
            applyTheme(selectedTheme);
            localStorage.setItem('theme', selectedTheme);
            renderCalendar(currentNotes || []);
        });
    });

    const openModal = () => modal.classList.remove('hidden');
    const closeModal = () => { modal.classList.add('hidden'); addTaskForm.reset(); };

    settingsButton.addEventListener('click', () => themeMenu.classList.toggle('hidden'));
    themeOptions.forEach(option => { option.addEventListener('click', () => { const selectedTheme = option.dataset.theme; applyTheme(selectedTheme); localStorage.setItem('theme', selectedTheme); themeMenu.classList.add('hidden'); fetchAndDisplayNotes(); }); });
    syncButton.addEventListener('click', async () => { await fetch(`${API_BASE_URL}/api/sync`, { method: 'POST' }); fetchAndDisplayNotes(); });
    cancelButton.addEventListener('click', closeModal);

    addTaskForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(addTaskForm);
        const taskData = Object.fromEntries(formData.entries());
        try {
            const response = await fetch(`${API_BASE_URL}/api/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to add task');
            }
            closeModal();
            fetchAndDisplayNotes();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    });

    kanbanBoard.addEventListener('click', (event) => {
        if (event.target.classList.contains('add-task-button')) {
            openModal();
        }
        const deleteButton = event.target.closest('.action-delete');
        const completeButton = event.target.closest('.action-complete');
        if (completeButton) { markNoteAsComplete(completeButton.dataset.id); }
        if (deleteButton) { deleteNote(deleteButton.dataset.id); }
    });

    // Page Navigation
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPage = item.dataset.page;

            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Show target page
            document.querySelectorAll('.page-content').forEach(page => {
                page.classList.remove('active');
            });
            document.getElementById(`page-${targetPage}`).classList.add('active');

            // Load notes if going to notes page
            if (targetPage === 'ask-ai') {
                initAskAIPage();
            }
        });
    });

    // Ask AI Page Functionality
    initAskAIPage();

    fetchAndDisplayNotes();
});

async function fetchAndDisplayNotes() {
    const kanbanBoard = document.getElementById('kanban-board');
    try {
        const response = await fetch(`${API_BASE_URL}/api/notes`);
        const notes = await response.json();
        allTasks = notes; // Store global

        renderKanbanBoard(notes);
        renderCalendar(notes);

    } catch (error) {
        console.error('Failed to fetch data from API:', error);
        kanbanBoard.innerHTML = '<p>Failed to load data. Ensure the Python API server is running..</p>';
    }
}

function isOverdue(deadlineTimestamp) {
    const now = Math.floor(Date.now() / 1000);
    return deadlineTimestamp < now;
}

function renderKanbanBoard(notes) {
    const kanbanBoard = document.getElementById('kanban-board');
    if (!kanbanBoard) return;
    kanbanBoard.innerHTML = '';

    // Count tasks by status
    const upcomingCount = notes.filter(n => n.status === 'pending' || n.status === 'notified').length;
    const completedCount = notes.filter(n => n.status === 'completed').length;

    const columns = {
        'pending': { title: 'Upcoming Tasks', element: createColumn('Upcoming Tasks', upcomingCount) },
        'notified': { title: 'Upcoming Tasks', element: null },
        'completed': { title: 'Completed', element: createColumn('Completed', completedCount) }
    };
    columns.notified.element = columns.pending.element;
    kanbanBoard.appendChild(columns.pending.element);
    kanbanBoard.appendChild(columns.completed.element);
    notes.forEach(note => {
        const card = createTaskCard(note);
        const targetColumn = columns[note.status]?.element || columns.pending.element;
        if (targetColumn && targetColumn.querySelector('.cards-container')) {
            targetColumn.querySelector('.cards-container').appendChild(card);
        }
    });
}

function renderCalendar(notes) {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    const events = notes
        .filter(note => note.status !== 'completed' && note.deadline_iso_str)
        .map(note => ({
            title: note.mata_kuliah,
            start: note.deadline_iso_str,
            allDay: true,
            color: '#FF6B6B'
        }));

    if (calendar) {
        calendar.destroy();
    }

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev',
            center: 'title',
            right: 'next'
        },
        height: 'auto',
        events: events,
        eventDisplay: 'dot'
    });

    calendar.render();
}

// setInterval(() => {
//   fetch(`${API_BASE_URL}/api/sync`, { method: 'POST' }).then(() => {
//     fetchAndDisplayNotes();
//   });
// }, 5000);

function createColumn(title, count = 0) {
    const column = document.createElement('div');
    column.className = 'kanban-column';

    const columnHeader = document.createElement('div');
    columnHeader.className = 'column-header';

    const columnTitle = document.createElement('h3');
    columnTitle.className = 'column-title';
    columnTitle.textContent = title;

    const countBadge = document.createElement('span');
    countBadge.className = 'task-count-badge';
    countBadge.textContent = count;

    columnHeader.appendChild(columnTitle);
    columnHeader.appendChild(countBadge);

    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'cards-container';
    column.appendChild(columnHeader);
    column.appendChild(cardsContainer);
    if (title.startsWith('Upcoming')) {
        const addButton = document.createElement('button');
        addButton.className = 'add-task-button';
        addButton.textContent = '+ Add Task';
        column.appendChild(addButton);
    }
    return column;
}

function getRandomColor() { const letters = '0123456789ABCDEF'; let color = '#'; for (let i = 0; i < 6; i++) { color += letters[Math.floor(Math.random() * 16)]; } return color; }

function createTaskCard(note) {
    const card = document.createElement('div');
    card.className = 'task-card';

    const overdue = note.status !== 'completed' && isOverdue(note.deadline_timestamp);
    if (overdue) {
        card.classList.add('overdue');
    }

    if (note.status === 'completed') {
        card.style.textDecoration = 'line-through';
        card.style.opacity = '0.6';
    }
    const noteColor = getRandomColor();

    const overdueIndicator = overdue ? `<div class="overdue-indicator">⚠️ Deadline telah berlalu!</div>` : '';

    card.innerHTML = `
        <div class="card-actions">
            ${note.status !== 'completed' ? `<button class="action-complete" data-id="${note.id}">✓</button>` : ''}
            <button class="action-delete" data-id="${note.id}">🗑️</button>
        </div>
        <div class="card-title-container">
            <span class="color-dot" style="background-color: ${noteColor};"></span>
            <h4 class="card-title">${note.mata_kuliah}</h4>
        </div>
        <p class="card-description">${note.deskripsi_tugas}</p>
        <p class="card-deadline">${note.tanggal_deadline_str}</p>
        ${overdueIndicator}
    `;

    // ADD CLICK LISTENER FOR DETAIL VIEW (only for non-completed tasks)
    card.addEventListener('click', (e) => {
        // Ignore if clicked on buttons
        if (e.target.closest('button')) return;
        // Ignore if task is already completed - no editing allowed
        if (note.status === 'completed') return;
        openViewNoteModal(note.id);
    });

    return card;
}

async function markNoteAsComplete(noteId) {
    try {
        await fetch(`${API_BASE_URL}/api/notes/${noteId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'completed' })
        });
        fetchAndDisplayNotes();
    } catch (error) {
        console.error('Gagal update status:', error);
    }
}

async function deleteNote(noteId) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
        await fetch(`${API_BASE_URL}/api/notes/${noteId}`, { method: 'DELETE' });
        fetchAndDisplayNotes();
    } catch (error) {
        console.error('Failed to delete note:', error);
    }
}

// ==================== ASK AI PAGE FUNCTIONS ====================

let currentTaskForAI = null;

function initAskAIPage() {
    const taskSelector = document.getElementById('task-selector');
    const sendBtn = document.getElementById('send-ai-btn');
    const input = document.getElementById('ai-input');
    const chipBtns = document.querySelectorAll('.suggestion-chip');
    const clearTaskBtn = document.getElementById('clear-task-btn');

    loadTasksForAI();

    // Event Listeners
    if (taskSelector) {
        taskSelector.addEventListener('change', (e) => {
            selectTaskForAI(e.target.value);
        });
    }

    if (sendBtn) {
        sendBtn.addEventListener('click', sendAIMessage);
    }

    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendAIMessage();
            }
        });
    }

    if (clearTaskBtn) {
        clearTaskBtn.addEventListener('click', () => {
            currentTaskForAI = null;
            document.getElementById('task-selector').value = "";
            document.getElementById('selected-task-info').classList.add('hidden');
            document.querySelectorAll('.suggestion-chip').forEach(btn => btn.disabled = true);
        });
    }

    chipBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const prompt = btn.dataset.prompt;
            const inputEl = document.getElementById('ai-input');
            inputEl.value = prompt;
            inputEl.focus(); // Focus on input so user can edit or press Enter
            // Removed: sendAIMessage() - let user review before sending
        });
    });
}

function loadTasksForAI() {
    const selector = document.getElementById('task-selector');
    if (!selector) return;

    // Save current selection
    const currentVal = selector.value;

    selector.innerHTML = '<option value="">-- Pilih tugas yang ingin dibantu --</option>';

    // Filter pending/upcoming tasks
    const upcomingTasks = allTasks.filter(t => t.status === 'pending' || t.status === 'notified');

    upcomingTasks.forEach(task => {
        const option = document.createElement('option');
        option.value = task.id;
        option.textContent = `${task.mata_kuliah} - ${task.deskripsi_tugas.substring(0, 30)}${task.deskripsi_tugas.length > 30 ? '...' : ''}`;
        selector.appendChild(option);
    });

    // Restore selection if still valid
    if (currentVal && upcomingTasks.find(t => t.id === currentVal)) {
        selector.value = currentVal;
    }
}

function selectTaskForAI(taskId) {
    if (!taskId) {
        currentTaskForAI = null;
        document.getElementById('selected-task-info').classList.add('hidden');
        return;
    }

    currentTaskForAI = allTasks.find(t => t.id == taskId); // Use == for loose string/number match if ids are mixed

    if (currentTaskForAI) {
        document.getElementById('selected-task-title').textContent = currentTaskForAI.mata_kuliah;
        document.getElementById('selected-task-desc').textContent = currentTaskForAI.deskripsi_tugas;
        document.getElementById('selected-task-deadline').textContent = `Deadline: ${currentTaskForAI.tanggal_deadline_str || '-'}`;
        document.getElementById('selected-task-info').classList.remove('hidden');

        // Hide welcome message if it's the first interaction
        // document.getElementById('chat-welcome').style.display = 'none'; 
    }
}

async function sendAIMessage() {
    const inputEl = document.getElementById('ai-input');
    const prompt = inputEl.value.trim();
    const chatMessages = document.getElementById('chat-messages');
    const welcome = document.getElementById('chat-welcome');

    if (!prompt) return;

    // Task selection is now OPTIONAL - can chat without selecting task
    // Removed the requirement check

    // Hide welcome screen
    if (welcome) welcome.style.display = 'none';

    // Add User Message
    appendMessage(prompt, 'user');
    inputEl.value = '';

    // Show loading...
    const loadingId = 'loading-' + Date.now();
    appendMessage('Sedang berpikir...', 'ai', loadingId);

    // Build context - only include task info if a task is selected
    let context = '';
    if (currentTaskForAI) {
        context = `Mata Kuliah: ${currentTaskForAI.mata_kuliah}\nDeskripsi: ${currentTaskForAI.deskripsi_tugas}\nDeadline: ${currentTaskForAI.tanggal_deadline_str}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/ask-ai`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: prompt,
                context: context
            })
        });

        const data = await response.json();

        // Remove loading
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();

        if (response.ok) {
            appendMessage(data.response, 'ai');
        } else {
            appendMessage(`Error: ${data.error}`, 'ai');
        }

    } catch (error) {
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();
        appendMessage('Gagal menghubungi server AI.', 'ai');
        console.error(error);
    }
}

function appendMessage(text, sender, id = null) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    if (id) messageDiv.id = id;

    // Create avatar
    let avatar = null;

    // AI PROFILE: "KN" text
    if (sender === 'ai') {
        avatar = document.createElement('div');
        avatar.className = 'message-avatar ai-avatar-text';
        avatar.textContent = 'KN';
    }

    // Create content container
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    // USER MESSAGE: No profile/avatar
    if (sender === 'user') {
        contentDiv.textContent = text;
        messageDiv.appendChild(contentDiv);
        // No avatar appended for user
    }
    // AI MESSAGE: KN Profile + Content
    else {
        if (avatar) messageDiv.appendChild(avatar);
        messageDiv.appendChild(contentDiv);

        // If it's a "Thinking..." or error message, show immediately
        if (id && id.startsWith('loading') || text.startsWith('Error:')) {
            contentDiv.textContent = text;
        } else {
            // Convert Markdown to HTML
            // TRIM whitespace to prevent empty bottom space
            const trimmedText = text.trim();
            const converter = new showdown.Converter();

            // Typewriter logic
            let i = 0;
            const speed = 10; // ms per char (faster is better for long text)

            contentDiv.innerHTML = ''; // Start empty
            const chunkSize = 3; // chars per tick

            function typeWriter() {
                if (i < trimmedText.length) {
                    i += chunkSize;
                    const substring = trimmedText.substring(0, i);
                    contentDiv.innerHTML = converter.makeHtml(substring);
                    chatMessages.scrollTop = chatMessages.scrollHeight; // Auto scroll
                    setTimeout(typeWriter, speed); // recurse
                } else {
                    // Final render to ensure everything is correct
                    contentDiv.innerHTML = converter.makeHtml(trimmedText);

                    // Trigger MathJax to render equations
                    if (window.MathJax) {
                        MathJax.typesetPromise([contentDiv]).catch((err) => console.log('MathJax error:', err));
                    }

                    // ADD COPY BUTTONS TO CODE BLOCKS
                    const preBlocks = contentDiv.querySelectorAll('pre');
                    preBlocks.forEach(pre => {
                        const btn = document.createElement('button');
                        btn.className = 'copy-code-btn';
                        btn.textContent = 'Copy';
                        btn.title = 'Copy Code';

                        btn.addEventListener('click', () => {
                            const code = pre.querySelector('code') ? pre.querySelector('code').innerText : pre.innerText;
                            navigator.clipboard.writeText(code).then(() => {
                                btn.textContent = 'Copied!';
                                btn.classList.add('copied');
                                setTimeout(() => {
                                    btn.textContent = 'Copy';
                                    btn.classList.remove('copied');
                                }, 2000);
                            }).catch(err => console.error('Failed to copy:', err));
                        });

                        pre.appendChild(btn);
                    });
                }
            }
            typeWriter();
        }
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function formatTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ==================== NOTE DETAIL & EDIT FUNCTIONS ====================

function openViewNoteModal(noteId) {
    const note = allTasks.find(n => n.id === noteId);
    if (!note) return;

    document.getElementById('view-note-title').textContent = note.mata_kuliah;
    document.getElementById('view-note-matkul').textContent = note.mata_kuliah;
    document.getElementById('view-note-deadline').textContent = note.tanggal_deadline_str;
    document.getElementById('view-note-desc').textContent = note.deskripsi_tugas;

    // Setup Edit Button
    const editBtn = document.getElementById('btn-edit-note');
    editBtn.onclick = () => {
        closeViewNoteModal();
        openEditNoteModal(noteId);
    };

    const modal = document.getElementById('view-note-modal');
    modal.classList.remove('hidden');
}

function closeViewNoteModal() {
    document.getElementById('view-note-modal').classList.add('hidden');
}

function openEditNoteModal(noteId) {
    const note = allTasks.find(n => n.id === noteId);
    if (!note) return;

    document.getElementById('edit-note-id').value = note.id;
    document.getElementById('edit-note-matkul').value = note.mata_kuliah;
    document.getElementById('edit-note-desc').value = note.deskripsi_tugas;
    document.getElementById('edit-note-deadline').value = note.tanggal_deadline_str;

    const modal = document.getElementById('edit-note-modal');
    modal.classList.remove('hidden');
}

function closeEditNoteModal() {
    document.getElementById('edit-note-modal').classList.add('hidden');
}

async function saveNoteChanges() {
    const noteId = document.getElementById('edit-note-id').value;
    const matkul = document.getElementById('edit-note-matkul').value;
    const desc = document.getElementById('edit-note-desc').value;
    const deadline = document.getElementById('edit-note-deadline').value;

    if (!matkul || !desc || !deadline) {
        alert("Semua field harus diisi!");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mata_kuliah: matkul,
                deskripsi_tugas: desc,
                deadline: deadline
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Gagal update tugas");
        }

        // Success
        closeEditNoteModal();
        fetchAndDisplayNotes(); // Refresh UI
        alert("Tugas berhasil diupdate!");

    } catch (error) {
        alert("Error: " + error.message);
    }
}