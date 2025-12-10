// Savings Goals Management Module

let savingsGoals = [];
let currentSavingsMonth = '';

// Initialize savings month to current month
function initSavingsMonth() {
    const today = new Date();
    currentSavingsMonth = today.toISOString().slice(0, 7); // YYYY-MM
}

// Fetch Savings Goals
async function fetchSavingsGoals(month = null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', user.id);

    if (month) {
        query = query.eq('month', month);
    }

    const { data, error } = await query.order('month', { ascending: false });

    if (error) {
        console.error('Error fetching savings goals:', error);
        return;
    }

    savingsGoals = data || [];
    initSavingsMonth();
}

// Get Current Month Savings Goal
function getCurrentSavingsGoal() {
    const currentMonth = new Date().toISOString().slice(0, 7);
    return savingsGoals.find(g => g.month === currentMonth);
}

// Set/Update Savings Goal
async function setSavingsGoal(targetType, targetValue, month) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Validate target value
    if (targetType === 'percentage' && (targetValue < 0 || targetValue > 100)) {
        Swal.fire('Error', 'Percentage must be between 0 and 100', 'error');
        return false;
    }

    if (targetValue <= 0) {
        Swal.fire('Error', 'Target value must be greater than 0', 'error');
        return false;
    }

    // Check if goal already exists
    const existing = savingsGoals.find(g => g.month === month);

    if (existing) {
        // Update existing
        const { error } = await supabase
            .from('savings_goals')
            .update({ 
                target_type: targetType,
                target_value: Number(targetValue),
                updated_at: new Date().toISOString() 
            })
            .eq('id', existing.id);

        if (error) {
            Swal.fire('Error', 'Error updating savings goal: ' + error.message, 'error');
            return false;
        }
    } else {
        // Insert new
        const { error } = await supabase
            .from('savings_goals')
            .insert([{
                user_id: user.id,
                month,
                target_type: targetType,
                target_value: Number(targetValue)
            }]);

        if (error) {
            Swal.fire('Error', 'Error setting savings goal: ' + error.message, 'error');
            return false;
        }
    }

    await fetchSavingsGoals();
    return true;
}

// Delete Savings Goal
async function deleteSavingsGoal(id) {
    const { error } = await supabase
        .from('savings_goals')
        .delete()
        .eq('id', id);

    if (error) {
        Swal.fire('Error', 'Error deleting savings goal: ' + error.message, 'error');
        return false;
    }

    await fetchSavingsGoals();
    return true;
}

// Calculate Savings Progress
function calculateSavingsProgress(transactions, month = null) {
    if (!month) {
        month = new Date().toISOString().slice(0, 7);
    }

    const goal = savingsGoals.find(g => g.month === month);
    if (!goal) {
        return null;
    }

    // Filter transactions for the month (exclude transfers)
    function isTransfer(t) {
        return (t.category || '').toLowerCase().startsWith('transfer ');
    }
    const monthTransactions = transactions.filter(t => 
        t.date.startsWith(month) && !isTransfer(t)
    );

    const income = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const expense = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const actualSavings = income - expense;

    // Calculate target savings
    let targetSavings = 0;
    if (goal.target_type === 'percentage') {
        targetSavings = (income * goal.target_value) / 100;
    } else {
        targetSavings = goal.target_value;
    }

    // Calculate percentage achieved
    const percentage = targetSavings > 0 ? (actualSavings / targetSavings) * 100 : 0;
    const status = percentage >= 100 ? 'achieved' : 
                   percentage >= 80 ? 'good' : 
                   percentage >= 50 ? 'moderate' : 'low';

    return {
        goal,
        income,
        expense,
        actualSavings,
        targetSavings,
        percentage: Math.min(percentage, 100),
        status,
        month
    };
}

// Render Savings Card
function renderSavingsCard(transactions) {
    const savingsCard = document.getElementById('savings-card');
    if (!savingsCard) return;

    const progress = calculateSavingsProgress(transactions);
    
    if (!progress) {
        // No goal set
        savingsCard.innerHTML = `
            <div class="stat-icon">
                <i class="fa-solid fa-piggy-bank"></i>
            </div>
            <div class="stat-content">
                <h4>Savings Goal</h4>
                <p style="color: var(--text-muted); font-size: 0.875rem;">No goal set for this month</p>
                <button class="btn-secondary" id="set-savings-goal-btn" style="margin-top: 0.5rem; padding: 0.5rem 1rem; font-size: 0.875rem;">Set Goal</button>
            </div>
        `;
        
        // Add event listener
        const setGoalBtn = document.getElementById('set-savings-goal-btn');
        if (setGoalBtn) {
            setGoalBtn.addEventListener('click', () => {
                const savingsModal = document.getElementById('savings-modal');
                if (savingsModal) {
                    savingsModal.classList.remove('hidden');
                    if (window.savingsModule) {
                        window.savingsModule.initSavingsForm();
                    }
                }
            });
        }
        return;
    }

    const statusIcon = progress.status === 'achieved' ? '🎉' :
                      progress.status === 'good' ? '✅' :
                      progress.status === 'moderate' ? '⚠️' : '📊';

    const statusColor = progress.status === 'achieved' ? '#22c55e' :
                        progress.status === 'good' ? '#D4AF37' :
                        progress.status === 'moderate' ? '#f97316' : '#ef4444';

    savingsCard.innerHTML = `
        <div class="stat-icon">
            <i class="fa-solid fa-piggy-bank"></i>
        </div>
        <div class="stat-content" style="width: 100%;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <h4>Savings Goal</h4>
                <span style="font-size: 1.5rem;">${statusIcon}</span>
            </div>
            <p id="savings-amount" style="font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem;">
                Rp ${progress.actualSavings.toLocaleString()}
            </p>
            <div style="margin-bottom: 0.5rem;">
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">
                    <span>Target: Rp ${progress.targetSavings.toLocaleString()}</span>
                    <span>${progress.percentage.toFixed(1)}%</span>
                </div>
                <div class="savings-progress-bar" style="width: 100%; height: 8px; background: var(--border-color); border-radius: 4px; overflow: hidden;">
                    <div class="savings-progress-fill" style="width: ${Math.min(progress.percentage, 100)}%; height: 100%; background: ${statusColor}; transition: width 0.3s ease;"></div>
                </div>
            </div>
            <button class="btn-secondary" id="manage-savings-btn" style="margin-top: 0.5rem; padding: 0.5rem 1rem; font-size: 0.875rem; width: 100%;">Manage Goal</button>
        </div>
    `;

    // Add event listener
    const manageBtn = document.getElementById('manage-savings-btn');
    if (manageBtn) {
        manageBtn.addEventListener('click', () => {
            const savingsModal = document.getElementById('savings-modal');
            if (savingsModal) {
                savingsModal.classList.remove('hidden');
                if (window.savingsModule) {
                    window.savingsModule.initSavingsForm();
                }
            }
        });
    }
}

// Initialize Savings Form
function initSavingsForm() {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const goal = savingsGoals.find(g => g.month === currentMonth);
    
    const savingsMonthInput = document.getElementById('savings-month');
    const savingsTypeInput = document.getElementById('savings-target-type');
    const savingsValueInput = document.getElementById('savings-target-value');
    const savingsTypePercentage = document.getElementById('savings-type-percentage');
    const savingsTypeFixed = document.getElementById('savings-type-fixed');

    if (savingsMonthInput) {
        savingsMonthInput.value = currentMonth;
    }

    if (goal) {
        if (savingsTypeInput) {
            savingsTypeInput.value = goal.target_type;
        }
        if (savingsValueInput) {
            savingsValueInput.value = goal.target_value;
        }
        if (goal.target_type === 'percentage') {
            if (savingsTypePercentage) savingsTypePercentage.checked = true;
        } else {
            if (savingsTypeFixed) savingsTypeFixed.checked = true;
        }
    } else {
        // Default to percentage
        if (savingsTypeInput) savingsTypeInput.value = 'percentage';
        if (savingsTypePercentage) savingsTypePercentage.checked = true;
        if (savingsValueInput) savingsValueInput.value = '';
    }

    updateSavingsFormLabels();
}

// Update form labels based on type
function updateSavingsFormLabels() {
    const type = document.querySelector('input[name="savings-target-type"]:checked')?.value || 'percentage';
    const label = document.getElementById('savings-value-label');
    const input = document.getElementById('savings-target-value');
    const placeholder = document.getElementById('savings-value-placeholder');

    if (type === 'percentage') {
        if (label) label.textContent = 'Target Percentage (%)';
        if (placeholder) placeholder.textContent = 'e.g., 20 (means 20% of income)';
        if (input) {
            input.type = 'number';
            input.min = '0';
            input.max = '100';
            input.step = '0.1';
            input.placeholder = '20';
        }
    } else {
        if (label) label.textContent = 'Target Amount (Rp)';
        if (placeholder) placeholder.textContent = 'e.g., 1000000';
        if (input) {
            input.type = 'number';
            input.min = '0';
            input.removeAttribute('max'); // Remove max constraint for fixed amount
            input.step = '1000';
            input.placeholder = '1000000';
        }
    }
}

// Populate Savings Goals List Modal
function renderSavingsListModal() {
    const savingsListModal = document.getElementById('savings-list-modal');
    if (!savingsListModal) return;

    if (savingsGoals.length === 0) {
        savingsListModal.innerHTML = '<p class="empty-state">No savings goals set yet.</p>';
        return;
    }

    savingsListModal.innerHTML = savingsGoals.map(goal => {
        const monthDate = new Date(goal.month + '-01');
        const monthLabel = monthDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        const targetDisplay = goal.target_type === 'percentage' 
            ? `${goal.target_value}% of income`
            : `Rp ${Number(goal.target_value).toLocaleString()}`;

        return `
            <div class="category-item">
                <span class="category-item-name">
                    ${monthLabel} - ${targetDisplay}
                </span>
                <div class="category-item-actions">
                    <button class="btn-edit-category" data-id="${goal.id}" data-month="${goal.month}">Edit</button>
                    <button class="btn-delete-category" data-id="${goal.id}">Delete</button>
                </div>
            </div>
        `;
    }).join('');

    // Add event listeners
    savingsListModal.querySelectorAll('.btn-edit-category').forEach(btn => {
        btn.addEventListener('click', () => {
            const month = btn.getAttribute('data-month');
            const goal = savingsGoals.find(g => g.month === month);
            if (goal) {
                const savingsModal = document.getElementById('savings-modal');
                if (savingsModal) {
                    savingsModal.classList.remove('hidden');
                    // Set form values
                    const savingsMonthInput = document.getElementById('savings-month');
                    const savingsTypeInput = document.querySelector(`input[name="savings-target-type"][value="${goal.target_type}"]`);
                    const savingsValueInput = document.getElementById('savings-target-value');
                    
                    if (savingsMonthInput) savingsMonthInput.value = goal.month;
                    if (savingsTypeInput) savingsTypeInput.checked = true;
                    if (savingsValueInput) savingsValueInput.value = goal.target_value;
                    
                    updateSavingsFormLabels();
                }
            }
        });
    });

    savingsListModal.querySelectorAll('.btn-delete-category').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            const result = await Swal.fire({
                title: 'Are you sure?',
                text: 'You want to delete this savings goal?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, delete it!'
            });

            if (result.isConfirmed) {
                await deleteSavingsGoal(id);
                renderSavingsListModal();
            }
        });
    });
}

// Export module
window.savingsModule = {
    fetchSavingsGoals,
    setSavingsGoal,
    deleteSavingsGoal,
    calculateSavingsProgress,
    renderSavingsCard,
    initSavingsForm,
    updateSavingsFormLabels,
    renderSavingsListModal,
    getCurrentSavingsGoal,
    savingsGoals: () => savingsGoals
};
