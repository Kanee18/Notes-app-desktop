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
    const idInput = document.getElementById('telegram-id')
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
            telegram_id: idInput.value
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

    fetchAndDisplayNotes();
});

async function fetchAndDisplayNotes() {
    const kanbanBoard = document.getElementById('kanban-board');
    try {
        const response = await fetch(`${API_BASE_URL}/api/notes`);
        const notes = await response.json();
        
        renderKanbanBoard(notes);
        renderCalendar(notes);

    } catch (error) {
        console.error('Failed to fetch data from API:', error);
        kanbanBoard.innerHTML = '<p>Failed to load data. Ensure the Python API server is running..</p>';
    }
}

function renderKanbanBoard(notes) {
    const kanbanBoard = document.getElementById('kanban-board');
    if(!kanbanBoard) return;
    kanbanBoard.innerHTML = '';
    const columns = {
        'pending': { title: 'Upcoming Tasks', element: createColumn('Upcoming Tasks') },
        'notified': { title: 'Upcoming Tasks', element: null },
        'completed': { title: 'Completed', element: createColumn('Completed') }
    };
    columns.notified.element = columns.pending.element;
    kanbanBoard.appendChild(columns.pending.element);
    kanbanBoard.appendChild(columns.completed.element);
    notes.forEach(note => {
        const card = createTaskCard(note);
        const targetColumn = columns[note.status]?.element || columns.pending.element;
        if(targetColumn && targetColumn.querySelector('.cards-container')) {
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

function createColumn(title) {
    const column = document.createElement('div');
    column.className = 'kanban-column';
    const columnTitle = document.createElement('h3');
    columnTitle.className = 'column-title';
    columnTitle.textContent = title;
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'cards-container';
    column.appendChild(columnTitle);
    column.appendChild(cardsContainer);
    if (title === 'Upcoming Tasks') {
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
    if (note.status === 'completed') {
        card.style.textDecoration = 'line-through';
        card.style.opacity = '0.6';
    }
    const noteColor = getRandomColor();
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
    `;
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