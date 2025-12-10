// Analytics UI Integration
// Connects analytics module with dashboard UI and handles visualizations

// Chart instances
let daySpendingChart = null;
let categoryTrendChart = null;
let predictionChart = null;
let comparisonChart = null;

// Navigation handlers
document.addEventListener('DOMContentLoaded', () => {
    const analyticsNavBtn = document.getElementById('analytics-nav-btn');
    const dashboardNavBtn = document.getElementById('dashboard-nav-btn');
    const mainContent = document.querySelector('.main-content');
    const analyticsContent = document.getElementById('analytics-content');

    if (analyticsNavBtn) {
        analyticsNavBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showAnalyticsDashboard();
        });
    }

    if (dashboardNavBtn) {
        dashboardNavBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showMainDashboard();
        });
    }

    // Comparison type change handler
    const comparisonType = document.getElementById('comparison-type');
    if (comparisonType) {
        comparisonType.addEventListener('change', () => {
            if (window.transactions) {
                renderPeriodComparison(window.transactions);
            }
        });
    }
});

// Show analytics dashboard
function showAnalyticsDashboard() {
    const mainContent = document.querySelector('.main-content');
    const analyticsContent = document.getElementById('analytics-content');
    
    if (mainContent) mainContent.classList.add('hidden');
    if (analyticsContent) analyticsContent.classList.remove('hidden');

    // Update sidebar active state
    document.querySelectorAll('.sidebar nav li').forEach(li => li.classList.remove('active'));
    const analyticsNav = document.getElementById('analytics-nav-btn');
    if (analyticsNav) analyticsNav.parentElement.classList.add('active');

    // Load analytics data
    if (window.transactions) {
        loadAnalyticsData(window.transactions);
    }
}

// Show main dashboard
function showMainDashboard() {
    const mainContent = document.querySelector('.main-content');
    const analyticsContent = document.getElementById('analytics-content');
    
    if (mainContent) mainContent.classList.remove('hidden');
    if (analyticsContent) analyticsContent.classList.add('hidden');

    // Update sidebar active state
    document.querySelectorAll('.sidebar nav li').forEach(li => li.classList.remove('active'));
    const dashboardNav = document.getElementById('dashboard-nav-btn');
    if (dashboardNav) dashboardNav.parentElement.classList.add('active');
}

// Load all analytics data
function loadAnalyticsData(transactions) {
    if (!transactions || transactions.length === 0) {
        showEmptyState();
        return;
    }

    renderInsights(transactions);
    renderSpendingPatterns(transactions);
    renderCategoryTrends(transactions);
    renderPredictiveAnalytics(transactions);
    renderPeriodComparison(transactions);
}

// Show empty state
function showEmptyState() {
    const analyticsContent = document.getElementById('analytics-content');
    if (!analyticsContent) return;

    analyticsContent.innerHTML = `
        <div class="analytics-empty">
            <div class="analytics-empty-icon">📊</div>
            <div class="analytics-empty-message">Not enough data for analytics</div>
            <div class="analytics-empty-hint">Add more transactions to see insights</div>
        </div>
    `;
}

// Render auto-generated insights
function renderInsights(transactions) {
    const container = document.getElementById('insights-container');
    if (!container || !window.analyticsModule) return;

    const insights = window.analyticsModule.generateInsights(transactions);
    
    container.innerHTML = insights.map(insight => `
        <div class="insight-badge">
            <div class="insight-icon">${insight.icon}</div>
            <div class="insight-message">${insight.message}</div>
        </div>
    `).join('');
}

// Render spending patterns
function renderSpendingPatterns(transactions) {
    if (!window.analyticsModule) return;

    const peakTimes = window.analyticsModule.getPeakSpendingTimes(transactions);
    
    // Update peak day card
    const peakDayValue = document.getElementById('peak-day-value');
    const peakDayDetail = document.getElementById('peak-day-detail');
    if (peakDayValue) peakDayValue.textContent = peakTimes.peakDay || '-';
    if (peakDayDetail) peakDayDetail.textContent = peakTimes.peakDayAverage 
        ? `Avg: ${window.analyticsModule.formatCurrency(Math.round(peakTimes.peakDayAverage))}`
        : '-';

    // Update peak week card
    const peakWeekValue = document.getElementById('peak-week-value');
    const peakWeekDetail = document.getElementById('peak-week-detail');
    if (peakWeekValue) peakWeekValue.textContent = peakTimes.peakWeek || '-';
    if (peakWeekDetail) peakWeekDetail.textContent = peakTimes.peakWeekTotal
        ? `Total: ${window.analyticsModule.formatCurrency(Math.round(peakTimes.peakWeekTotal))}`
        : '-';

    // Render day spending chart
    renderDaySpendingChart(peakTimes.dayBreakdown);
}

// Render day spending chart
function renderDaySpendingChart(dayBreakdown) {
    const ctx = document.getElementById('day-spending-chart');
    if (!ctx) return;

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const data = days.map(day => dayBreakdown[day] || 0);

    if (daySpendingChart) daySpendingChart.destroy();

    daySpendingChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: days,
            datasets: [{
                label: 'Average Spending',
                data: data,
                backgroundColor: 'rgba(212, 175, 55, 0.8)',
                borderColor: '#D4AF37',
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { 
                    display: true, 
                    text: 'Average Spending by Day of Week',
                    color: '#ffffff',
                    font: { family: 'Inter', size: 14, weight: '600' }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => `Avg: Rp ${context.parsed.y.toLocaleString('id-ID')}`
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    grid: { color: '#27272a' },
                    ticks: { color: '#9ca3af' }
                },
                x: { 
                    grid: { display: false },
                    ticks: { color: '#9ca3af' }
                }
            }
        }
    });
}

// Render category trends
function renderCategoryTrends(transactions) {
    if (!window.analyticsModule) return;

    const container = document.getElementById('category-trends-container');
    if (!container) return;

    const growing = window.analyticsModule.identifyGrowingCategories(transactions, 5);
    const declining = window.analyticsModule.identifyDecliningCategories(transactions, -5);
    const allTrends = [...growing, ...declining].slice(0, 8);

    if (allTrends.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center;">Not enough data to show trends</p>';
        return;
    }

    container.innerHTML = allTrends.map(trend => {
        const trendClass = trend.trend === 'up' ? 'up' : 'down';
        const trendIcon = trend.trend === 'up' ? '↑' : '↓';
        const changeValue = Math.abs(parseFloat(trend.change));
        
        return `
            <div class="trend-card">
                <div class="trend-category">${trend.category}</div>
                <div class="trend-change ${trendClass}">
                    <span class="trend-indicator">${trendIcon}</span>
                    <span>${changeValue.toFixed(1)}%</span>
                </div>
            </div>
        `;
    }).join('');

    // Render category trend chart
    renderCategoryTrendChart(transactions);
}

// Render category trend chart
function renderCategoryTrendChart(transactions) {
    const ctx = document.getElementById('category-trend-chart');
    if (!ctx || !window.analyticsModule) return;

    const trends = window.analyticsModule.analyzeCategoryTrends(transactions, 3);
    const topCategories = Object.keys(trends).slice(0, 5);
    
    if (topCategories.length === 0) return;

    const months = [];
    const currentDate = new Date();
    for (let i = 2; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    }

    const datasets = topCategories.map((category, idx) => {
        const colors = ['#D4AF37', '#fbbf24', '#facc15', '#84cc16', '#22c55e'];
        return {
            label: category,
            data: months.map(month => trends[category][month] || 0),
            borderColor: colors[idx % colors.length],
            backgroundColor: `${colors[idx % colors.length]}33`,
            borderWidth: 2,
            tension: 0.4,
            fill: false
        };
    });

    if (categoryTrendChart) categoryTrendChart.destroy();

    categoryTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months.map(m => {
                const [year, month] = m.split('-');
                return new Date(year, month - 1).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
            }),
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'bottom',
                    labels: { color: '#9ca3af', font: { family: 'Inter', size: 12 } }
                },
                title: {
                    display: true,
                    text: 'Category Spending Trends (3 Months)',
                    color: '#ffffff',
                    font: { family: 'Inter', size: 14, weight: '600' }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    grid: { color: '#27272a' },
                    ticks: { color: '#9ca3af' }
                },
                x: { 
                    grid: { display: false },
                    ticks: { color: '#9ca3af' }
                }
            }
        }
    });
}

// Render predictive analytics
function renderPredictiveAnalytics(transactions) {
    if (!window.analyticsModule) return;

    const prediction = window.analyticsModule.predictNextMonthSpending(transactions);
    
    // Update prediction card
    const predictionValue = document.getElementById('prediction-value');
    const predictionRange = document.getElementById('prediction-range');
    const predictionConfidence = document.getElementById('prediction-confidence');

    if (predictionValue) {
        predictionValue.textContent = window.analyticsModule.formatCurrency(prediction.prediction);
    }
    
    if (predictionRange) {
        predictionRange.textContent = `Range: ${window.analyticsModule.formatCurrency(prediction.range.min)} - ${window.analyticsModule.formatCurrency(prediction.range.max)}`;
    }
    
    if (predictionConfidence) {
        predictionConfidence.textContent = `${prediction.confidence} confidence`;
        predictionConfidence.className = `prediction-confidence ${prediction.confidence}`;
    }

    // Render prediction chart
    renderPredictionChart(transactions, prediction);
}

// Render prediction chart
function renderPredictionChart(transactions, prediction) {
    const ctx = document.getElementById('prediction-chart');
    if (!ctx || !window.analyticsModule) return;

    const monthlyExpenses = {};
    transactions.filter(t => t.type === 'expense' && !(t.category || '').toLowerCase().startsWith('transfer ')).forEach(t => {
        const monthKey = t.date.substring(0, 7);
        monthlyExpenses[monthKey] = (monthlyExpenses[monthKey] || 0) + t.amount;
    });

    const months = Object.keys(monthlyExpenses).sort().slice(-6);
    const values = months.map(m => monthlyExpenses[m]);

    // Add next month prediction
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextMonthKey = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
    
    const labels = [...months.map(m => {
        const [year, month] = m.split('-');
        return new Date(year, month - 1).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
    }), nextMonth.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })];

    const actualData = [...values, null];
    const predictionData = [...values.map(() => null), prediction.prediction];

    if (predictionChart) predictionChart.destroy();

    predictionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Actual',
                    data: actualData,
                    borderColor: '#D4AF37',
                    backgroundColor: 'rgba(212, 175, 55, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Predicted',
                    data: predictionData,
                    borderColor: '#fbbf24',
                    backgroundColor: 'rgba(251, 191, 36, 0.1)',
                    borderWidth: 3,
                    borderDash: [5, 5],
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#9ca3af', font: { family: 'Inter', size: 12 } }
                },
                title: {
                    display: true,
                    text: 'Spending Prediction',
                    color: '#ffffff',
                    font: { family: 'Inter', size: 14, weight: '600' }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    grid: { color: '#27272a' },
                    ticks: { color: '#9ca3af' }
                },
                x: { 
                    grid: { display: false },
                    ticks: { color: '#9ca3af' }
                }
            }
        }
    });
}

// Render period comparison
function renderPeriodComparison(transactions) {
    if (!window.analyticsModule) return;

    const comparisonType = document.getElementById('comparison-type');
    const type = comparisonType ? comparisonType.value : 'mom';

    let comparison;
    if (type === 'mom') {
        comparison = window.analyticsModule.compareMonthOverMonth(transactions);
    } else {
        comparison = window.analyticsModule.compareYearOverYear(transactions);
    }

    renderComparisonCards(comparison, type);
    renderComparisonChart(comparison, type);
}

// Render comparison cards
function renderComparisonCards(comparison, type) {
    const container = document.getElementById('comparison-container');
    if (!container || !window.analyticsModule) return;

    const periodLabel = type === 'mom' ? 'Month' : 'Year';
    const insights = window.analyticsModule.generateComparisonInsights(comparison);

    container.innerHTML = `
        <div class="comparison-period">
            <div class="comparison-period-title">Current ${periodLabel}</div>
            <div class="comparison-stat">
                <span class="comparison-stat-label">Income</span>
                <span class="comparison-stat-value">${window.analyticsModule.formatCurrency(comparison.current.income)}</span>
            </div>
            <div class="comparison-stat">
                <span class="comparison-stat-label">Expense</span>
                <span class="comparison-stat-value">${window.analyticsModule.formatCurrency(comparison.current.expense)}</span>
            </div>
            <div class="comparison-stat">
                <span class="comparison-stat-label">Balance</span>
                <span class="comparison-stat-value">${window.analyticsModule.formatCurrency(comparison.current.balance)}</span>
            </div>
        </div>
        <div class="comparison-period">
            <div class="comparison-period-title">Previous ${periodLabel}</div>
            <div class="comparison-stat">
                <span class="comparison-stat-label">Income</span>
                <span class="comparison-stat-value">${window.analyticsModule.formatCurrency(comparison.previous.income)}</span>
            </div>
            <div class="comparison-stat">
                <span class="comparison-stat-label">Expense</span>
                <span class="comparison-stat-value">${window.analyticsModule.formatCurrency(comparison.previous.expense)}</span>
            </div>
            <div class="comparison-stat">
                <span class="comparison-stat-label">Balance</span>
                <span class="comparison-stat-value">${window.analyticsModule.formatCurrency(comparison.previous.balance)}</span>
            </div>
        </div>
        <div class="comparison-period" style="grid-column: 1 / -1;">
            <div class="comparison-period-title">Changes</div>
            ${insights.map(insight => `<div class="insight-message" style="padding: 0.5rem 0;">${insight}</div>`).join('')}
        </div>
    `;
}

// Render comparison chart
function renderComparisonChart(comparison, type) {
    const ctx = document.getElementById('comparison-chart');
    if (!ctx) return;

    const periodLabel = type === 'mom' ? 'Month' : 'Year';

    if (comparisonChart) comparisonChart.destroy();

    comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Income', 'Expense', 'Balance'],
            datasets: [
                {
                    label: `Current ${periodLabel}`,
                    data: [comparison.current.income, comparison.current.expense, comparison.current.balance],
                    backgroundColor: 'rgba(212, 175, 55, 0.8)',
                    borderColor: '#D4AF37',
                    borderWidth: 2,
                    borderRadius: 8
                },
                {
                    label: `Previous ${periodLabel}`,
                    data: [comparison.previous.income, comparison.previous.expense, comparison.previous.balance],
                    backgroundColor: 'rgba(156, 163, 175, 0.5)',
                    borderColor: '#9ca3af',
                    borderWidth: 2,
                    borderRadius: 8
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#9ca3af', font: { family: 'Inter', size: 12 } }
                },
                title: {
                    display: true,
                    text: `${type === 'mom' ? 'Month over Month' : 'Year over Year'} Comparison`,
                    color: '#ffffff',
                    font: { family: 'Inter', size: 14, weight: '600' }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.dataset.label}: Rp ${context.parsed.y.toLocaleString('id-ID')}`
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    grid: { color: '#27272a' },
                    ticks: { color: '#9ca3af' }
                },
                x: { 
                    grid: { display: false },
                    ticks: { color: '#9ca3af' }
                }
            }
        }
    });
}

// Export analytics report
document.addEventListener('DOMContentLoaded', () => {
    const exportBtn = document.getElementById('export-analytics-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            Swal.fire('Coming Soon', 'Analytics export feature will be available soon!', 'info');
        });
    }
});

console.log('Analytics UI loaded');
