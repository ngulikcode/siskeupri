// Enhanced Charts Logic

const ctx = document.getElementById('financeChart').getContext('2d');
const trendCtx = document.getElementById('trendChart')?.getContext('2d');
const categoryCtx = document.getElementById('categoryChart')?.getContext('2d');

let myChart;
let trendChart;
let categoryChart;

// Chart configuration with enhanced styling
const chartDefaults = {
    plugins: {
        legend: {
            labels: {
                color: '#9ca3af',
                font: {
                    family: 'Inter',
                    size: 12
                },
                padding: 15,
                usePointStyle: true,
                pointStyle: 'circle'
            }
        },
        tooltip: {
            backgroundColor: 'rgba(18, 18, 18, 0.95)',
            titleColor: '#ffffff',
            bodyColor: '#9ca3af',
            borderColor: '#27272a',
            borderWidth: 1,
            padding: 12,
            displayColors: true,
            cornerRadius: 8,
            titleFont: {
                size: 13,
                weight: 'bold'
            },
            bodyFont: {
                size: 12
            },
            callbacks: {
                label: function(context) {
                    let label = context.dataset.label || '';
                    if (label) {
                        label += ': ';
                    }
                    label += 'Rp ' + context.parsed.y.toLocaleString('id-ID');
                    return label;
                }
            }
        }
    }
};

// Main Doughnut Chart - Income vs Expense
window.updateChart = function(transactions) {
    // Helper function to check if transaction is a transfer
    function isTransfer(t) {
        return (t.category || '').toLowerCase().startsWith('transfer ');
    }
    const income = transactions.filter(t => t.type === 'income' && !isTransfer(t)).reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense' && !isTransfer(t)).reduce((sum, t) => sum + t.amount, 0);

    if (myChart) {
        myChart.destroy();
    }

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Income', 'Expense'],
            datasets: [{
                data: [income, expense],
                backgroundColor: [
                    '#D4AF37',
                    '#ef4444'
                ],
                borderWidth: 3,
                borderColor: '#121212',
                hoverOffset: 15,
                hoverBorderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#9ca3af',
                        font: {
                            family: 'Inter',
                            size: 13,
                            weight: '500'
                        },
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                title: {
                    display: true,
                    text: 'Income vs Expense',
                    color: '#ffffff',
                    font: {
                        family: 'Inter',
                        size: 16,
                        weight: '600'
                    },
                    padding: {
                        top: 10,
                        bottom: 20
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(18, 18, 18, 0.95)',
                    titleColor: '#ffffff',
                    bodyColor: '#9ca3af',
                    borderColor: '#27272a',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: Rp ${value.toLocaleString('id-ID')} (${percentage}%)`;
                        }
                    }
                }
            },
            animation: {
                animateRotate: true,
                animateScale: true,
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        }
    });
};

// Trend Chart - Monthly Income vs Expense
window.updateTrendChart = function(transactions) {
    if (!trendCtx) return;

    // Get last 6 months
    const months = [];
    const currentDate = new Date();
    for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        months.push({
            key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
            label: date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
        });
    }

    // Helper function to check if transaction is a transfer
    function isTransfer(t) {
        return (t.category || '').toLowerCase().startsWith('transfer ');
    }
    
    // Calculate monthly data (exclude transfers)
    const monthlyIncome = months.map(month => {
        return transactions
            .filter(t => t.type === 'income' && t.date.startsWith(month.key) && !isTransfer(t))
            .reduce((sum, t) => sum + t.amount, 0);
    });

    const monthlyExpense = months.map(month => {
        return transactions
            .filter(t => t.type === 'expense' && t.date.startsWith(month.key) && !isTransfer(t))
            .reduce((sum, t) => sum + t.amount, 0);
    });

    if (trendChart) {
        trendChart.destroy();
    }

    trendChart = new Chart(trendCtx, {
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
                    tension: 0.4,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: '#D4AF37',
                    pointBorderColor: '#121212',
                    pointBorderWidth: 2,
                    pointHoverBackgroundColor: '#ffffff',
                    pointHoverBorderColor: '#D4AF37'
                },
                {
                    label: 'Expense',
                    data: monthlyExpense,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: '#ef4444',
                    pointBorderColor: '#121212',
                    pointBorderWidth: 2,
                    pointHoverBackgroundColor: '#ffffff',
                    pointHoverBorderColor: '#ef4444'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#27272a',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#9ca3af',
                        font: {
                            family: 'Inter',
                            size: 11
                        },
                        callback: function(value) {
                            return 'Rp ' + (value / 1000000).toFixed(1) + 'M';
                        }
                    }
                },
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        color: '#9ca3af',
                        font: {
                            family: 'Inter',
                            size: 11
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#9ca3af',
                        font: {
                            family: 'Inter',
                            size: 13,
                            weight: '500'
                        },
                        padding: 20,
                        usePointStyle: true
                    }
                },
                title: {
                    display: true,
                    text: '6-Month Trend',
                    color: '#ffffff',
                    font: {
                        family: 'Inter',
                        size: 16,
                        weight: '600'
                    },
                    padding: {
                        top: 10,
                        bottom: 20
                    }
                },
                tooltip: chartDefaults.plugins.tooltip
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        }
    });
};

// Category Chart - Top Categories by Expense
window.updateCategoryChart = function(transactions) {
    if (!categoryCtx) return;

    // Helper function to check if transaction is a transfer
    function isTransfer(t) {
        return (t.category || '').toLowerCase().startsWith('transfer ');
    }
    
    // Get expense categories (exclude transfers)
    const expenseTransactions = transactions.filter(t => t.type === 'expense' && !isTransfer(t));
    const categoryTotals = {};

    expenseTransactions.forEach(t => {
        const category = t.category || 'Other';
        categoryTotals[category] = (categoryTotals[category] || 0) + t.amount;
    });

    // Sort and get top 5 categories
    const sortedCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    if (sortedCategories.length === 0) {
        if (categoryChart) {
            categoryChart.destroy();
            categoryChart = null;
        }
        return;
    }

    const labels = sortedCategories.map(([category]) => category);
    const data = sortedCategories.map(([, amount]) => amount);

    // Generate gradient colors
    const colors = [
        '#ef4444',
        '#f97316',
        '#eab308',
        '#84cc16',
        '#22c55e'
    ];

    if (categoryChart) {
        categoryChart.destroy();
    }

    categoryChart = new Chart(categoryCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Amount',
                data: data,
                backgroundColor: colors.slice(0, data.length),
                borderColor: colors.slice(0, data.length).map(c => c),
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            scales: {
                x: {
                    beginAtZero: true,
                    grid: {
                        color: '#27272a',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#9ca3af',
                        font: {
                            family: 'Inter',
                            size: 11
                        },
                        callback: function(value) {
                            return 'Rp ' + (value / 1000000).toFixed(1) + 'M';
                        }
                    }
                },
                y: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        color: '#9ca3af',
                        font: {
                            family: 'Inter',
                            size: 12,
                            weight: '500'
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Top 5 Expense Categories',
                    color: '#ffffff',
                    font: {
                        family: 'Inter',
                        size: 16,
                        weight: '600'
                    },
                    padding: {
                        top: 10,
                        bottom: 20
                    }
                },
                tooltip: chartDefaults.plugins.tooltip
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        }
    });
};

// Update all charts
window.updateAllCharts = function(transactions) {
    updateChart(transactions);
    updateTrendChart(transactions);
    updateCategoryChart(transactions);
};