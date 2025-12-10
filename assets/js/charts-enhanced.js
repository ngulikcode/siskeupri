// Enhanced Charts Logic with Pie Charts and Switching

const ctx = document.getElementById('financeChart').getContext('2d');
const pieCtx = document.getElementById('pieChart')?.getContext('2d');
const trendCtx = document.getElementById('trendChart')?.getContext('2d');

let myChart;
let pieChartInstance;
let trendChartInstance;
let currentChartType = 'bar';

// Expose current chart type for other modules
window.currentChartType = currentChartType;

// Helpers
function isTransfer(t) {
    return (t.category || '').toLowerCase().startsWith('transfer ');
}
const getLastNDates = (n) => {
    const dates = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        dates.push(d.toISOString().slice(0, 10)); // YYYY-MM-DD
    }
    return dates;
};

const getTopCategories = (transactions, type, limit = 5) => {
    const totals = {};
    transactions
        .filter(t => t.type === type && !isTransfer(t))
        .forEach(t => {
            const cat = t.category || 'Other';
            totals[cat] = (totals[cat] || 0) + t.amount;
        });
    return Object.entries(totals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([name, total]) => ({ name, total }));
};

const incomePalette = ['#D4AF37', '#fbbf24', '#facc15', '#84cc16', '#22c55e'];
const expensePalette = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];

const getSelectedType = () => {
    const sel = document.getElementById('chart-type-select');
    return sel ? sel.value : 'all';
};

const filterBySelectedType = (transactions) => {
    const type = getSelectedType();
    if (type === 'income') return transactions.filter(t => t.type === 'income' && !isTransfer(t));
    if (type === 'expense') return transactions.filter(t => t.type === 'expense' && !isTransfer(t));
    return transactions.filter(t => !isTransfer(t));
};

const buildLineDataset = (transactions, labels, predicate, color, label) => {
    const data = labels.map(date => {
        return transactions
            .filter(t => t.date.startsWith(date) && predicate(t))
            .reduce((sum, t) => sum + t.amount, 0);
    });
    return {
        label,
        data,
        borderColor: color,
        backgroundColor: color,
        tension: 0.35,
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: false
    };
};

// Aggregate Bar Chart (Income vs Expense)
function renderAggregateBarChart(transactions) {
    if (!ctx) return;
    const filtered = filterBySelectedType(transactions);
    const incomeCats = getTopCategories(filtered, 'income', 5);
    const expenseCats = getTopCategories(filtered, 'expense', 5);
    const hasCats = incomeCats.length + expenseCats.length > 0;

    if (myChart) myChart.destroy();

    if (!hasCats) {
        // fallback to totals
        const income = filtered.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = filtered.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        myChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Income', 'Expense'],
                datasets: [{
                    data: [income, expense],
                    backgroundColor: ['rgba(212, 175, 55, 0.8)', 'rgba(239, 68, 68, 0.8)'],
                    borderColor: ['#D4AF37', '#ef4444'],
                    borderWidth: 2,
                    borderRadius: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Income vs Expense (Total)', color: '#ffffff', font: { family: 'Inter', size: 16, weight: '600' } },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: Rp ${context.parsed.y.toLocaleString('id-ID')}`;
                            }
                        }
                    }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#27272a' }, ticks: { color: '#9ca3af' } },
                    x: { grid: { display: false }, ticks: { color: '#9ca3af' } }
                }
            }
        });
        return;
    }

    const labels = [
        ...incomeCats.map(c => `Inc: ${c.name}`),
        ...expenseCats.map(c => `Exp: ${c.name}`)
    ];
    const data = [
        ...incomeCats.map(c => c.total),
        ...expenseCats.map(c => c.total)
    ];
    const colors = [
        ...incomeCats.map((_, i) => incomePalette[i % incomePalette.length]),
        ...expenseCats.map((_, i) => expensePalette[i % expensePalette.length])
    ];

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors.map(c => `${c}cc`),
                borderColor: colors,
                borderWidth: 2,
                borderRadius: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Top Categories (Income & Expense)', color: '#ffffff', font: { family: 'Inter', size: 16, weight: '600' } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: Rp ${context.parsed.y.toLocaleString('id-ID')}`;
                        }
                    }
                }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#27272a' }, ticks: { color: '#9ca3af' } },
                x: { grid: { display: false }, ticks: { color: '#9ca3af', maxRotation: 45, minRotation: 45 } }
            }
        }
    });
}

// Main Line Chart (Income vs Expense) - last 30 days
window.updateChart = function(transactions) {
    if (!ctx) return;
    const filtered = filterBySelectedType(transactions);
    const labels = getLastNDates(30);

    if (myChart) myChart.destroy();

    const incomeCats = getTopCategories(filtered, 'income', 4);
    const expenseCats = getTopCategories(filtered, 'expense', 4);
    const datasets = [];

    incomeCats.forEach((cat, idx) => {
        datasets.push(buildLineDataset(filtered, labels, (t) => t.type === 'income' && !isTransfer(t) && (t.category || 'Other') === cat.name, incomePalette[idx % incomePalette.length], `Inc: ${cat.name}`));
    });
    expenseCats.forEach((cat, idx) => {
        datasets.push(buildLineDataset(filtered, labels, (t) => t.type === 'expense' && !isTransfer(t) && (t.category || 'Other') === cat.name, expensePalette[idx % expensePalette.length], `Exp: ${cat.name}`));
    });

    if (datasets.length === 0) {
        // fallback to totals line
        datasets.push(buildLineDataset(filtered, labels, (t) => t.type === 'income' && !isTransfer(t), '#D4AF37', 'Income'));
        datasets.push(buildLineDataset(filtered, labels, (t) => t.type === 'expense' && !isTransfer(t), '#ef4444', 'Expense'));
    }

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'bottom', labels: { color: '#9ca3af', font: { family: 'Inter', size: 13 }, padding: 16 } },
                title: { display: true, text: 'Income vs Expense (30 hari)', color: '#ffffff', font: { family: 'Inter', size: 16, weight: '600' } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: Rp ${context.parsed.y.toLocaleString('id-ID')}`;
                        }
                    }
                }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#27272a' }, ticks: { color: '#9ca3af' } },
                x: { grid: { display: false }, ticks: { color: '#9ca3af', maxRotation: 45, minRotation: 45 } }
            }
        }
    });
};

// Pie Chart - Aggregate Income vs Expense + categories
function renderAggregatePieChart(transactions) {
    if (!pieCtx) return;
    const filtered = filterBySelectedType(transactions);
    const incomeCats = getTopCategories(filtered, 'income', 5);
    const expenseCats = getTopCategories(filtered, 'expense', 5);
    const labels = [
        ...incomeCats.map(c => `Inc: ${c.name}`),
        ...expenseCats.map(c => `Exp: ${c.name}`)
    ];
    const data = [
        ...incomeCats.map(c => c.total),
        ...expenseCats.map(c => c.total)
    ];
    const colors = [
        ...incomeCats.map((_, i) => incomePalette[i % incomePalette.length]),
        ...expenseCats.map((_, i) => expensePalette[i % expensePalette.length])
    ];

    if (pieChartInstance) pieChartInstance.destroy();

    pieChartInstance = new Chart(pieCtx, {
        type: 'pie',
        data: {
            labels: labels.length ? labels : ['Income', 'Expense'],
            datasets: [{
                data: data.length ? data : [
                    filtered.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
                    filtered.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
                ],
                backgroundColor: colors.length ? colors : ['#D4AF37', '#ef4444'],
                borderWidth: 3,
                borderColor: '#121212',
                hoverOffset: 12
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#9ca3af', font: { family: 'Inter', size: 12 }, padding: 14 } },
                title: { display: true, text: 'Income & Expense by Category (Pie)', color: '#ffffff', font: { family: 'Inter', size: 16, weight: '600' } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total ? ((context.parsed / total) * 100).toFixed(1) : 0;
                            return `${context.label}: Rp ${context.parsed.toLocaleString('id-ID')} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Trend Chart - Monthly Income vs Expense
window.updateTrendChart = function(transactions) {
    if (!trendCtx) return;

    const months = [];
    const currentDate = new Date();
    for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        months.push({
            key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
            label: date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
        });
    }

    const monthlyIncome = months.map(month => {
        return transactions.filter(t => t.type === 'income' && t.date.startsWith(month.key) && !isTransfer(t)).reduce((sum, t) => sum + t.amount, 0);
    });

    const monthlyExpense = months.map(month => {
        return transactions.filter(t => t.type === 'expense' && t.date.startsWith(month.key) && !isTransfer(t)).reduce((sum, t) => sum + t.amount, 0);
    });

    if (trendChartInstance) trendChartInstance.destroy();

    trendChartInstance = new Chart(trendCtx, {
        type: 'line',
        data: {
            labels: months.map(m => m.label),
            datasets: [
                {
                    label: 'Income',
                    data: monthlyIncome,
                    borderColor: '#D4AF37',
                    backgroundColor: 'rgba(212, 175, 55, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Expense',
                    data: monthlyExpense,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: '#27272a' }, ticks: { color: '#9ca3af' } },
                x: { grid: { display: false }, ticks: { color: '#9ca3af' } }
            },
            plugins: {
                legend: { position: 'bottom', labels: { color: '#9ca3af', font: { family: 'Inter', size: 13 }, padding: 20 } },
                title: { display: true, text: '6-Month Trend', color: '#ffffff', font: { family: 'Inter', size: 16, weight: '600' } }
            }
        }
    });
};

// Chart Switching
window.switchChart = function(chartType) {
    currentChartType = chartType;
    window.currentChartType = chartType;
    
    document.getElementById('financeChart').classList.add('hidden');
    document.getElementById('pieChart').classList.add('hidden');
    document.getElementById('trendChart').classList.add('hidden');
    
    const trendMonths = document.getElementById('trend-months');
    if (trendMonths) trendMonths.classList.add('hidden');
    
    switch(chartType) {
        case 'bar':
            document.getElementById('financeChart').classList.remove('hidden');
            if (window.transactions) renderAggregateBarChart(window.transactions);
            break;
        case 'line':
            document.getElementById('financeChart').classList.remove('hidden');
            if (window.transactions) updateChart(window.transactions);
            break;
        case 'pie':
            document.getElementById('pieChart').classList.remove('hidden');
            if (window.transactions) renderAggregatePieChart(window.transactions);
            break;
    }
    
    document.querySelectorAll('.chart-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.chart === chartType) tab.classList.add('active');
    });
};

// Dropdown listener for type filter
const chartTypeSelect = document.getElementById('chart-type-select');
if (chartTypeSelect) {
    chartTypeSelect.addEventListener('change', () => {
        if (window.switchChart) window.switchChart(window.currentChartType || 'bar');
    });
}
