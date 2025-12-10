// Recurring Transactions Management Module

let recurringTransactions = [];

// Fetch Recurring Transactions
async function fetchRecurringTransactions() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
        .from('recurring_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching recurring transactions:', error);
        return;
    }

    recurringTransactions = data;
    renderRecurringOverview();
    renderRecurringListModal();
}

// Add Recurring Transaction
async function addRecurringTransaction(data) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
        .from('recurring_transactions')
        .insert([{
            ...data,
            user_id: user.id
        }]);

    if (error) {
        Swal.fire('Error', 'Error adding recurring transaction: ' + error.message, 'error');
        return false;
    }

    await fetchRecurringTransactions();
    return true;
}

// Update Recurring Transaction
async function updateRecurringTransaction(id, data) {
    const { error } = await supabase
        .from('recurring_transactions')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);

    if (error) {
        Swal.fire('Error', 'Error updating recurring transaction: ' + error.message, 'error');
        return false;
    }

    await fetchRecurringTransactions();
    return true;
}

// Delete Recurring Transaction
async function deleteRecurringTransaction(id) {
    const { error } = await supabase
        .from('recurring_transactions')
        .delete()
        .eq('id', id);

    if (error) {
        Swal.fire('Error', 'Error deleting recurring transaction: ' + error.message, 'error');
        return false;
    }

    await fetchRecurringTransactions();
    return true;
}

// Toggle Recurring Status
async function toggleRecurringStatus(id) {
    const recurring = recurringTransactions.find(r => r.id === id);
    if (!recurring) return;

    return await updateRecurringTransaction(id, { is_active: !recurring.is_active });
}

// Calculate Next Occurrence
function calculateNextOccurrence(recurring) {
    const today = new Date();
    const startDate = new Date(recurring.start_date);
    const lastGen = recurring.last_generated ? new Date(recurring.last_generated) : null;
    
    let nextDate = lastGen || startDate;
    
    switch (recurring.frequency) {
        case 'daily':
            nextDate = new Date(nextDate);
            nextDate.setDate(nextDate.getDate() + 1);
            break;
            
        case 'weekly':
            nextDate = new Date(nextDate);
            nextDate.setDate(nextDate.getDate() + 7);
            break;
            
        case 'monthly':
            nextDate = new Date(nextDate);
            nextDate.setMonth(nextDate.getMonth() + 1);
            if (recurring.day_of_month) {
                nextDate.setDate(recurring.day_of_month);
            }
            break;
            
        case 'yearly':
            nextDate = new Date(nextDate);
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
    }
    
    // If end date is set and next date exceeds it, return null
    if (recurring.end_date && nextDate > new Date(recurring.end_date)) {
        return null;
    }
    
    return nextDate;
}

// Generate Pending Recurring Transactions
async function generatePendingRecurring() {
    const active = recurringTransactions.filter(r => r.is_active);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const recurring of active) {
        const nextDate = calculateNextOccurrence(recurring);
        
        if (!nextDate) continue; // Ended
        
        // If next date is today or in the past, generate transaction
        if (nextDate <= today) {
            await createTransactionFromRecurring(recurring, nextDate);
        }
    }
}

// Create Transaction from Recurring
async function createTransactionFromRecurring(recurring, date) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const transactionData = {
        user_id: user.id,
        type: recurring.type,
        amount: recurring.amount,
        category: recurring.category,
        description: recurring.description || `Recurring: ${recurring.category}`,
        date: date.toISOString().split('T')[0]
    };

    const { error } = await supabase
        .from('transactions')
        .insert([transactionData]);

    if (error) {
        console.error('Error creating recurring transaction:', error);
        return false;
    }

    // Update last_generated
    await supabase
        .from('recurring_transactions')
        .update({ last_generated: date.toISOString().split('T')[0] })
        .eq('id', recurring.id);

    return true;
}

// Render Recurring Overview
function renderRecurringOverview() {
    const recurringList = document.getElementById('recurring-list');
    if (!recurringList) return;

    const active = recurringTransactions.filter(r => r.is_active);
    
    if (active.length === 0) {
        recurringList.innerHTML = '<p class="empty-state">No active recurring transactions.</p>';
        return;
    }

    // Get next 5 upcoming
    const upcoming = active
        .map(r => ({
            ...r,
            nextDate: calculateNextOccurrence(r)
        }))
        .filter(r => r.nextDate)
        .sort((a, b) => a.nextDate - b.nextDate)
        .slice(0, 5);

    if (upcoming.length === 0) {
        recurringList.innerHTML = '<p class="empty-state">No upcoming recurring transactions.</p>';
        return;
    }

    recurringList.innerHTML = '';
    upcoming.forEach(item => {
        const div = document.createElement('div');
        div.className = 'recurring-item';
        
        const nextDateStr = item.nextDate.toLocaleDateString('id-ID', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
        });
        
        div.innerHTML = `
            <div class="recurring-info">
                <div class="recurring-title">
                    ${item.type === 'income' ? '💰' : '💸'} ${item.category}
                </div>
                <div class="recurring-details">
                    <span>Rp ${item.amount.toLocaleString()}</span>
                    <span class="recurring-frequency-badge">${item.frequency}</span>
                    <span class="recurring-next-date">Next: ${nextDateStr}</span>
                </div>
            </div>
        `;
        
        recurringList.appendChild(div);
    });
}

// Render Recurring List in Modal
function renderRecurringListModal() {
    const recurringListModal = document.getElementById('recurring-list-modal');
    if (!recurringListModal) return;

    if (recurringTransactions.length === 0) {
        recurringListModal.innerHTML = '<p class="empty-state">No recurring transactions set up.</p>';
        return;
    }

    recurringListModal.innerHTML = '';
    recurringTransactions.forEach(recurring => {
        const nextDate = calculateNextOccurrence(recurring);
        const nextDateStr = nextDate ? nextDate.toLocaleDateString('id-ID', { 
            day: 'numeric', 
            month: 'short' 
        }) : 'Ended';
        
        const div = document.createElement('div');
        div.className = `recurring-item ${!recurring.is_active ? 'inactive' : ''}`;
        
        div.innerHTML = `
            <div class="recurring-info">
                <div class="recurring-title">
                    ${recurring.type === 'income' ? '💰' : '💸'} ${recurring.category}
                </div>
                <div class="recurring-details">
                    <span>Rp ${recurring.amount.toLocaleString()}</span>
                    <span class="recurring-frequency-badge">${recurring.frequency}</span>
                    <span>Next: ${nextDateStr}</span>
                </div>
            </div>
            <div class="recurring-actions">
                <label class="recurring-toggle">
                    <input type="checkbox" ${recurring.is_active ? 'checked' : ''} 
                           onchange="toggleRecurringStatusHandler('${recurring.id}')">
                    <span class="recurring-toggle-slider"></span>
                </label>
                <button class="btn-delete-recurring" onclick="deleteRecurringPrompt('${recurring.id}')">Delete</button>
            </div>
        `;
        
        recurringListModal.appendChild(div);
    });
}

// Toggle Recurring Status Handler
window.toggleRecurringStatusHandler = async function(id) {
    await toggleRecurringStatus(id);
};

// Delete Recurring Prompt
window.deleteRecurringPrompt = function(id) {
    const recurring = recurringTransactions.find(r => r.id === id);
    Swal.fire({
        title: 'Are you sure?',
        text: `Delete recurring transaction: ${recurring.category}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
        if (result.isConfirmed) {
            deleteRecurringTransaction(id);
        }
    });
};

// Populate Recurring Category Dropdown
function populateRecurringCategoryDropdown(type) {
    const select = document.getElementById('recurring-category');
    if (!select) return;

    const filtered = categories.filter(c => c.type === type);
    
    select.innerHTML = '<option value="">Select Category</option>';
    filtered.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name;
        option.textContent = cat.name;
        select.appendChild(option);
    });
}

// Export functions
window.recurringModule = {
    fetchRecurringTransactions,
    addRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    toggleRecurringStatus,
    calculateNextOccurrence,
    generatePendingRecurring,
    renderRecurringOverview,
    populateRecurringCategoryDropdown
};
