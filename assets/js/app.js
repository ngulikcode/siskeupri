// Main App Logic
let currentPage = 1;
const itemsPerPage = 5; // jumlah transaksi per halaman

let transactions = [];
let categories = [];
let editingTransactionId = null;
let searchQuery = '';
let chartInstance = null;

// DOM Elements
const transactionForm = document.getElementById('transaction-form');
const transactionsTableBody = document.querySelector('#transactions-table tbody');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const totalBalanceEl = document.getElementById('total-balance');
const filterType = document.getElementById('filter-type');
const filterDate = document.getElementById('filter-date');
const downloadBtn = document.getElementById('download-btn');
const categorySelect = document.getElementById('category');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const submitBtn = document.getElementById('submit-transaction-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const transactionFormCard = document.querySelector('.transaction-form-card');
const filterAccount = document.getElementById('filter-account');
const accountSelect = document.getElementById('account');
const getDefaultAccountName = () => (window.accountModule && window.accountModule.getDefaultAccountName) ? window.accountModule.getDefaultAccountName() : '';

// Set default date filter to empty (show all dates by default)
// User can select a specific date to filter, or leave empty to see all dates
filterDate.value = '';
document.getElementById('date').valueAsDate = new Date();

// Load Data
window.loadDashboardData = async () => {
    await fetchCategories();
    await fetchTransactions();
    if (window.accountModule) {
        await window.accountModule.fetchAccounts();
    }
    
    // Load budgets and recurring transactions
    if (window.budgetModule) {
        window.budgetModule.initBudgetMonth();
        await window.budgetModule.fetchBudgets();
    }
    
    if (window.recurringModule) {
        await window.recurringModule.fetchRecurringTransactions();
        // Auto-generate pending recurring transactions
        await window.recurringModule.generatePendingRecurring();
        // Reload transactions after generation
        await fetchTransactions();
    }
    
    // Load savings goals
    if (window.savingsModule) {
        await window.savingsModule.fetchSavingsGoals();
    }
    
    // Load debts
    if (window.debtModule) {
        await window.debtModule.fetchDebts();
    }
    
    updateUI();
    
    // Dispatch event bahwa dashboard data sudah dimuat
    document.dispatchEvent(new Event('dashboardDataLoaded'));
};

// Signal that app.js is loaded
document.dispatchEvent(new Event('appReady'));

// Check if user is already logged in when app.js loads (in case auth listener fired before app.js)
supabase.auth.getUser().then(({ data: { user } }) => {
    if (user) {
        window.loadDashboardData();
    }
});

// Fetch Transactions from Supabase
async function fetchTransactions() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

    const { data, error } = await query;
    if (error) {
        console.error('Error fetching transactions:', error);
        return;
    }
    transactions = data;
    window.allTransactions = transactions; // Expose for AI Assistant
}

// ===== CATEGORY MANAGEMENT =====

// Default categories
const DEFAULT_CATEGORIES = {
    income: ['Gaji', 'Bonus', 'Investasi', 'Freelance', 'Lainnya'],
    expense: ['Makan', 'Transport', 'Belanja', 'Tagihan', 'Hiburan', 'Kesehatan', 'Lainnya']
};

// Fetch Categories from Supabase
async function fetchCategories() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

    if (error) {
        console.error('Error fetching categories:', error);
        return;
    }

    categories = data;

    // If no categories exist, seed default ones
    if (categories.length === 0) {
        await seedDefaultCategories();
    }

    // Update category dropdown based on current transaction type
    const currentType = document.querySelector('input[name="type"]:checked').value;
    populateCategoryDropdown(currentType);
}

// Seed default categories for new users
async function seedDefaultCategories() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const categoriesToInsert = [];

    // Add income categories
    DEFAULT_CATEGORIES.income.forEach(name => {
        categoriesToInsert.push({
            user_id: user.id,
            name: name,
            type: 'income',
            is_default: true
        });
    });

    // Add expense categories
    DEFAULT_CATEGORIES.expense.forEach(name => {
        categoriesToInsert.push({
            user_id: user.id,
            name: name,
            type: 'expense',
            is_default: true
        });
    });

    const { error } = await supabase
        .from('categories')
        .insert(categoriesToInsert);

    if (error) {
        console.error('Error seeding categories:', error);
    } else {
        await fetchCategories();
    }
}

// Populate category dropdown based on transaction type
function populateCategoryDropdown(type) {
    const filteredCategories = categories.filter(cat => cat.type === type);
    
    categorySelect.innerHTML = '<option value="">Select Category</option>';
    
    filteredCategories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name;
        option.textContent = cat.name;
        categorySelect.appendChild(option);
    });
}

// Add new category
async function addCategory(name, type) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
        .from('categories')
        .insert([{
            user_id: user.id,
            name: name,
            type: type,
            is_default: false
        }])
        .select();

    if (error) {
        if (error.code === '23505') { // Unique constraint violation
            Swal.fire('Error', 'Category already exists!', 'error');
        } else {
            Swal.fire('Error', 'Error adding category: ' + error.message, 'error');
        }
        return false;
    }

    await fetchCategories();
    renderCategoryLists();
    return true;
}

// Update category
async function updateCategory(id, newName) {
    const { error } = await supabase
        .from('categories')
        .update({ name: newName })
        .eq('id', id);

    if (error) {
        Swal.fire('Error', 'Error updating category: ' + error.message, 'error');
        return false;
    }

    await fetchCategories();
    renderCategoryLists();
    return true;
}

// Delete category
async function deleteCategory(id) {
    const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

    if (error) {
        Swal.fire('Error', 'Error deleting category: ' + error.message, 'error');
        return false;
    }

    await fetchCategories();
    renderCategoryLists();
    return true;
}

// Render category lists in modal
function renderCategoryLists() {
    const incomeList = document.getElementById('income-categories-list');
    const expenseList = document.getElementById('expense-categories-list');

    const incomeCategories = categories.filter(cat => cat.type === 'income');
    const expenseCategories = categories.filter(cat => cat.type === 'expense');

    // Render income categories
    incomeList.innerHTML = '';
    incomeCategories.forEach(cat => {
        const item = createCategoryItem(cat);
        incomeList.appendChild(item);
    });

    // Render expense categories
    expenseList.innerHTML = '';
    expenseCategories.forEach(cat => {
        const item = createCategoryItem(cat);
        expenseList.appendChild(item);
    });
}

// Create category item element
function createCategoryItem(category) {
    const div = document.createElement('div');
    div.className = `category-item ${category.is_default ? 'default' : ''}`;
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'category-item-name';
    nameSpan.textContent = category.name;
    
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'category-item-actions';
    
    // Edit button (only for non-default categories)
    if (!category.is_default) {
        const editBtn = document.createElement('button');
        editBtn.className = 'btn-edit-category';
        editBtn.textContent = 'Edit';
        editBtn.onclick = () => editCategoryPrompt(category);
        actionsDiv.appendChild(editBtn);
    }
    
    // Delete button (disabled for default categories)
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete-category';
    deleteBtn.textContent = 'Delete';
    deleteBtn.disabled = category.is_default;
    if (!category.is_default) {
        deleteBtn.onclick = () => deleteCategoryPrompt(category);
    }
    actionsDiv.appendChild(deleteBtn);
    
    div.appendChild(nameSpan);
    div.appendChild(actionsDiv);
    
    return div;
}

// Edit category prompt
function editCategoryPrompt(category) {
    const newName = prompt('Enter new category name:', category.name);
    if (newName && newName.trim() !== '' && newName !== category.name) {
        updateCategory(category.id, newName.trim());
    }
}

// Delete category prompt
function deleteCategoryPrompt(category) {
    Swal.fire({
        title: 'Are you sure?',
        text: `You want to delete "${category.name}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
        if (result.isConfirmed) {
            deleteCategory(category.id);
        }
    });
}

// ===== TRANSACTION MANAGEMENT =====

// Add or Edit Transaction
transactionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const formData = {
        user_id: user.id,
        type: document.querySelector('input[name="type"]:checked').value,
        amount: parseFloat(document.getElementById('amount').value),
        category: document.getElementById('category').value,
        date: document.getElementById('date').value,
        description: document.getElementById('description').value,
        account: accountSelect?.value || 'Uang Tunai'
    };

    if (editingTransactionId) {
        // Update existing transaction
        try {
            // Handle attachment if changed
            const currentFile = window.attachmentModule?.getCurrentFile();
            const editingUrl = window.attachmentModule?.getEditingUrl();
            
            if (currentFile) {
                // New file uploaded - delete old and upload new
                if (editingUrl) {
                    await window.attachmentModule.deleteAttachment(editingUrl);
                }
                const attachmentData = await window.attachmentModule.uploadAttachment(currentFile, editingTransactionId);
                formData.attachment_url = attachmentData.url;
                formData.attachment_name = attachmentData.name;
                formData.attachment_size = attachmentData.size;
            } else if (!window.attachmentModule?.getCurrentUrl() && editingUrl) {
                // Attachment was removed
                await window.attachmentModule.deleteAttachment(editingUrl);
                formData.attachment_url = null;
                formData.attachment_name = null;
                formData.attachment_size = null;
            }
            // If no changes to attachment, don't update attachment fields

            let { error } = await supabase
                .from('transactions')
                .update(formData)
                .eq('id', editingTransactionId);

            // Fallback if attachment columns don't exist
            if (error && (/attachment/.test(error.message || '') || /account/.test(error.message || ''))) {
                const fallbackData = {
                    user_id: formData.user_id,
                    type: formData.type,
                    amount: formData.amount,
                    category: formData.category,
                    date: formData.date,
                    description: formData.description
                };
                if (formData.account) fallbackData.account = formData.account;
                
                const { error: fallbackError } = await supabase
                    .from('transactions')
                    .update(fallbackData)
                    .eq('id', editingTransactionId);
                error = fallbackError;
            }

            if (error) {
                Swal.fire('Error', 'Error updating transaction: ' + error.message, 'error');
            } else {
                Swal.fire('Success', 'Transaction updated successfully', 'success');
                cancelEdit();
                await fetchTransactions();
                updateUI();
                if (window.checkAndGenerateNotifications) {
                    setTimeout(() => window.checkAndGenerateNotifications(), 500);
                }
            }
        } catch (error) {
            console.error('Error updating transaction:', error);
            Swal.fire('Error', 'Error updating transaction: ' + error.message, 'error');
        }
    } else {
        // Insert new transaction
        try {
            let { data, error } = await supabase
                .from('transactions')
                .insert([formData])
                .select();

            // Fallback if 'account' column does not exist
            if (error && /account/.test(error.message || '')) {
                const { data: data2, error: fallbackError } = await supabase
                    .from('transactions')
                    .insert([{ 
                        user_id: formData.user_id,
                        type: formData.type,
                        amount: formData.amount,
                        category: formData.category,
                        date: formData.date,
                        description: formData.description
                    }])
                    .select();
                data = data2;
                error = fallbackError;
            }

            if (error) {
                Swal.fire('Error', 'Error adding transaction: ' + error.message, 'error');
                return;
            }

            // Upload attachment if present
            const currentFile = window.attachmentModule?.getCurrentFile();
            if (currentFile && data && data[0]) {
                try {
                    const attachmentData = await window.attachmentModule.uploadAttachment(currentFile, data[0].id);
                    
                    // Update transaction with attachment info
                    const { error: updateError } = await supabase
                        .from('transactions')
                        .update({
                            attachment_url: attachmentData.url,
                            attachment_name: attachmentData.name,
                            attachment_size: attachmentData.size
                        })
                        .eq('id', data[0].id);
                    
                    if (updateError) {
                        console.error('Error updating attachment info:', updateError);
                    }
                } catch (attachError) {
                    console.error('Error uploading attachment:', attachError);
                    Swal.fire('Warning', 'Transaction added but attachment upload failed', 'warning');
                }
            }

            Swal.fire('Success', 'Transaction added successfully', 'success');
            transactionForm.reset();
            document.getElementById('date').valueAsDate = new Date();
            if (window.attachmentModule) window.attachmentModule.clearAttachment();
            await fetchTransactions();
            updateUI();
            if (window.checkAndGenerateNotifications) {
                setTimeout(() => window.checkAndGenerateNotifications(), 500);
            }
        } catch (error) {
            console.error('Error adding transaction:', error);
            Swal.fire('Error', 'Error adding transaction: ' + error.message, 'error');
        }
    }
});

// Edit Transaction
function editTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;

    // Set edit mode
    editingTransactionId = id;
    
    // Populate form
    document.querySelector(`input[name="type"][value="${transaction.type}"]`).checked = true;
    populateCategoryDropdown(transaction.type);
    document.getElementById('amount').value = transaction.amount;
    document.getElementById('category').value = transaction.category;
    document.getElementById('date').value = transaction.date;
    document.getElementById('description').value = transaction.description || '';
    if (accountSelect) accountSelect.value = transaction.account || 'Uang Tunai';

    // Load attachment if exists
    if (window.attachmentModule && transaction.attachment_url) {
        window.attachmentModule.loadAttachmentForEdit(transaction.attachment_url, transaction.attachment_name);
    } else if (window.attachmentModule) {
        window.attachmentModule.clearAttachment();
    }

    // Update UI for edit mode
    submitBtn.textContent = 'Update Transaction';
    cancelEditBtn.classList.remove('hidden');
    transactionFormCard.classList.add('edit-mode');

    // Scroll to form
    transactionFormCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Cancel Edit
function cancelEdit() {
    editingTransactionId = null;
    transactionForm.reset();
    document.getElementById('date').valueAsDate = new Date();
    submitBtn.textContent = 'Add Transaction';
    cancelEditBtn.classList.add('hidden');
    transactionFormCard.classList.remove('edit-mode');
    if (window.attachmentModule) {
        window.attachmentModule.clearAttachment();
        window.attachmentModule.setEditingUrl(null);
    }
}

// Delete Transaction
async function deleteTransaction(id) {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You want to delete this transaction?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) return;

    // Get transaction to check for attachment
    const transaction = transactions.find(t => t.id === id);

    const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

    if (error) {
        Swal.fire('Error', 'Error deleting transaction: ' + error.message, 'error');
    } else {
        // Delete attachment if exists
        if (transaction?.attachment_url && window.attachmentModule) {
            await window.attachmentModule.deleteAttachment(transaction.attachment_url);
        }
        
        Swal.fire('Success', 'Transaction deleted successfully', 'success');
        await fetchTransactions();
        updateUI();
        // Check for new notifications after transaction is deleted
        if (window.checkAndGenerateNotifications) {
            setTimeout(() => window.checkAndGenerateNotifications(), 500);
        }
    }
}

// Update UI (Table, Stats, Charts)
function updateUI() {
    const typeFilter = filterType.value;
    const dateFilter = filterDate.value; // YYYY-MM-DD or empty
    const accountFilter = filterAccount ? filterAccount.value : 'all';

    const filteredTransactions = transactions.filter(t => {
        const matchesType = typeFilter === 'all' || t.type === typeFilter;
        // If dateFilter is empty, show all dates
        // If dateFilter has value, match exact date (YYYY-MM-DD) or month (YYYY-MM)
        let matchesDate = true;
        if (dateFilter) {
            if (dateFilter.length === 10) {
                // Full date selected (YYYY-MM-DD) - exact match
                matchesDate = t.date === dateFilter;
            } else if (dateFilter.length === 7) {
                // Month selected (YYYY-MM) - match by month
                matchesDate = t.date.startsWith(dateFilter);
            } else {
                // Fallback: match by starts with
                matchesDate = t.date.startsWith(dateFilter);
            }
        }
        const matchesAccount = accountFilter === 'all' || ((t.account || getDefaultAccountName()) === accountFilter);
        const matchesSearch = !searchQuery || 
            t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.category.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesDate && matchesAccount && matchesSearch;
    });

    renderTable(filteredTransactions);
    updateStats(filteredTransactions);
    // Simpan transaksi yang sedang ditampilkan untuk modul chart
    window.transactions = filteredTransactions;

    // Render chart sesuai tab aktif
    if (window.switchChart && typeof window.currentChartType !== 'undefined') {
        window.switchChart(window.currentChartType);
    } else if (window.updateChart) {
        // Fallback: tampilkan chart utama bila tab tidak dikenal
        window.updateChart(filteredTransactions);
    }
    if (window.accountModule) window.accountModule.renderAccountOverview(filteredTransactions);
    if (window.accountModule) window.accountModule.renderAccountBadges(filteredTransactions);
    // Savings card uses all transactions (not filtered) because it calculates monthly savings
    if (window.savingsModule) window.savingsModule.renderSavingsCard(transactions);
}

function renderTable(data) {
    // Hitung total halaman
    const totalPages = Math.ceil(data.length / itemsPerPage);

    // Pastikan currentPage tidak melebihi totalPages
    if (currentPage > totalPages) currentPage = totalPages || 1;

    const start = (currentPage - 1) * itemsPerPage;
    const paginatedData = data.slice(start, start + itemsPerPage);

    // Helper function to check if transaction is a transfer
    function isTransfer(t) {
        return (t.category || '').toLowerCase().startsWith('transfer ');
    }

    // Render Table
    transactionsTableBody.innerHTML = '';
    paginatedData.forEach(t => {
        const row = document.createElement('tr');
        const isTransferTransaction = isTransfer(t);
        const transferClass = isTransferTransaction ? 'transfer-row' : '';
        const typeDisplay = isTransferTransaction ? 'Transfer' : t.type.charAt(0).toUpperCase() + t.type.slice(1);
        row.innerHTML = `
            <td>${t.date}</td>
            <td>${t.account || getDefaultAccountName() || '-'}</td>
            <td>${t.category}</td>
            <td class="hide-on-mobile">${t.description || '-'}</td>
            <td class="${isTransferTransaction ? 'text-transfer' : (t.type === 'income' ? 'text-income' : 'text-expense')}">
                ${isTransferTransaction ? '↔' : (t.type === 'income' ? '+' : '-')} Rp ${t.amount.toLocaleString()}
            </td>
            <td><span style="text-transform:capitalize">${typeDisplay}</span></td>
            <td class="hide-on-mobile">
                ${t.attachment_url ? `<span class="attachment-icon" onclick="window.attachmentModule.viewAttachment('${t.attachment_url}', '${t.attachment_name || 'Attachment'}')">📎</span>` : '-'}
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-edit" onclick="editTransaction('${t.id}')">Edit</button>
                    <button class="btn-delete" onclick="deleteTransaction('${t.id}')">Delete</button>
                </div>
            </td>
        `;
        if (transferClass) row.classList.add(transferClass);
        transactionsTableBody.appendChild(row);
    });

    // Update page info
    document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages || 1}`;

    // Disable buttons at boundary
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage === totalPages || totalPages === 0;
}


// Update Stats
function updateStats(data) {
    function isTransfer(t) {
        return (t.category || '').toLowerCase().startsWith('transfer ');
    }
    const income = data.filter(t => t.type === 'income' && !isTransfer(t)).reduce((sum, t) => sum + t.amount, 0);
    const expense = data.filter(t => t.type === 'expense' && !isTransfer(t)).reduce((sum, t) => sum + t.amount, 0);
    const balance = income - expense;

    totalIncomeEl.textContent = `Rp ${income.toLocaleString()}`;
    totalExpenseEl.textContent = `Rp ${expense.toLocaleString()}`;
    totalBalanceEl.textContent = `Rp ${balance.toLocaleString()}`;

    // Update account overview if accounts module is loaded
    if (window.accountModule) {
        window.accountModule.renderAccountOverview(data);
    }
}

// Filters Event Listeners
filterType.addEventListener('change', updateUI);
filterDate.addEventListener('change', updateUI);
if (filterAccount) filterAccount.addEventListener('change', () => { currentPage = 1; updateUI(); });

document.getElementById('prev-page').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        updateUI();
    }
});

document.getElementById('next-page').addEventListener('click', () => {
    currentPage++;
    updateUI();
});

// ===== EVENT LISTENERS =====

// Search functionality
let searchTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        searchQuery = e.target.value.trim();
        currentPage = 1; // Reset to first page
        updateUI();
        
        // Show/hide clear button
        if (searchQuery) {
            clearSearchBtn.classList.remove('hidden');
        } else {
            clearSearchBtn.classList.add('hidden');
        }
    }, 300); // Debounce 300ms
});

clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.classList.add('hidden');
    currentPage = 1;
    updateUI();
});

// Transaction type change - update category dropdown
document.querySelectorAll('input[name="type"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        populateCategoryDropdown(e.target.value);
    });
});

// Cancel edit button
cancelEditBtn.addEventListener('click', cancelEdit);

// Category Management Modal
const categoryModal = document.getElementById('category-modal');
const manageCategoriesBtn = document.getElementById('manage-categories-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const addCategoryForm = document.getElementById('add-category-form');

manageCategoriesBtn.addEventListener('click', () => {
    categoryModal.classList.remove('hidden');
    renderCategoryLists();
});

closeModalBtn.addEventListener('click', () => {
    categoryModal.classList.add('hidden');
});

// Close modal when clicking outside
categoryModal.addEventListener('click', (e) => {
    if (e.target === categoryModal) {
        categoryModal.classList.add('hidden');
    }
});

// Add category form
addCategoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('new-category-name').value.trim();
    const type = document.querySelector('input[name="category-type"]:checked').value;
    
    if (name) {
        const success = await addCategory(name, type);
        if (success) {
            addCategoryForm.reset();
        }
    }
});


// Download Report Handler
document.getElementById('download-select').addEventListener('change', (e) => {
    const type = e.target.value;
    if (!type) return;

    if (type === "csv") downloadCSV();
    if (type === "pdf") downloadPDF();

    e.target.value = ""; // reset dropdown
});

// Filter data sesuai UI
function getFilteredData() {
    const typeFilter = filterType.value;
    const dateFilter = filterDate.value; // YYYY-MM-DD or empty
    const accountFilter = filterAccount ? filterAccount.value : 'all';

    return transactions.filter(t => {
        const matchesType = typeFilter === 'all' || t.type === typeFilter;
        // If dateFilter is empty, show all dates
        // If dateFilter has value, match exact date (YYYY-MM-DD) or month (YYYY-MM)
        let matchesDate = true;
        if (dateFilter) {
            if (dateFilter.length === 10) {
                // Full date selected (YYYY-MM-DD) - exact match
                matchesDate = t.date === dateFilter;
            } else if (dateFilter.length === 7) {
                // Month selected (YYYY-MM) - match by month
                matchesDate = t.date.startsWith(dateFilter);
            } else {
                // Fallback: match by starts with
                matchesDate = t.date.startsWith(dateFilter);
            }
        }
        const matchesAccount = accountFilter === 'all' || ((t.account || getDefaultAccountName()) === accountFilter);
        const matchesSearch = !searchQuery || 
            t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.category.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesDate && matchesAccount && matchesSearch;
    });
}

// ----------------------
// DOWNLOAD CSV RAPIH
// ----------------------
function downloadCSV() {
    const data = getFilteredData();
    if (data.length === 0) return Swal.fire('Info', 'No data to export', 'info');

    const header = ["Date", "Account", "Category", "Description", "Type", "Amount"];
    const rows = data.map(t => [
        t.date,
        t.account || '',
        t.category,
        `"${t.description || ''}"`,
        t.type,
        t.amount
    ]);

    const csv = [
        header.join(","),
        ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `report_${filterDate.value || "all"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

async function downloadPDF() {
    const data = getFilteredData();
    if (data.length === 0) return Swal.fire('Info', 'No data to export', 'info');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

    // --- HEADER ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Financial Report", 40, 40);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Period: ${filterDate.value || "All"}`, 40, 60);
    if (filterAccount && filterAccount.value && filterAccount.value !== 'all') {
        doc.text(`Account: ${filterAccount.value}`, 40, 75);
    }
    doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 80);

    // --- SUMMARY ---
    // Helper function to check if transaction is a transfer
    function isTransfer(t) {
        return (t.category || '').toLowerCase().startsWith('transfer ');
    }
    const totalIncome = data.filter(t => t.type === "income" && !isTransfer(t)).reduce((a,b)=>a+b.amount,0);
    const totalExpense = data.filter(t => t.type === "expense" && !isTransfer(t)).reduce((a,b)=>a+b.amount,0);
    const balance = totalIncome - totalExpense;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Summary", 40, 110);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Total Income : Rp ${totalIncome.toLocaleString()}`, 40, 130);
    doc.text(`Total Expense: Rp ${totalExpense.toLocaleString()}`, 40, 150);
    doc.text(`Balance      : Rp ${balance.toLocaleString()}`, 40, 170);

    // --- SPLIT DATA: INCOME & EXPENSE (exclude transfers) ---
    const incomeData = data.filter(t => t.type === "income" && !isTransfer(t))
        .map(t => [t.date, t.category, t.description || "-", "Rp " + t.amount.toLocaleString()]);

    const expenseData = data.filter(t => t.type === "expense" && !isTransfer(t))
        .map(t => [t.date, t.category, t.description || "-", "Rp " + t.amount.toLocaleString()]);

    let yPos = 200; // first table position

    // ---------------------------
    // TABLE 1 → INCOME
    // ---------------------------
    if (incomeData.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("Income Transactions", 40, yPos);

        doc.autoTable({
            startY: yPos + 20,
            head: [["Date", "Category", "Description", "Amount"]],
            body: incomeData,
            styles: { fontSize: 10, cellPadding: 6 },
            headStyles: {
                fillColor: [212, 175, 55],
                textColor: [0, 0, 0],
                fontStyle: "bold"
            },
            alternateRowStyles: { fillColor: [245, 245, 245] }
        });

        yPos = doc.lastAutoTable.finalY + 40;
    } else {
        doc.text("Income Transactions: No Data", 40, yPos);
        yPos += 40;
    }

    // ---------------------------
    // TABLE 2 → EXPENSE
    // ---------------------------
    if (expenseData.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("Expense Transactions", 40, yPos);

        doc.autoTable({
            startY: yPos + 20,
            head: [["Date", "Category", "Description", "Amount"]],
            body: expenseData,
            styles: { fontSize: 10, cellPadding: 6 },
            headStyles: {
                fillColor: [212, 175, 55],
                textColor: [0, 0, 0],
                fontStyle: "bold"
            },
            alternateRowStyles: { fillColor: [245, 245, 245] }
        });
    } else {
        doc.text("Expense Transactions: No Data", 40, yPos);
    }

    // --- FOOTER PAGE NUMBER ---
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(140);
        doc.text(
            `MyDash Finance — Page ${i} of ${pageCount}`,
            doc.internal.pageSize.width - 150,
            doc.internal.pageSize.height - 20
        );
    }

    doc.save(`Financial_Report_${filterDate.value || "all"}.pdf`);
}
