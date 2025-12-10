// ===== ADVANCED FEATURES EVENT LISTENERS =====

// Chart Tab Switching
document.querySelectorAll('.chart-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const chartType = tab.dataset.chart;
        if (window.switchChart) {
            window.switchChart(chartType);
        }
    });
});

// Budget Management Modal
const budgetModal = document.getElementById('budget-modal');
const manageBudgetsBtn = document.getElementById('manage-budgets-btn');
const closeBudgetModalBtn = document.getElementById('close-budget-modal-btn');
const addBudgetForm = document.getElementById('add-budget-form');

if (manageBudgetsBtn) {
    manageBudgetsBtn.addEventListener('click', () => {
        budgetModal.classList.remove('hidden');
        if (window.budgetModule) {
            window.budgetModule.populateBudgetCategoryDropdown();
        }
    });
}

if (closeBudgetModalBtn) {
    closeBudgetModalBtn.addEventListener('click', () => {
        budgetModal.classList.add('hidden');
    });
}

if (budgetModal) {
    budgetModal.addEventListener('click', (e) => {
        if (e.target === budgetModal) {
            budgetModal.classList.add('hidden');
        }
    });
}

if (addBudgetForm) {
    addBudgetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const category = document.getElementById('budget-category').value;
        const amount = parseFloat(document.getElementById('budget-amount').value);
        const month = document.getElementById('budget-month').value;
        
        if (category && amount && month) {
            const success = await window.budgetModule.setBudget(category, amount, month);
            if (success) {
                addBudgetForm.reset();
                window.budgetModule.initBudgetMonth();
            }
        }
    });
}

// Recurring Transactions Modal
const recurringModal = document.getElementById('recurring-modal');
const manageRecurringBtn = document.getElementById('manage-recurring-btn');
const closeRecurringModalBtn = document.getElementById('close-recurring-modal-btn');
const addRecurringForm = document.getElementById('add-recurring-form');

if (manageRecurringBtn) {
    manageRecurringBtn.addEventListener('click', () => {
        recurringModal.classList.remove('hidden');
        if (window.recurringModule) {
            const type = document.querySelector('input[name="recurring-type"]:checked').value;
            window.recurringModule.populateRecurringCategoryDropdown(type);
        }
    });
}

if (closeRecurringModalBtn) {
    closeRecurringModalBtn.addEventListener('click', () => {
        recurringModal.classList.add('hidden');
    });
}

if (recurringModal) {
    recurringModal.addEventListener('click', (e) => {
        if (e.target === recurringModal) {
            recurringModal.classList.add('hidden');
        }
    });
}

const accountsModal = document.getElementById('accounts-modal');
const manageAccountsBtn = document.getElementById('manage-accounts-btn');
const manageAccountsBtnTop = document.getElementById('manage-accounts-btn-top');
const closeAccountsModalBtn = document.getElementById('close-accounts-modal-btn');
const addAccountForm = document.getElementById('add-account-form');
const transferModal = document.getElementById('transfer-modal');
const openTransferModalBtn = document.getElementById('open-transfer-modal-btn');
const closeTransferModalBtn = document.getElementById('close-transfer-modal-btn');
const transferForm = document.getElementById('transfer-form');
const manageCategoriesNavBtn = document.getElementById('manage-categories-nav-btn');
const guideModal = document.getElementById('guide-modal');
const openGuideBtn = document.getElementById('open-guide-btn');
const closeGuideModalBtn = document.getElementById('close-guide-modal-btn');
const bnDashboard = document.getElementById('bn-dashboard');
const bnAnalytics = document.getElementById('bn-analytics');
const bnAccounts = document.getElementById('bn-accounts');
const bnCategories = document.getElementById('bn-categories');
const bnBudgets = document.getElementById('bn-budgets');
const bnRecurring = document.getElementById('bn-recurring');
const bnGuide = document.getElementById('bn-guide');
const mainContentEl = document.querySelector('.main-content');

function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(el => el.classList.add('hidden'));
}

function openAccountsModal() {
    closeAllModals();
    accountsModal.classList.remove('hidden');
    if (window.accountModule) {
        window.accountModule.renderAccountsListModal();
    }
}

if (manageAccountsBtn) {
    manageAccountsBtn.addEventListener('click', (e) => { e.preventDefault(); openAccountsModal(); });
}
if (manageAccountsBtnTop) {
    manageAccountsBtnTop.addEventListener('click', () => { openAccountsModal(); });
}
if (closeAccountsModalBtn) {
    closeAccountsModalBtn.addEventListener('click', () => { accountsModal.classList.add('hidden'); });
}
if (accountsModal) {
    accountsModal.addEventListener('click', (e) => { if (e.target === accountsModal) accountsModal.classList.add('hidden'); });
}
if (manageCategoriesNavBtn) {
    manageCategoriesNavBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeAllModals();
        const categoryModalEl = document.getElementById('category-modal');
        if (categoryModalEl) {
            categoryModalEl.classList.remove('hidden');
            if (typeof renderCategoryLists === 'function') {
                renderCategoryLists();
            }
        }
    });
}
// Guide Modal
if (openGuideBtn) {
    openGuideBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeAllModals();
        if (guideModal) guideModal.classList.remove('hidden');
    });
}
if (closeGuideModalBtn) {
    closeGuideModalBtn.addEventListener('click', () => {
        if (guideModal) guideModal.classList.add('hidden');
    });
}
if (guideModal) {
    guideModal.addEventListener('click', (e) => { if (e.target === guideModal) guideModal.classList.add('hidden'); });
}

// Bottom Navigation handlers
function setActiveBottomNav(btn) {
    document.querySelectorAll('.bottom-nav-item').forEach(el => el.classList.remove('active'));
    if (btn) btn.classList.add('active');
}

function pressNav(btn) {
    if (!btn) return;
    btn.classList.add('nav-pressed');
    setTimeout(() => btn.classList.remove('nav-pressed'), 180);
}

function animateMainContent() {
    if (!mainContentEl) return;
    mainContentEl.classList.remove('nav-transition');
    // force reflow to restart animation
    void mainContentEl.offsetWidth;
    mainContentEl.classList.add('nav-transition');
}

if (bnDashboard) {
    bnDashboard.addEventListener('click', () => {
        pressNav(bnDashboard);
        closeAllModals();
        setActiveBottomNav(bnDashboard);
        animateMainContent();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // Show main dashboard
        if (typeof showMainDashboard === 'function') showMainDashboard();
    });
}
if (bnAnalytics) {
    bnAnalytics.addEventListener('click', () => {
        pressNav(bnAnalytics);
        closeAllModals();
        setActiveBottomNav(bnAnalytics);
        animateMainContent();
        // Show analytics dashboard
        if (typeof showAnalyticsDashboard === 'function') showAnalyticsDashboard();
    });
}
if (bnAccounts) {
    bnAccounts.addEventListener('click', () => {
        pressNav(bnAccounts);
        openAccountsModal();
        setActiveBottomNav(bnAccounts);
        animateMainContent();
    });
}
if (bnCategories) {
    bnCategories.addEventListener('click', () => {
        pressNav(bnCategories);
        closeAllModals();
        const categoryModalEl = document.getElementById('category-modal');
        if (categoryModalEl) {
            categoryModalEl.classList.remove('hidden');
            if (typeof renderCategoryLists === 'function') renderCategoryLists();
        }
        setActiveBottomNav(bnCategories);
        animateMainContent();
    });
}
if (bnBudgets) {
    bnBudgets.addEventListener('click', () => {
        pressNav(bnBudgets);
        closeAllModals();
        const budgetModalEl = document.getElementById('budget-modal');
        if (budgetModalEl) {
            budgetModalEl.classList.remove('hidden');
            if (window.budgetModule) window.budgetModule.populateBudgetCategoryDropdown();
        }
        setActiveBottomNav(bnBudgets);
        animateMainContent();
    });
}
if (bnRecurring) {
    bnRecurring.addEventListener('click', () => {
        pressNav(bnRecurring);
        closeAllModals();
        const recurringModalEl = document.getElementById('recurring-modal');
        if (recurringModalEl) {
            recurringModalEl.classList.remove('hidden');
            if (window.recurringModule) {
                const type = document.querySelector('input[name="recurring-type"]:checked')?.value || 'income';
                window.recurringModule.populateRecurringCategoryDropdown(type);
            }
        }
        setActiveBottomNav(bnRecurring);
        animateMainContent();
    });
}
if (bnGuide) {
    bnGuide.addEventListener('click', () => {
        pressNav(bnGuide);
        closeAllModals();
        if (guideModal) guideModal.classList.remove('hidden');
        setActiveBottomNav(bnGuide);
        animateMainContent();
    });
}
if (addAccountForm) {
    addAccountForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('new-account-name').value.trim();
        if (name) {
            if (window.accountModule) {
                const openingBalance = Number(document.getElementById('new-account-opening-balance').value || 0);
                const ok = await window.accountModule.addAccount(name, openingBalance);
                if (ok) {
                    addAccountForm.reset();
                    window.accountModule.populateAccountDropdowns();
                }
            }
        }
    });
}

// Transfer Modal
if (openTransferModalBtn) {
    openTransferModalBtn.addEventListener('click', () => {
        closeAllModals();
        transferModal.classList.remove('hidden');
        if (window.accountModule) window.accountModule.populateAccountDropdowns();
        const dateInput = document.getElementById('transfer-date');
        if (dateInput) dateInput.valueAsDate = new Date();
    });
}
if (closeTransferModalBtn) {
    closeTransferModalBtn.addEventListener('click', () => { transferModal.classList.add('hidden'); });
}
if (transferModal) {
    transferModal.addEventListener('click', (e) => { if (e.target === transferModal) transferModal.classList.add('hidden'); });
}
if (transferForm) {
    transferForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fromAcc = document.getElementById('transfer-from').value;
        const toAcc = document.getElementById('transfer-to').value;
        const amount = Number(document.getElementById('transfer-amount').value || 0);
        const date = document.getElementById('transfer-date').value;
        const desc = document.getElementById('transfer-description').value || '';

        if (!fromAcc || !toAcc || !amount || !date || fromAcc === toAcc) {
            Swal.fire('Warning', 'Please fill all fields correctly (accounts must be different).', 'warning');
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Insert two transactions: expense (from) and income (to), labeled as transfer
        const { error } = await supabase
            .from('transactions')
            .insert([
                { user_id: user.id, type: 'expense', amount, category: 'Transfer Out', date, description: `Transfer to ${toAcc}. ${desc}`, account: fromAcc },
                { user_id: user.id, type: 'income', amount, category: 'Transfer In', date, description: `Transfer from ${fromAcc}. ${desc}`, account: toAcc }
            ]);
        if (error) {
            Swal.fire('Error', 'Error creating transfer: ' + error.message, 'error');
            return;
        }

        transferForm.reset();
        transferModal.classList.add('hidden');
        if (typeof window.loadDashboardData === 'function') {
            await window.loadDashboardData();
        }
    });
}

// Recurring type change - update category dropdown
document.querySelectorAll('input[name="recurring-type"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (window.recurringModule) {
            window.recurringModule.populateRecurringCategoryDropdown(e.target.value);
        }
    });
});

// Recurring frequency change - show/hide day fields
const recurringFrequency = document.getElementById('recurring-frequency');
const dayOfMonthGroup = document.getElementById('day-of-month-group');
const dayOfWeekGroup = document.getElementById('day-of-week-group');

if (recurringFrequency) {
    recurringFrequency.addEventListener('change', (e) => {
        const frequency = e.target.value;
        
        if (frequency === 'monthly' || frequency === 'yearly') {
            dayOfMonthGroup.classList.remove('hidden');
            dayOfWeekGroup.classList.add('hidden');
        } else if (frequency === 'weekly') {
            dayOfMonthGroup.classList.add('hidden');
            dayOfWeekGroup.classList.remove('hidden');
        } else {
            dayOfMonthGroup.classList.add('hidden');
            dayOfWeekGroup.classList.add('hidden');
        }
    });
}

if (addRecurringForm) {
    addRecurringForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const type = document.querySelector('input[name="recurring-type"]:checked').value;
        const category = document.getElementById('recurring-category').value;
        const amount = parseFloat(document.getElementById('recurring-amount').value);
        const description = document.getElementById('recurring-description').value;
        const frequency = document.getElementById('recurring-frequency').value;
        const startDate = document.getElementById('recurring-start-date').value;
        const endDate = document.getElementById('recurring-end-date').value;
        
        const data = {
            type,
            category,
            amount,
            description,
            frequency,
            start_date: startDate,
            end_date: endDate || null,
            is_active: true
        };
        
        // Add day_of_month or day_of_week based on frequency
        if (frequency === 'monthly' || frequency === 'yearly') {
            data.day_of_month = parseInt(document.getElementById('recurring-day-month').value);
        } else if (frequency === 'weekly') {
            data.day_of_week = parseInt(document.getElementById('recurring-day-week').value);
        }
        
        const success = await window.recurringModule.addRecurringTransaction(data);
        if (success) {
            addRecurringForm.reset();
            document.getElementById('recurring-start-date').valueAsDate = new Date();
        }
    });
}

// Set default start date for recurring
const recurringStartDate = document.getElementById('recurring-start-date');
if (recurringStartDate) {
    recurringStartDate.valueAsDate = new Date();
}

// Savings Goals Modal
const savingsModal = document.getElementById('savings-modal');
const closeSavingsModalBtn = document.getElementById('close-savings-modal-btn');
const addSavingsForm = document.getElementById('add-savings-form');
const savingsTargetTypeInputs = document.querySelectorAll('input[name="savings-target-type"]');

if (closeSavingsModalBtn) {
    closeSavingsModalBtn.addEventListener('click', () => {
        if (savingsModal) savingsModal.classList.add('hidden');
    });
}

if (savingsModal) {
    savingsModal.addEventListener('click', (e) => {
        if (e.target === savingsModal) {
            savingsModal.classList.add('hidden');
        }
    });
}

// Update form labels when target type changes
if (savingsTargetTypeInputs.length > 0) {
    savingsTargetTypeInputs.forEach(input => {
        input.addEventListener('change', () => {
            if (window.savingsModule) {
                window.savingsModule.updateSavingsFormLabels();
            }
        });
    });
}

// Savings form submit
if (addSavingsForm) {
    addSavingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const month = document.getElementById('savings-month').value;
        const targetType = document.querySelector('input[name="savings-target-type"]:checked').value;
        const targetValue = parseFloat(document.getElementById('savings-target-value').value);
        
        if (month && targetType && targetValue) {
            const success = await window.savingsModule.setSavingsGoal(targetType, targetValue, month);
            if (success) {
                addSavingsForm.reset();
                window.savingsModule.initSavingsForm();
                // Refresh savings card
                if (window.transactions) {
                    window.savingsModule.renderSavingsCard(window.transactions);
                }
                // Refresh savings list modal
                window.savingsModule.renderSavingsListModal();
            }
        }
    });
}
