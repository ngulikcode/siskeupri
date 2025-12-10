// Notifications System

let notifications = [];
let unreadCount = 0;

// DOM Elements
const notificationBtn = document.getElementById('notification-btn');
const notificationBadge = document.getElementById('notification-badge');
const notificationPanel = document.getElementById('notification-panel');
const notificationList = document.getElementById('notification-list');
const markAllReadBtn = document.getElementById('mark-all-read-btn');
const notificationOverlay = document.getElementById('notification-overlay');

// Initialize notifications
async function initNotifications() {
    await fetchNotifications();
    setupEventListeners();
    checkAndGenerateNotifications();
}

// Fetch notifications from database
async function fetchNotifications() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error('Error fetching notifications:', error);
        return;
    }

    notifications = data || [];
    updateUnreadCount();
    renderNotifications();
}

// Update unread count badge
function updateUnreadCount() {
    unreadCount = notifications.filter(n => !n.is_read).length;
    
    if (unreadCount > 0) {
        notificationBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        notificationBadge.classList.remove('hidden');
    } else {
        notificationBadge.classList.add('hidden');
    }
}

// Render notifications list
function renderNotifications() {
    if (notifications.length === 0) {
        notificationList.innerHTML = '<p class="empty-state">No notifications</p>';
        return;
    }

    notificationList.innerHTML = notifications.map(notification => {
        const timeAgo = getTimeAgo(notification.created_at);
        const iconClass = getIconClass(notification.type);
        const icon = getIcon(notification.type);
        const unreadClass = notification.is_read ? '' : 'unread';

        return `
            <div class="notification-item ${unreadClass}" data-id="${notification.id}">
                <div class="notification-icon ${iconClass}">
                    <i class="${icon}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${escapeHtml(notification.title)}</div>
                    <div class="notification-message">${escapeHtml(notification.message)}</div>
                    <div class="notification-time">${timeAgo}</div>
                </div>
            </div>
        `;
    }).join('');

    // Add click handlers
    notificationList.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', () => markAsRead(item.dataset.id));
    });
}

// Get icon class based on notification type
function getIconClass(type) {
    const iconMap = {
        'budget_warning': 'warning',
        'budget_exceeded': 'warning',
        'low_balance': 'warning',
        'savings_goal': 'success',
        'recurring_reminder': 'info',
        'info': 'info'
    };
    return iconMap[type] || 'info';
}

// Get icon based on notification type
function getIcon(type) {
    const iconMap = {
        'budget_warning': 'fa-solid fa-exclamation-triangle',
        'budget_exceeded': 'fa-solid fa-exclamation-circle',
        'low_balance': 'fa-solid fa-wallet',
        'savings_goal': 'fa-solid fa-trophy',
        'recurring_reminder': 'fa-solid fa-bell',
        'debt_due': 'fa-solid fa-calendar-day',
        'debt_overdue': 'fa-solid fa-exclamation-triangle',
        'info': 'fa-solid fa-info-circle'
    };
    return iconMap[type] || 'fa-solid fa-info-circle';
}

// Get time ago string
function getTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
}

// Mark notification as read
async function markAsRead(notificationId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error marking notification as read:', error);
        return;
    }

    // Update local state
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
        notification.is_read = true;
        updateUnreadCount();
        renderNotifications();
    }
}

// Mark all notifications as read
async function markAllAsRead() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .in('id', unreadIds);

    if (error) {
        console.error('Error marking all as read:', error);
        return;
    }

    notifications.forEach(n => n.is_read = true);
    updateUnreadCount();
    renderNotifications();
}

// Create notification
async function createNotification(type, title, message, metadata = {}) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if similar notification already exists in database (regardless of read status)
    // This prevents creating duplicate notifications after page reload
    const { data: existingNotifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', type)
        .order('created_at', { ascending: false })
        .limit(100);

    if (existingNotifications && existingNotifications.length > 0) {
        // Check if notification with same metadata already exists
        const similarExists = existingNotifications.some(n => {
            const nMetadata = n.metadata || {};
            const currentMetadata = metadata || {};
            
            // For budget notifications, check month and category
            if (type === 'budget_exceeded' || type === 'budget_warning') {
                return nMetadata.category === currentMetadata.category && 
                       nMetadata.month === currentMetadata.month;
            }
            
            // For savings goal, check month
            if (type === 'savings_goal') {
                return nMetadata.month === currentMetadata.month;
            }
            
            // For recurring reminders, check recurringId and date
            if (type === 'recurring_reminder') {
                const nDate = new Date(n.created_at);
                const today = new Date();
                return nMetadata.recurringId === currentMetadata.recurringId &&
                       nDate.toDateString() === today.toDateString();
            }
            
            // For low balance, check accountName and if created today
            if (type === 'low_balance') {
                const nDate = new Date(n.created_at);
                const today = new Date();
                return nMetadata.accountName === currentMetadata.accountName &&
                       nDate.toDateString() === today.toDateString();
            }
            
            // Default: check if metadata matches exactly
            return JSON.stringify(nMetadata) === JSON.stringify(currentMetadata);
        });

        if (similarExists) {
            return; // Skip duplicate - notification already exists
        }
    }

    // Also check local notifications array for immediate duplicates
    const recentSimilar = notifications.find(n => 
        n.type === type && 
        JSON.stringify(n.metadata) === JSON.stringify(metadata) &&
        (new Date() - new Date(n.created_at)) < 3600000 // Within 1 hour
    );

    if (recentSimilar) return; // Skip duplicate

    const { data, error } = await supabase
        .from('notifications')
        .insert([{
            user_id: user.id,
            type,
            title,
            message,
            metadata,
            is_read: false
        }])
        .select()
        .single();

    if (error) {
        console.error('Error creating notification:', error);
        return;
    }

    notifications.unshift(data);
    updateUnreadCount();
    renderNotifications();
}

// Check and generate notifications based on current data
async function checkAndGenerateNotifications() {
    if (typeof window.transactions === 'undefined' || 
        !window.budgetModule || 
        !window.accountModule) {
        // Wait for data to load
        setTimeout(checkAndGenerateNotifications, 1000);
        return;
    }

    await checkBudgetNotifications();
    await checkLowBalanceNotifications();
    await checkSavingsGoalNotifications();
    await checkRecurringReminders();
    await checkDebtNotifications();
}

// Check budget notifications
async function checkBudgetNotifications() {
    if (!window.budgetModule || !window.transactions) return;

    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // Get budgets from budgetModule - we need to access the budgets array
    // Since budgets is not directly exposed, we'll need to check via calculateBudgetProgress
    // For now, let's fetch budgets directly or access via a different method
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: budgets } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', currentMonth);

    if (!budgets || budgets.length === 0) return;

    budgets.forEach(budget => {
        const progress = window.budgetModule?.calculateBudgetProgress?.(budget.category, currentMonth);
        if (!progress) return;

        if (progress.percentage >= 100 && progress.status === 'exceeded') {
            createNotification(
                'budget_exceeded',
                'Budget Exceeded',
                `Your budget for ${budget.category} has been exceeded. Spent: Rp ${formatCurrency(progress.spent)} / Rp ${formatCurrency(progress.limit)}`,
                { category: budget.category, month: currentMonth, spent: progress.spent, limit: progress.limit }
            );
        } else if (progress.percentage >= 80 && progress.percentage < 100) {
            createNotification(
                'budget_warning',
                'Budget Warning',
                `You've used ${Math.round(progress.percentage)}% of your ${budget.category} budget. Spent: Rp ${formatCurrency(progress.spent)} / Rp ${formatCurrency(progress.limit)}`,
                { category: budget.category, month: currentMonth, spent: progress.spent, limit: progress.limit, percentage: progress.percentage }
            );
        }
    });
}

// Check low balance notifications
async function checkLowBalanceNotifications() {
    if (!window.accountModule || !window.transactions) return;

    const lowBalanceThreshold = 100000; // Rp 100,000
    
    // Get account balances from accountModule
    const accountData = window.accountModule.latestData || [];
    
    accountData.forEach(account => {
        if (account.balance < lowBalanceThreshold && account.balance > 0) {
            createNotification(
                'low_balance',
                'Low Balance Alert',
                `Your ${account.name} account balance is low: Rp ${formatCurrency(account.balance)}`,
                { accountName: account.name, balance: account.balance }
            );
        }
    });
}

// Check savings goal notifications
async function checkSavingsGoalNotifications() {
    if (!window.savingsModule || !window.transactions) return;

    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // Get savings goals from savingsModule
    const savingsGoals = window.savingsModule.savingsGoals?.() || [];
    const goal = savingsGoals.find(g => g.month === currentMonth);
    
    if (!goal) return;

    const progress = window.savingsModule?.calculateSavingsProgress?.(window.transactions, currentMonth);
    if (!progress) return;

    if (progress.status === 'achieved') {
        createNotification(
            'savings_goal',
            'Savings Goal Achieved! 🎉',
            `Congratulations! You've achieved your savings goal for ${currentMonth}. Saved: Rp ${formatCurrency(progress.actualSavings)}`,
            { month: currentMonth, actualSavings: progress.actualSavings, targetSavings: progress.targetSavings }
        );
    } else if (progress.percentage >= 80) {
        createNotification(
            'savings_goal',
            'Savings Goal Progress',
            `You're ${Math.round(progress.percentage)}% towards your savings goal. Keep it up!`,
            { month: currentMonth, percentage: progress.percentage }
        );
    }
}

// Check recurring transaction reminders
async function checkRecurringReminders() {
    if (!window.recurringModule) return;

    // Fetch recurring transactions
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: recurringTransactions } = await supabase
        .from('recurring_transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

    if (!recurringTransactions || recurringTransactions.length === 0) return;

    const today = new Date();
    const dayOfMonth = today.getDate();
    const dayOfWeek = today.getDay();

    recurringTransactions.forEach(rt => {
            let shouldNotify = false;

            if (rt.frequency === 'monthly' && rt.day_of_month === dayOfMonth) {
                shouldNotify = true;
            } else if (rt.frequency === 'weekly' && rt.day_of_week === dayOfWeek) {
                shouldNotify = true;
            } else if (rt.frequency === 'daily') {
                shouldNotify = true;
            }

            if (shouldNotify) {
                createNotification(
                    'recurring_reminder',
                    'Recurring Transaction Due',
                    `Your ${rt.type} transaction "${rt.description || rt.category}" of Rp ${formatCurrency(rt.amount)} is due today.`,
                    { recurringId: rt.id, type: rt.type, amount: rt.amount, category: rt.category }
                );
            }
        });
}

// Check debt notifications
async function checkDebtNotifications() {
    if (!window.debtModule) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch active debts
    const debts = window.debtModule.debts() || [];
    const activeDebts = debts.filter(d => d.status === 'active' || d.status === 'overdue');

    if (activeDebts.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    activeDebts.forEach(debt => {
        // Check for overdue debts
        if (debt.due_date) {
            const dueDate = new Date(debt.due_date);
            dueDate.setHours(0, 0, 0, 0);
            const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

            if (daysUntilDue < 0 && debt.status === 'overdue') {
                // Debt is overdue
                createNotification(
                    'debt_overdue',
                    'Debt Overdue',
                    `Your ${debt.type === 'debt' ? 'debt' : 'credit'} to ${debt.name} is overdue. Remaining: Rp ${formatCurrency(debt.remaining_amount)}`,
                    { debtId: debt.id, name: debt.name, type: debt.type, remainingAmount: debt.remaining_amount, dueDate: debt.due_date }
                );
            } else if (daysUntilDue >= 0 && daysUntilDue <= 3) {
                // Debt is due soon (within 3 days)
                createNotification(
                    'debt_due',
                    'Debt Due Soon',
                    `Your ${debt.type === 'debt' ? 'debt' : 'credit'} to ${debt.name} is due in ${daysUntilDue === 0 ? 'today' : daysUntilDue === 1 ? '1 day' : `${daysUntilDue} days`}. Remaining: Rp ${formatCurrency(debt.remaining_amount)}`,
                    { debtId: debt.id, name: debt.name, type: debt.type, remainingAmount: debt.remaining_amount, dueDate: debt.due_date, daysUntilDue }
                );
            }
        }

        // Check for next payment date
        if (debt.next_payment_date && debt.payment_frequency && debt.payment_frequency !== 'one_time') {
            const nextPaymentDate = new Date(debt.next_payment_date);
            nextPaymentDate.setHours(0, 0, 0, 0);
            const daysUntilPayment = Math.ceil((nextPaymentDate - today) / (1000 * 60 * 60 * 24));

            if (daysUntilPayment === 0) {
                // Payment is due today
                createNotification(
                    'debt_due',
                    'Debt Payment Due',
                    `Payment for ${debt.name} ${debt.type === 'debt' ? 'debt' : 'credit'} is due today. Remaining: Rp ${formatCurrency(debt.remaining_amount)}`,
                    { debtId: debt.id, name: debt.name, type: debt.type, remainingAmount: debt.remaining_amount, nextPaymentDate: debt.next_payment_date }
                );
            }
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Toggle notification panel
    if (notificationBtn) {
        notificationBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = notificationPanel.classList.contains('hidden');
            if (isHidden) {
                notificationPanel.classList.remove('hidden');
                if (notificationOverlay) {
                    notificationOverlay.classList.add('active');
                }
                // Prevent body scroll on mobile
                if (window.innerWidth <= 768) {
                    document.body.classList.add('notification-open');
                }
            } else {
                window.closeNotificationPanel();
            }
        });
    }

    // Close panel function (export for external use)
    window.closeNotificationPanel = function() {
        notificationPanel.classList.add('hidden');
        if (notificationOverlay) {
            notificationOverlay.classList.remove('active');
        }
        document.body.classList.remove('notification-open');
    };

    // Close panel when clicking overlay (mobile)
    if (notificationOverlay) {
        notificationOverlay.addEventListener('click', () => {
            window.closeNotificationPanel();
        });
    }

    // Close panel when clicking outside (desktop)
    document.addEventListener('click', (e) => {
        if (window.innerWidth > 768) {
            if (!notificationPanel.contains(e.target) && !notificationBtn.contains(e.target)) {
                window.closeNotificationPanel();
            }
        }
    });

    // Mark all as read
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            markAllAsRead();
        });
    }

    // Close notification panel button (mobile)
    const closeNotificationPanelBtn = document.getElementById('close-notification-panel-btn');
    if (closeNotificationPanelBtn) {
        closeNotificationPanelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.closeNotificationPanel();
        });
    }
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID').format(amount);
}

// Listen for dashboard data loaded event
document.addEventListener('dashboardDataLoaded', () => {
    // Wait a bit for all modules to finish updating
    setTimeout(() => {
        checkAndGenerateNotifications();
    }, 500);
});

// Export functions for use in other files
window.initNotifications = initNotifications;
window.createNotification = createNotification;
window.checkAndGenerateNotifications = checkAndGenerateNotifications;
window.fetchNotifications = fetchNotifications;

