// タスク管理アプリのメインJavaScriptファイル

class TaskManager {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        this.currentFilter = 'all';
        this.editingTaskId = null;
        
        this.initializeElements();
        this.bindEvents();
        this.renderTasks();
        this.updateTaskCount();
    }

    initializeElements() {
        this.taskInput = document.getElementById('taskInput');
        this.addTaskBtn = document.getElementById('addTaskBtn');
        this.taskList = document.getElementById('taskList');
        this.emptyState = document.getElementById('emptyState');
        this.taskCount = document.getElementById('taskCount');
        this.filterButtons = document.querySelectorAll('.filter-btn');
    }

    bindEvents() {
        // タスク追加
        this.addTaskBtn.addEventListener('click', () => this.addTask());
        this.taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTask();
            }
        });

        // フィルターボタン
        this.filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });

        // タスクリストのイベント委譲
        this.taskList.addEventListener('click', (e) => {
            const taskItem = e.target.closest('.task-item');
            if (!taskItem) return;

            const taskId = parseInt(taskItem.dataset.taskId);

            if (e.target.classList.contains('task-checkbox')) {
                this.toggleTask(taskId);
            } else if (e.target.classList.contains('edit-btn')) {
                this.editTask(taskId);
            } else if (e.target.classList.contains('delete-btn')) {
                this.deleteTask(taskId);
            }
        });

        // 編集モードでのキーボードイベント
        this.taskList.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.classList.contains('edit-input')) {
                this.saveEdit(parseInt(e.target.closest('.task-item').dataset.taskId));
            }
        });

        this.taskList.addEventListener('blur', (e) => {
            if (e.target.classList.contains('edit-input')) {
                this.saveEdit(parseInt(e.target.closest('.task-item').dataset.taskId));
            }
        }, true);
    }

    addTask() {
        const text = this.taskInput.value.trim();
        if (!text) {
            this.showNotification('タスクを入力してください', 'warning');
            return;
        }

        const newTask = {
            id: Date.now(),
            text: text,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.tasks.unshift(newTask);
        this.saveTasks();
        this.renderTasks();
        this.updateTaskCount();
        this.taskInput.value = '';
        this.showNotification('タスクが追加されました', 'success');
    }

    toggleTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
            this.renderTasks();
            this.updateTaskCount();
            
            const message = task.completed ? 'タスクを完了しました' : 'タスクを未完了に戻しました';
            this.showNotification(message, 'info');
        }
    }

    editTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        this.editingTaskId = taskId;
        const taskItem = document.querySelector(`[data-task-id="${taskId}"]`);
        const taskText = taskItem.querySelector('.task-text');
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = task.text;
        input.className = 'edit-input';
        input.style.cssText = `
            flex: 1;
            padding: 8px 12px;
            border: 2px solid #667eea;
            border-radius: 8px;
            font-size: 1rem;
            background: white;
        `;
        
        taskText.replaceWith(input);
        input.focus();
        input.select();
    }

    saveEdit(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        const taskItem = document.querySelector(`[data-task-id="${taskId}"]`);
        const input = taskItem.querySelector('.edit-input');
        
        if (!task || !input) return;

        const newText = input.value.trim();
        if (!newText) {
            this.showNotification('タスク名を入力してください', 'warning');
            return;
        }

        task.text = newText;
        this.saveTasks();
        this.renderTasks();
        this.editingTaskId = null;
        this.showNotification('タスクが更新されました', 'success');
    }

    deleteTask(taskId) {
        if (!confirm('このタスクを削除しますか？')) return;

        const taskItem = document.querySelector(`[data-task-id="${taskId}"]`);
        taskItem.classList.add('removing');
        
        setTimeout(() => {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.saveTasks();
            this.renderTasks();
            this.updateTaskCount();
            this.showNotification('タスクが削除されました', 'info');
        }, 300);
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        // フィルターボタンのアクティブ状態を更新
        this.filterButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        this.renderTasks();
    }

    getFilteredTasks() {
        switch (this.currentFilter) {
            case 'completed':
                return this.tasks.filter(task => task.completed);
            case 'pending':
                return this.tasks.filter(task => !task.completed);
            default:
                return this.tasks;
        }
    }

    renderTasks() {
        const filteredTasks = this.getFilteredTasks();
        
        if (filteredTasks.length === 0) {
            this.taskList.style.display = 'none';
            this.emptyState.style.display = 'block';
            this.updateEmptyStateMessage();
        } else {
            this.taskList.style.display = 'block';
            this.emptyState.style.display = 'none';
            
            this.taskList.innerHTML = filteredTasks.map(task => this.createTaskHTML(task)).join('');
        }
    }

    createTaskHTML(task) {
        const isCompleted = task.completed;
        const isEditing = this.editingTaskId === task.id;
        
        return `
            <li class="task-item ${isCompleted ? 'completed' : ''}" data-task-id="${task.id}">
                <div class="task-checkbox ${isCompleted ? 'checked' : ''}">
                    ${isCompleted ? '<i class="fas fa-check"></i>' : ''}
                </div>
                <div class="task-text">${this.escapeHtml(task.text)}</div>
                <div class="task-actions">
                    <button class="task-btn edit-btn" title="編集">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="task-btn delete-btn" title="削除">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </li>
        `;
    }

    updateEmptyStateMessage() {
        const emptyState = this.emptyState;
        const messages = {
            all: {
                icon: 'fas fa-clipboard-list',
                title: 'まだタスクがありません',
                subtitle: '上の入力欄から新しいタスクを追加してください'
            },
            pending: {
                icon: 'fas fa-check-circle',
                title: '未完了のタスクはありません',
                subtitle: 'すべてのタスクが完了しています！'
            },
            completed: {
                icon: 'fas fa-tasks',
                title: '完了済みのタスクはありません',
                subtitle: 'タスクを完了するとここに表示されます'
            }
        };

        const message = messages[this.currentFilter];
        emptyState.innerHTML = `
            <i class="${message.icon}"></i>
            <p>${message.title}</p>
            <p>${message.subtitle}</p>
        `;
    }

    updateTaskCount() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const pending = total - completed;
        
        let countText = '';
        switch (this.currentFilter) {
            case 'completed':
                countText = `完了済み: ${completed}件`;
                break;
            case 'pending':
                countText = `未完了: ${pending}件`;
                break;
            default:
                countText = `全${total}件 (完了: ${completed}件, 未完了: ${pending}件)`;
        }
        
        this.taskCount.textContent = countText;
    }

    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        // 既存の通知を削除
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
        `;
        
        // スタイルを追加
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 500;
            animation: slideInRight 0.3s ease;
        `;

        document.body.appendChild(notification);

        // 3秒後に自動削除
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            warning: 'exclamation-triangle',
            error: 'times-circle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    getNotificationColor(type) {
        const colors = {
            success: '#4caf50',
            warning: '#ff9800',
            error: '#f44336',
            info: '#2196f3'
        };
        return colors[type] || '#2196f3';
    }
}

// CSS アニメーションを動的に追加
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// アプリケーションの初期化
document.addEventListener('DOMContentLoaded', () => {
    new TaskManager();
});

// キーボードショートカット
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter でタスク追加
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const taskInput = document.getElementById('taskInput');
        if (document.activeElement !== taskInput) {
            taskInput.focus();
        }
    }
    
    // Escape で編集モードをキャンセル
    if (e.key === 'Escape') {
        const editInput = document.querySelector('.edit-input');
        if (editInput) {
            const taskId = parseInt(editInput.closest('.task-item').dataset.taskId);
            const taskManager = window.taskManager;
            if (taskManager) {
                taskManager.renderTasks();
                taskManager.editingTaskId = null;
            }
        }
    }
});
