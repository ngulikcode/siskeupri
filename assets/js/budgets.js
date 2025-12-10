// Budgets Management Module

let budgets = [];
let currentBudgetMonth = '';

// Initialize budget month to current month
function initBudgetMonth() {
    const today = new Date();
    currentBudgetMonth = today.toISOString().slice(0, 7); // YYYY-MM
    const budgetMonthInput = document.getElementById('budget-month');
    if (budgetMonthInput) {
        budgetMonthInput.value = currentBudgetMonth;
    }
}

// Fetch Budgets
async function fetchBudgets(month = null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id);

    if (month) {
        query = query.eq('month', month);
    }

    const { data, error } = await query.order('category');

    if (error) {
        console.error('Error fetching budgets:', error);
        return;
    }

    budgets = data;
    renderBudgetOverview();
    renderBudgetListModal();
}

// Set/Update Budget
async function setBudget(category, amount, month) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if budget already exists
    const existing = budgets.find(b => b.category === category && b.month === month);

    if (existing) {
        // Update existing
        const { error } = await supabase
            .from('budgets')
            .update({ amount, updated_at: new Date().toISOString() })
            .eq('id', existing.id);

        if (error) {
            Swal.fire('Error', 'Error updating budget: ' + error.message, 'error');
            return false;
        }
    } else {
        // Insert new
        const { error } = await supabase
            .from('budgets')
            .insert([{
                user_id: user.id,
                category,
                amount,
                month
            }]);

        if (error) {
            Swal.fire('Error', 'Error setting budget: ' + error.message, 'error');
            return false;
        }
    }

    await fetchBudgets();
    return true;
}

// Delete Budget
async function deleteBudget(id) {
    const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id);

    if (error) {
        Swal.fire('Error', 'Error deleting budget: ' + error.message, 'error');
        return false;
    }

    await fetchBudgets();
    return true;
}

// Calculate Budget Progress
function calculateBudgetProgress(category, month) {
    const spent = transactions
        .filter(t => t.category === category && 
                     t.type === 'expense' && 
                     t.date.startsWith(month))
        .reduce((sum, t) => sum + t.amount, 0);

    const budget = budgets.find(b => b.category === category && b.month === month);
    
    if (!budget) return null;

    const percentage = (spent / budget.amount) * 100;
    const status = percentage >= 100 ? 'exceeded' : 
                   percentage >= 80 ? 'warning' : 'ok';

    return {
        spent,
        limit: budget.amount,
        percentage: Math.min(percentage, 100),
        status,
        budget
    };
}

// Render Budget Overview
function renderBudgetOverview() {
    const budgetList = document.getElementById('budget-list');
    if (!budgetList) return;

    // Get budgets for current month
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentBudgets = budgets.filter(b => b.month === currentMonth);

    if (currentBudgets.length === 0) {
        budgetList.innerHTML = '<p class="empty-state">No budgets set for this month. Click "Manage Budgets" to get started.</p>';
        return;
    }

    budgetList.innerHTML = '';
    currentBudgets.forEach(budget => {
        const progress = calculateBudgetProgress(budget.category, budget.month);
        if (!progress) return;

        const item = createBudgetItem(progress);
        budgetList.appendChild(item);
    });
}

// Create Budget Item Element
function createBudgetItem(progress) {
    const div = document.createElement('div');
    div.className = 'budget-item';

    const statusIcon = progress.status === 'exceeded' ? '🔴' :
                      progress.status === 'warning' ? '⚠️' : '✅';

    div.innerHTML = `
        <div class="budget-item-header">
            <span class="budget-category-name">${progress.budget.category}</span>
            <span class="budget-amounts">
                <span class="budget-spent">Rp ${progress.spent.toLocaleString()}</span> / 
                Rp ${progress.limit.toLocaleString()}
            </span>
        </div>
        <div class="budget-progress-container">
            <div class="budget-progress-bar">
                <div class="budget-progress-fill ${progress.status}" style="width: ${progress.percentage}%">
                    ${progress.percentage.toFixed(0)}%
                </div>
            </div>
        </div>
        <div class="budget-status">
            <span class="budget-status-icon">${statusIcon}</span>
            <span>${progress.status === 'exceeded' ? 'Budget exceeded!' :
                    progress.status === 'warning' ? 'Approaching limit' :
                    'On track'}</span>
        </div>
    `;

    return div;
}

// Render Budget List in Modal
function renderBudgetListModal() {
    const budgetListModal = document.getElementById('budgets-list-modal');
    if (!budgetListModal) return;

    if (budgets.length === 0) {
        budgetListModal.innerHTML = '<p class="empty-state">No budgets set yet.</p>';
        return;
    }

    budgetListModal.innerHTML = '';
    budgets.forEach(budget => {
        const progress = calculateBudgetProgress(budget.category, budget.month);
        
        const div = document.createElement('div');
        div.className = 'budget-item';
        
        div.innerHTML = `
            <div class="budget-item-header">
                <span class="budget-category-name">${budget.category}</span>
                <span class="budget-amounts">Month: ${budget.month}</span>
            </div>
            <div class="budget-amounts">
                Limit: Rp ${budget.amount.toLocaleString()}
                ${progress ? ` | Spent: Rp ${progress.spent.toLocaleString()} (${progress.percentage.toFixed(0)}%)` : ''}
            </div>
            <div class="budget-item-actions">
                <button class="btn-delete-budget" onclick="deleteBudgetPrompt('${budget.id}')">Delete</button>
            </div>
        `;
        
        budgetListModal.appendChild(div);
    });
}

// Delete Budget Prompt
function deleteBudgetPrompt(id) {
    const budget = budgets.find(b => b.id === id);
    Swal.fire({
        title: 'Are you sure?',
        text: `Delete budget for ${budget.category} (${budget.month})?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
        if (result.isConfirmed) {
            deleteBudget(id);
        }
    });
}

// Populate Budget Category Dropdown
function populateBudgetCategoryDropdown() {
    const select = document.getElementById('budget-category');
    if (!select) return;

    // Get expense categories only
    const expenseCategories = categories.filter(c => c.type === 'expense');
    
    select.innerHTML = '<option value="">Select Category</option>';
    expenseCategories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name;
        option.textContent = cat.name;
        select.appendChild(option);
    });
}

// Export functions
window.budgetModule = {
    initBudgetMonth,
    fetchBudgets,
    setBudget,
    deleteBudget,
    calculateBudgetProgress,
    renderBudgetOverview,
    populateBudgetCategoryDropdown
};
