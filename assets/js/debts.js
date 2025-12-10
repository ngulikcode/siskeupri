// Debts Management Module

let debts = [];
let debtPayments = [];

// Initialize debts module
async function initDebts() {
    await fetchDebts();
    await fetchDebtPayments();
    setupDebtEventListeners();
    renderDebtOverview();
}

// Fetch Debts
async function fetchDebts() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching debts:', error);
        return;
    }

    debts = data || [];
    renderDebtOverview();
    renderDebtListModal();
}

// Fetch Debt Payments
async function fetchDebtPayments() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
        .from('debt_payments')
        .select('*')
        .eq('user_id', user.id)
        .order('payment_date', { ascending: false });

    if (error) {
        console.error('Error fetching debt payments:', error);
        return;
    }

    debtPayments = data || [];
}

// Add Debt
async function addDebt(debtData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Calculate remaining amount
    const remainingAmount = debtData.total_amount - (debtData.paid_amount || 0);
    
    // Calculate next payment date based on frequency
    let nextPaymentDate = null;
    if (debtData.payment_frequency && debtData.payment_frequency !== 'one_time') {
        const startDate = new Date(debtData.start_date);
        if (debtData.payment_frequency === 'monthly') {
            nextPaymentDate = new Date(startDate);
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
        } else if (debtData.payment_frequency === 'weekly') {
            nextPaymentDate = new Date(startDate);
            nextPaymentDate.setDate(nextPaymentDate.getDate() + 7);
        } else if (debtData.payment_frequency === 'daily') {
            nextPaymentDate = new Date(startDate);
            nextPaymentDate.setDate(nextPaymentDate.getDate() + 1);
        } else if (debtData.payment_frequency === 'yearly') {
            nextPaymentDate = new Date(startDate);
            nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
        }
    }

    const { data, error } = await supabase
        .from('debts')
        .insert([{
            user_id: user.id,
            type: debtData.type,
            name: debtData.name,
            total_amount: debtData.total_amount,
            paid_amount: debtData.paid_amount || 0,
            remaining_amount: remainingAmount,
            start_date: debtData.start_date,
            due_date: debtData.due_date || null,
            interest_rate: debtData.interest_rate || 0,
            payment_frequency: debtData.payment_frequency || 'one_time',
            next_payment_date: nextPaymentDate ? nextPaymentDate.toISOString().split('T')[0] : null,
            status: remainingAmount <= 0 ? 'paid' : 'active',
            account_id: debtData.account_id || null,
            notes: debtData.notes || null
        }])
        .select()
        .single();

    if (error) {
        console.error('Error adding debt:', error);
        Swal.fire('Error', error.message, 'error');
        return false;
    }

    await fetchDebts();
    Swal.fire('Success', 'Debt added successfully', 'success');
    return true;
}

// Update Debt
async function updateDebt(id, debtData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const remainingAmount = debtData.total_amount - (debtData.paid_amount || 0);

    const { error } = await supabase
        .from('debts')
        .update({
            type: debtData.type,
            name: debtData.name,
            total_amount: debtData.total_amount,
            paid_amount: debtData.paid_amount || 0,
            remaining_amount: remainingAmount,
            start_date: debtData.start_date,
            due_date: debtData.due_date || null,
            interest_rate: debtData.interest_rate || 0,
            payment_frequency: debtData.payment_frequency || 'one_time',
            account_id: debtData.account_id || null,
            notes: debtData.notes || null,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error updating debt:', error);
        Swal.fire('Error', error.message, 'error');
        return false;
    }

    await fetchDebts();
    Swal.fire('Success', 'Debt updated successfully', 'success');
    return true;
}

// Delete Debt
async function deleteDebt(id) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const result = await Swal.fire({
        title: 'Are you sure?',
        text: 'This will delete the debt and all its payment history.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) return false;

    const { error } = await supabase
        .from('debts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error deleting debt:', error);
        Swal.fire('Error', error.message, 'error');
        return false;
    }

    await fetchDebts();
    Swal.fire('Deleted!', 'Debt has been deleted.', 'success');
    return true;
}

// Add Debt Payment
async function addDebtPayment(paymentData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Insert payment
    const { data: payment, error: paymentError } = await supabase
        .from('debt_payments')
        .insert([{
            debt_id: paymentData.debt_id,
            user_id: user.id,
            amount: paymentData.amount,
            payment_date: paymentData.payment_date,
            account_id: paymentData.account_id || null,
            transaction_id: paymentData.transaction_id || null,
            notes: paymentData.notes || null
        }])
        .select()
        .single();

    if (paymentError) {
        console.error('Error adding debt payment:', paymentError);
        Swal.fire('Error', paymentError.message, 'error');
        return false;
    }

    // Update debt paid_amount and remaining_amount
    const debt = debts.find(d => d.id === paymentData.debt_id);
    if (debt) {
        const newPaidAmount = (debt.paid_amount || 0) + paymentData.amount;
        const newRemainingAmount = debt.total_amount - newPaidAmount;
        
        const { error: updateError } = await supabase
            .from('debts')
            .update({
                paid_amount: newPaidAmount,
                remaining_amount: newRemainingAmount,
                status: newRemainingAmount <= 0 ? 'paid' : 
                       (debt.due_date && new Date(debt.due_date) < new Date() && newRemainingAmount > 0 ? 'overdue' : 'active'),
                updated_at: new Date().toISOString()
            })
            .eq('id', paymentData.debt_id);

        if (updateError) {
            console.error('Error updating debt:', updateError);
        }
    }

    // Create transaction if requested
    if (paymentData.create_transaction === 'yes' && paymentData.account_id) {
        const debt = debts.find(d => d.id === paymentData.debt_id);
        if (debt) {
            const accountName = await getAccountName(paymentData.account_id);
            const transactionType = debt.type === 'debt' ? 'expense' : 'income';
            const description = `Payment for ${debt.name} ${debt.type === 'debt' ? 'debt' : 'credit'}`;
            
            if (window.addTransaction) {
                await window.addTransaction({
                    type: transactionType,
                    amount: paymentData.amount,
                    category: debt.type === 'debt' ? 'Debt Payment' : 'Credit Collection',
                    account: accountName,
                    date: paymentData.payment_date,
                    description: description
                });
            }
        }
    }

    await fetchDebts();
    await fetchDebtPayments();
    Swal.fire('Success', 'Payment recorded successfully', 'success');
    return true;
}

// Get Account Name by ID
async function getAccountName(accountId) {
    if (!accountId) return '';
    if (window.accountModule && window.accountModule.getAccountName) {
        return window.accountModule.getAccountName(accountId);
    }
    return '';
}

// Render Debt Overview
function renderDebtOverview() {
    const debtList = document.getElementById('debt-list');
    if (!debtList) return;

    const activeDebts = debts.filter(d => d.status === 'active' || d.status === 'overdue');
    
    if (activeDebts.length === 0) {
        debtList.innerHTML = '<p class="empty-state">No active debts. Click "Manage Debts" to add.</p>';
        return;
    }

    debtList.innerHTML = '';
    activeDebts.slice(0, 5).forEach(debt => {
        const item = createDebtItem(debt);
        debtList.appendChild(item);
    });
}

// Create Debt Item Element
function createDebtItem(debt) {
    const div = document.createElement('div');
    div.className = 'debt-item';
    div.dataset.debtId = debt.id;

    const percentage = debt.total_amount > 0 ? ((debt.paid_amount || 0) / debt.total_amount) * 100 : 0;
    const isOverdue = debt.status === 'overdue';
    const typeLabel = debt.type === 'debt' ? 'Utang' : 'Piutang';
    const typeIcon = debt.type === 'debt' ? '📉' : '📈';
    const statusClass = isOverdue ? 'overdue' : debt.status === 'paid' ? 'paid' : 'active';

    div.innerHTML = `
        <div class="debt-item-header">
            <div>
                <span class="debt-type-icon">${typeIcon}</span>
                <span class="debt-name">${escapeHtml(debt.name)}</span>
                <span class="debt-type-badge">${typeLabel}</span>
            </div>
            <div class="debt-status ${statusClass}">${debt.status.toUpperCase()}</div>
        </div>
        <div class="debt-amounts">
            <span>Total: Rp ${formatCurrency(debt.total_amount)}</span>
            <span>Paid: Rp ${formatCurrency(debt.paid_amount || 0)}</span>
            <span class="debt-remaining">Remaining: Rp ${formatCurrency(debt.remaining_amount || 0)}</span>
        </div>
        <div class="debt-progress-container">
            <div class="debt-progress-bar">
                <div class="debt-progress-fill ${statusClass}" style="width: ${Math.min(percentage, 100)}%">
                    ${Math.round(percentage)}%
                </div>
            </div>
        </div>
        ${debt.due_date ? `<div class="debt-due-date">Due: ${formatDate(debt.due_date)}</div>` : ''}
        <div class="debt-item-actions">
            <button class="btn-record-payment" data-debt-id="${debt.id}">Record Payment</button>
            <button class="btn-edit-debt" data-debt-id="${debt.id}">Edit</button>
            <button class="btn-delete-debt" data-debt-id="${debt.id}">Delete</button>
        </div>
    `;

    return div;
}

// Render Debt List Modal
function renderDebtListModal() {
    const debtListModal = document.getElementById('debts-list-modal');
    if (!debtListModal) return;

    if (debts.length === 0) {
        debtListModal.innerHTML = '<p class="empty-state">No debts tracked. Add one above.</p>';
        return;
    }

    debtListModal.innerHTML = '';
    debts.forEach(debt => {
        const item = createDebtItem(debt);
        debtListModal.appendChild(item);
    });
}

// Setup Event Listeners
function setupDebtEventListeners() {
    // Manage Debts Button
    const manageDebtsBtn = document.getElementById('manage-debts-btn');
    if (manageDebtsBtn) {
        manageDebtsBtn.addEventListener('click', () => {
            const debtModal = document.getElementById('debt-modal');
            if (debtModal) {
                debtModal.classList.remove('hidden');
                populateAccountSelect('debt-account');
                const startDateInput = document.getElementById('debt-start-date');
                if (startDateInput) {
                    startDateInput.valueAsDate = new Date();
                }
            }
        });
    }

    // Close Debt Modal
    const closeDebtModalBtn = document.getElementById('close-debt-modal-btn');
    if (closeDebtModalBtn) {
        closeDebtModalBtn.addEventListener('click', () => {
            const debtModal = document.getElementById('debt-modal');
            if (debtModal) {
                debtModal.classList.add('hidden');
                document.getElementById('add-debt-form')?.reset();
            }
        });
    }

    // Add Debt Form
    const addDebtForm = document.getElementById('add-debt-form');
    if (addDebtForm) {
        addDebtForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const type = document.querySelector('input[name="debt-type"]:checked')?.value;
            const name = document.getElementById('debt-name').value;
            const totalAmount = parseFloat(document.getElementById('debt-total-amount').value);
            const startDate = document.getElementById('debt-start-date').value;
            const dueDate = document.getElementById('debt-due-date').value;
            const interestRate = parseFloat(document.getElementById('debt-interest-rate').value) || 0;
            const paymentFrequency = document.getElementById('debt-payment-frequency').value;
            const accountId = document.getElementById('debt-account').value || null;
            const notes = document.getElementById('debt-notes').value;

            await addDebt({
                type,
                name,
                total_amount: totalAmount,
                start_date: startDate,
                due_date: dueDate || null,
                interest_rate: interestRate,
                payment_frequency: paymentFrequency,
                account_id: accountId,
                notes
            });

            addDebtForm.reset();
            const debtModal = document.getElementById('debt-modal');
            if (debtModal) {
                debtModal.classList.add('hidden');
            }
        });
    }

    // Record Payment Button (delegated)
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-record-payment')) {
            const debtId = e.target.dataset.debtId;
            const debt = debts.find(d => d.id === debtId);
            if (debt) {
                openPaymentModal(debt);
            }
        }

        if (e.target.classList.contains('btn-edit-debt')) {
            const debtId = e.target.dataset.debtId;
            const debt = debts.find(d => d.id === debtId);
            if (debt) {
                editDebt(debt);
            }
        }

        if (e.target.classList.contains('btn-delete-debt')) {
            const debtId = e.target.dataset.debtId;
            await deleteDebt(debtId);
        }
    });

    // Close Payment Modal
    const closePaymentModalBtn = document.getElementById('close-debt-payment-modal-btn');
    if (closePaymentModalBtn) {
        closePaymentModalBtn.addEventListener('click', () => {
            const paymentModal = document.getElementById('debt-payment-modal');
            if (paymentModal) {
                paymentModal.classList.add('hidden');
                document.getElementById('add-debt-payment-form')?.reset();
            }
        });
    }

    // Add Payment Form
    const addPaymentForm = document.getElementById('add-debt-payment-form');
    if (addPaymentForm) {
        addPaymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const debtId = document.getElementById('payment-debt-id').value;
            const amount = parseFloat(document.getElementById('payment-amount').value);
            const paymentDate = document.getElementById('payment-date').value;
            const accountId = document.getElementById('payment-account').value || null;
            const createTransaction = document.querySelector('input[name="create-transaction"]:checked')?.value;
            const notes = document.getElementById('payment-notes').value;

            await addDebtPayment({
                debt_id: debtId,
                amount,
                payment_date: paymentDate,
                account_id: accountId,
                create_transaction: createTransaction,
                notes
            });

            addPaymentForm.reset();
            const paymentModal = document.getElementById('debt-payment-modal');
            if (paymentModal) {
                paymentModal.classList.add('hidden');
            }
        });
    }
}

// Open Payment Modal
function openPaymentModal(debt) {
    const paymentModal = document.getElementById('debt-payment-modal');
    if (!paymentModal) return;

    document.getElementById('payment-debt-id').value = debt.id;
    document.getElementById('payment-debt-name').value = `${debt.name} (${debt.type === 'debt' ? 'Utang' : 'Piutang'})`;
    document.getElementById('payment-amount').value = '';
    document.getElementById('payment-date').valueAsDate = new Date();
    populateAccountSelect('payment-account');
    
    paymentModal.classList.remove('hidden');
}

// Edit Debt
function editDebt(debt) {
    const debtModal = document.getElementById('debt-modal');
    if (!debtModal) return;

    document.querySelector(`input[name="debt-type"][value="${debt.type}"]`).checked = true;
    document.getElementById('debt-name').value = debt.name;
    document.getElementById('debt-total-amount').value = debt.total_amount;
    document.getElementById('debt-start-date').value = debt.start_date;
    document.getElementById('debt-due-date').value = debt.due_date || '';
    document.getElementById('debt-interest-rate').value = debt.interest_rate || 0;
    document.getElementById('debt-payment-frequency').value = debt.payment_frequency || 'one_time';
    document.getElementById('debt-account').value = debt.account_id || '';
    document.getElementById('debt-notes').value = debt.notes || '';

    populateAccountSelect('debt-account');
    
    // Change form to update mode
    const form = document.getElementById('add-debt-form');
    form.dataset.editId = debt.id;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Update Debt';

    // Update form submit handler
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const type = document.querySelector('input[name="debt-type"]:checked')?.value;
        const name = document.getElementById('debt-name').value;
        const totalAmount = parseFloat(document.getElementById('debt-total-amount').value);
        const startDate = document.getElementById('debt-start-date').value;
        const dueDate = document.getElementById('debt-due-date').value;
        const interestRate = parseFloat(document.getElementById('debt-interest-rate').value) || 0;
        const paymentFrequency = document.getElementById('debt-payment-frequency').value;
        const accountId = document.getElementById('debt-account').value || null;
        const notes = document.getElementById('debt-notes').value;

        await updateDebt(debt.id, {
            type,
            name,
            total_amount: totalAmount,
            paid_amount: debt.paid_amount || 0,
            start_date: startDate,
            due_date: dueDate || null,
            interest_rate: interestRate,
            payment_frequency: paymentFrequency,
            account_id: accountId,
            notes
        });

        form.reset();
        form.dataset.editId = '';
        submitBtn.textContent = 'Add Debt';
        form.onsubmit = null;
        debtModal.classList.add('hidden');
    };

    debtModal.classList.remove('hidden');
}

// Populate Account Select
async function populateAccountSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    if (window.accountModule && window.accountModule.fetchAccounts) {
        await window.accountModule.fetchAccounts();
        const accounts = window.accountModule.latestData || [];
        
        // Keep first option
        const firstOption = select.querySelector('option');
        select.innerHTML = '';
        if (firstOption) {
            select.appendChild(firstOption);
        }

        accounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account.id;
            option.textContent = account.name;
            select.appendChild(option);
        });
    }
}

// Utility Functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID').format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export module
window.debtModule = {
    initDebts,
    fetchDebts,
    addDebt,
    updateDebt,
    deleteDebt,
    addDebtPayment,
    renderDebtOverview,
    debts: () => debts,
    debtPayments: () => debtPayments
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.supabase) {
            initDebts();
        }
    });
} else {
    if (window.supabase) {
        initDebts();
    }
}

