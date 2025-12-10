let accounts = [];

async function fetchAccounts() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
        const { data, error } = await supabase
            .from('accounts')
            .select('*')
            .eq('user_id', user.id)
            .order('name');
        if (error) throw error;
        accounts = (data || []).map(a => ({ ...a, opening_balance: Number(a.opening_balance || 0) }));
    } catch (err) {
        accounts = [
            { id: 'cash', name: 'Uang Tunai', opening_balance: 0 },
            { id: 'bca', name: 'Bank BCA', opening_balance: 0 },
            { id: 'ewallet', name: 'E-Wallet (Gopay/OVO)', opening_balance: 0 }
        ];
    }

    populateAccountDropdowns();
    renderAccountOverview(window.accountModule?.latestData || []);
    renderAccountsListModal();
}

function populateAccountDropdowns() {
    const accountSelect = document.getElementById('account');
    const filterAccount = document.getElementById('filter-account');
    const transferFrom = document.getElementById('transfer-from');
    const transferTo = document.getElementById('transfer-to');
    if (accountSelect) {
        const current = accountSelect.value;
        accountSelect.innerHTML = accounts.map(a => `<option value="${a.name}">${a.name}</option>`).join('');
        const defaultAcc = accounts.find(a => a.is_default);
        if (defaultAcc) accountSelect.value = defaultAcc.name;
        else if (current) accountSelect.value = current;
    }
    if (filterAccount) {
        const current = filterAccount.value;
        filterAccount.innerHTML = `<option value="all">All Accounts</option>` +
            accounts.map(a => `<option value="${a.name}">${a.name}</option>`).join('');
        if (current) filterAccount.value = current;
    }
    if (transferFrom) {
        transferFrom.innerHTML = accounts.map(a => `<option value="${a.name}">${a.name}</option>`).join('');
    }
    if (transferTo) {
        transferTo.innerHTML = accounts.map(a => `<option value="${a.name}">${a.name}</option>`).join('');
    }
}

async function addAccount(name, openingBalance) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    try {
        let { error } = await supabase
            .from('accounts')
            .insert([{ user_id: user.id, name, opening_balance: Number(openingBalance || 0) }]);
        if (error) throw error;
        // Set as default if requested
        const checkbox = document.getElementById('new-account-default');
        if (checkbox && checkbox.checked) {
            // unset others, set this one
            const { data } = await supabase.from('accounts').select('id').eq('user_id', user.id).eq('name', name).limit(1);
            const accId = data && data[0] ? data[0].id : null;
            if (accId) {
                await supabase.from('accounts').update({ is_default: false }).eq('user_id', user.id);
                await supabase.from('accounts').update({ is_default: true }).eq('id', accId);
            }
        }
        await fetchAccounts();
        return true;
    } catch (err) {
        accounts.push({ id: Date.now().toString(), name, opening_balance: Number(openingBalance || 0) });
        populateAccountDropdowns();
        renderAccountsListModal();
        renderAccountOverview(window.accountModule?.latestData || []);
        return true;
    }
}

async function updateAccount(id, name, openingBalance) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    try {
        let { error } = await supabase
            .from('accounts')
            .update({ name, opening_balance: Number(openingBalance || 0) })
            .eq('id', id);
        if (error) throw error;
        await fetchAccounts();
        return true;
    } catch (err) {
        const acc = accounts.find(a => a.id === id);
        if (acc) { acc.name = name; acc.opening_balance = Number(openingBalance || 0); }
        populateAccountDropdowns();
        renderAccountsListModal();
        renderAccountOverview(window.accountModule?.latestData || []);
        return true;
    }
}

async function deleteAccount(id) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    try {
        const { error } = await supabase
            .from('accounts')
            .delete()
            .eq('id', id);
        if (error) throw error;
        await fetchAccounts();
        return true;
    } catch (err) {
        accounts = accounts.filter(a => a.id !== id);
        populateAccountDropdowns();
        renderAccountsListModal();
        renderAccountOverview(window.accountModule?.latestData || []);
        return true;
    }
}

function renderAccountOverview(data) {
    const container = document.getElementById('account-list');
    if (!container) return;
    window.accountModule.latestData = data;

    if (!accounts || accounts.length === 0) {
        container.innerHTML = `<p class="empty-state">No accounts yet. Click "Manage Accounts" to add.</p>`;
        return;
    }

    // Helper function to check if transaction is a transfer
    function isTransfer(t) {
        return (t.category || '').toLowerCase().startsWith('transfer ');
    }

    const defaultName = window.accountModule.getDefaultAccountName();
    const items = accounts.map(a => {
        const accName = a.name;
        // Exclude transfers from income/expense calculations
        const income = data.filter(t => 
            ((t.account || defaultName) === accName) && 
            t.type === 'income' && 
            !isTransfer(t)
        ).reduce((sum, t) => sum + t.amount, 0);
        const expense = data.filter(t => 
            ((t.account || defaultName) === accName) && 
            t.type === 'expense' && 
            !isTransfer(t)
        ).reduce((sum, t) => sum + t.amount, 0);
        
        // For balance calculation, we need to account for transfers differently
        // Transfer Out reduces balance, Transfer In increases balance
        const transferOut = data.filter(t => 
            ((t.account || defaultName) === accName) && 
            t.type === 'expense' && 
            isTransfer(t) &&
            (t.category || '').toLowerCase().includes('out')
        ).reduce((sum, t) => sum + t.amount, 0);
        const transferIn = data.filter(t => 
            ((t.account || defaultName) === accName) && 
            t.type === 'income' && 
            isTransfer(t) &&
            (t.category || '').toLowerCase().includes('in')
        ).reduce((sum, t) => sum + t.amount, 0);
        
        const balance = (a.opening_balance || 0) + income - expense - transferOut + transferIn;
        return `
            <div class="budget-item">
                <div class="budget-item-header">
                    <div class="budget-category-name">${accName}</div>
                    <div class="account-metrics">
                        <div class="metric opening">
                            <span class="metric-label">Opening</span>
                            <span class="metric-value">Rp ${(a.opening_balance || 0).toLocaleString()}</span>
                        </div>
                        <div class="metric income">
                            <span class="metric-label">Income</span>
                            <span class="metric-value text-income">Rp ${income.toLocaleString()}</span>
                        </div>
                        <div class="metric expense">
                            <span class="metric-label">Expense</span>
                            <span class="metric-value text-expense">Rp ${expense.toLocaleString()}</span>
                        </div>
                        <div class="metric balance">
                            <span class="metric-label">Balance</span>
                            <span class="metric-value"><strong>Rp ${balance.toLocaleString()}</strong></span>
                        </div>
                    </div>
                </div>
            </div>`;
    }).join('');

    container.innerHTML = items;
}

function renderAccountsListModal() {
    const list = document.getElementById('accounts-list-modal');
    if (!list) return;
    if (!accounts || accounts.length === 0) {
        list.innerHTML = `<p class="empty-state">No accounts yet.</p>`;
        return;
    }
    list.innerHTML = accounts.map(a => `
        <div class="category-item">
            <span class="category-item-name">${a.name} ${a.is_default ? '⭐' : ''}</span>
            <div class="category-item-actions">
                <button class="btn-edit-category" data-id="${a.id}" data-name="${a.name}" data-opening="${a.opening_balance || 0}">Edit</button>
                <button class="btn-edit-category" data-id="${a.id}" data-default="true">Set Default</button>
                <button class="btn-delete-category" data-id="${a.id}">Delete</button>
            </div>
        </div>
    `).join('');

    list.querySelectorAll('.btn-edit-category').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            const makeDefault = btn.getAttribute('data-default');
            if (makeDefault) {
                await setDefaultAccount(id);
                return;
            }
            const oldName = btn.getAttribute('data-name');
            const oldOpening = btn.getAttribute('data-opening');
            const name = prompt('Rename account', oldName);
            if (name && name.trim()) {
                const openingStr = prompt('Opening Balance (Rp)', oldOpening || '0');
                const openingBalance = Number(openingStr || 0);
                await updateAccount(id, name.trim(), openingBalance);
            }
        });
    });
    list.querySelectorAll('.btn-delete-category').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            if (confirm('Delete this account?')) {
                await deleteAccount(id);
            }
        });
    });
}

window.accountModule = {
    fetchAccounts,
    addAccount,
    updateAccount,
    deleteAccount,
    setDefaultAccount,
    renderAccountOverview,
    populateAccountDropdowns,
    renderAccountsListModal,
    latestData: [],
    getDefaultAccountName: () => {
        const def = accounts.find(a => a.is_default);
        return def ? def.name : '';
    },
    getAccounts: () => accounts
};

function renderAccountBadges(data) {
    const wrap = document.getElementById('account-badges');
    if (!wrap) return;
    if (!accounts || accounts.length === 0) { wrap.innerHTML = ''; return; }
    
    // Helper function to check if transaction is a transfer
    function isTransfer(t) {
        return (t.category || '').toLowerCase().startsWith('transfer ');
    }
    
    const defaultName = window.accountModule.getDefaultAccountName();
    const html = accounts.map(a => {
        const accName = a.name;
        // Exclude transfers from income/expense calculations
        const income = data.filter(t => 
            ((t.account || defaultName) === accName) && 
            t.type === 'income' && 
            !isTransfer(t)
        ).reduce((s, t) => s + t.amount, 0);
        const expense = data.filter(t => 
            ((t.account || defaultName) === accName) && 
            t.type === 'expense' && 
            !isTransfer(t)
        ).reduce((s, t) => s + t.amount, 0);
        
        // For balance calculation, account for transfers
        const transferOut = data.filter(t => 
            ((t.account || defaultName) === accName) && 
            t.type === 'expense' && 
            isTransfer(t) &&
            (t.category || '').toLowerCase().includes('out')
        ).reduce((s, t) => s + t.amount, 0);
        const transferIn = data.filter(t => 
            ((t.account || defaultName) === accName) && 
            t.type === 'income' && 
            isTransfer(t) &&
            (t.category || '').toLowerCase().includes('in')
        ).reduce((s, t) => s + t.amount, 0);
        
        const balance = (a.opening_balance || 0) + income - expense - transferOut + transferIn;
        return `<span class="account-badge ${a.is_default ? 'default' : ''}"><span class="badge-name">${accName}</span><span>Rp ${balance.toLocaleString()}</span></span>`;
    }).join('');
    wrap.innerHTML = html;
}

window.accountModule.renderAccountBadges = renderAccountBadges;
async function setDefaultAccount(id) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    try {
        await supabase.from('accounts').update({ is_default: false }).eq('user_id', user.id);
        const { error } = await supabase.from('accounts').update({ is_default: true }).eq('id', id);
        if (error) throw error;
        await fetchAccounts();
        populateAccountDropdowns();
        return true;
    } catch (err) {
        accounts = accounts.map(a => ({ ...a, is_default: a.id === id }));
        populateAccountDropdowns();
        renderAccountsListModal();
        return true;
    }
}
