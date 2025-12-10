function isTransfer(t) {
    return (t.category || '').toLowerCase().startsWith('transfer ');
}

// Get day name from date string
function getDayName(dateString) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const date = new Date(dateString);
    return days[date.getDay()];
}

// Get week number from date
function getWeekNumber(dateString) {
    const date = new Date(dateString);
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Get month-year key
function getMonthKey(dateString) {
    return dateString.substring(0, 7); // YYYY-MM
}

// Format currency
function formatCurrency(amount) {
    return `Rp ${amount.toLocaleString('id-ID')}`;
}

// Calculate percentage change
function calculatePercentageChange(oldValue, newValue) {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return ((newValue - oldValue) / oldValue) * 100;
}

// ===== SPENDING PATTERNS ANALYSIS =====

// Analyze spending by day of week
function analyzeSpendingByDay(transactions) {
    const dayTotals = {
        'Monday': 0, 'Tuesday': 0, 'Wednesday': 0, 'Thursday': 0,
        'Friday': 0, 'Saturday': 0, 'Sunday': 0
    };
    const dayCount = {
        'Monday': 0, 'Tuesday': 0, 'Wednesday': 0, 'Thursday': 0,
        'Friday': 0, 'Saturday': 0, 'Sunday': 0
    };

    transactions
        .filter(t => t.type === 'expense' && !isTransfer(t))
        .forEach(t => {
            const day = getDayName(t.date);
            dayTotals[day] += t.amount;
            dayCount[day]++;
        });

    // Calculate averages
    const dayAverages = {};
    Object.keys(dayTotals).forEach(day => {
        dayAverages[day] = dayCount[day] > 0 ? dayTotals[day] / dayCount[day] : 0;
    });

    // Find peak day
    const peakDay = Object.entries(dayAverages).reduce((max, [day, avg]) => 
        avg > max.avg ? { day, avg } : max, 
        { day: '', avg: 0 }
    );

    return {
        totals: dayTotals,
        averages: dayAverages,
        counts: dayCount,
        peakDay: peakDay.day,
        peakAverage: peakDay.avg
    };
}

// Analyze spending by week
function analyzeSpendingByWeek(transactions) {
    const weekTotals = {};
    const currentYear = new Date().getFullYear();

    transactions
        .filter(t => t.type === 'expense' && !isTransfer(t))
        .forEach(t => {
            const weekNum = getWeekNumber(t.date);
            const year = new Date(t.date).getFullYear();
            const key = `${year}-W${weekNum}`;
            weekTotals[key] = (weekTotals[key] || 0) + t.amount;
        });

    // Find peak week
    const peakWeek = Object.entries(weekTotals).reduce((max, [week, total]) => 
        total > max.total ? { week, total } : max,
        { week: '', total: 0 }
    );

    return {
        weekTotals,
        peakWeek: peakWeek.week,
        peakTotal: peakWeek.total
    };
}

// Get spending heatmap data (for calendar visualization)
function getSpendingHeatmap(transactions, months = 3) {
    const heatmapData = {};
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    transactions
        .filter(t => t.type === 'expense' && !isTransfer(t))
        .filter(t => {
            const tDate = new Date(t.date);
            return tDate >= startDate && tDate <= endDate;
        })
        .forEach(t => {
            heatmapData[t.date] = (heatmapData[t.date] || 0) + t.amount;
        });

    return heatmapData;
}

// Get peak spending times summary
function getPeakSpendingTimes(transactions) {
    const dayAnalysis = analyzeSpendingByDay(transactions);
    const weekAnalysis = analyzeSpendingByWeek(transactions);

    return {
        peakDay: dayAnalysis.peakDay,
        peakDayAverage: dayAnalysis.peakAverage,
        peakWeek: weekAnalysis.peakWeek,
        peakWeekTotal: weekAnalysis.peakTotal,
        dayBreakdown: dayAnalysis.averages
    };
}

// ===== CATEGORY TRENDS ANALYSIS =====

// Analyze category trends over months
function analyzeCategoryTrends(transactions, months = 6) {
    const categoryByMonth = {};
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Group by category and month
    transactions
        .filter(t => !isTransfer(t))
        .filter(t => {
            const tDate = new Date(t.date);
            return tDate >= startDate && tDate <= endDate;
        })
        .forEach(t => {
            const monthKey = getMonthKey(t.date);
            const category = t.category || 'Other';
            
            if (!categoryByMonth[category]) {
                categoryByMonth[category] = {};
            }
            categoryByMonth[category][monthKey] = (categoryByMonth[category][monthKey] || 0) + t.amount;
        });

    return categoryByMonth;
}

// Get trend direction for a category
function getTrendDirection(categoryData) {
    const months = Object.keys(categoryData).sort();
    if (months.length < 2) return 'stable';

    const recent = categoryData[months[months.length - 1]] || 0;
    const previous = categoryData[months[months.length - 2]] || 0;

    const change = calculatePercentageChange(previous, recent);
    
    if (Math.abs(change) < 5) return 'stable';
    return change > 0 ? 'up' : 'down';
}

// Calculate MoM percentage change for category
function getCategoryMoMChange(categoryData) {
    const months = Object.keys(categoryData).sort();
    if (months.length < 2) return 0;

    const recent = categoryData[months[months.length - 1]] || 0;
    const previous = categoryData[months[months.length - 2]] || 0;

    return calculatePercentageChange(previous, recent);
}

// Identify growing categories
function identifyGrowingCategories(transactions, threshold = 10) {
    const trends = analyzeCategoryTrends(transactions, 3);
    const growing = [];

    Object.entries(trends).forEach(([category, data]) => {
        const change = getCategoryMoMChange(data);
        if (change > threshold) {
            growing.push({
                category,
                change: change.toFixed(1),
                trend: 'up'
            });
        }
    });

    return growing.sort((a, b) => parseFloat(b.change) - parseFloat(a.change));
}

// Identify declining categories
function identifyDecliningCategories(transactions, threshold = -10) {
    const trends = analyzeCategoryTrends(transactions, 3);
    const declining = [];

    Object.entries(trends).forEach(([category, data]) => {
        const change = getCategoryMoMChange(data);
        if (change < threshold) {
            declining.push({
                category,
                change: change.toFixed(1),
                trend: 'down'
            });
        }
    });

    return declining.sort((a, b) => parseFloat(a.change) - parseFloat(b.change));
}

// ===== PREDICTIVE ANALYTICS =====

// Calculate moving average
function calculateMovingAverage(values, periods = 3) {
    if (values.length < periods) return values[values.length - 1] || 0;
    
    const recent = values.slice(-periods);
    return recent.reduce((sum, val) => sum + val, 0) / periods;
}

// Predict next month spending
function predictNextMonthSpending(transactions) {
    const monthlyExpenses = {};
    
    // Get last 6 months of expenses
    transactions
        .filter(t => t.type === 'expense' && !isTransfer(t))
        .forEach(t => {
            const monthKey = getMonthKey(t.date);
            monthlyExpenses[monthKey] = (monthlyExpenses[monthKey] || 0) + t.amount;
        });

    const months = Object.keys(monthlyExpenses).sort();
    const values = months.map(m => monthlyExpenses[m]);

    if (values.length === 0) return { prediction: 0, confidence: 'low', range: { min: 0, max: 0 } };

    // Simple moving average prediction
    const prediction = calculateMovingAverage(values, Math.min(3, values.length));

    // Calculate standard deviation for confidence interval
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Confidence interval (±1 std dev ≈ 68% confidence)
    const range = {
        min: Math.max(0, prediction - stdDev),
        max: prediction + stdDev
    };

    // Determine confidence level
    const coefficientOfVariation = (stdDev / mean) * 100;
    let confidence = 'medium';
    if (coefficientOfVariation < 20) confidence = 'high';
    else if (coefficientOfVariation > 40) confidence = 'low';

    return {
        prediction: Math.round(prediction),
        confidence,
        range: {
            min: Math.round(range.min),
            max: Math.round(range.max)
        },
        basedOnMonths: values.length
    };
}

// Get trend-based prediction
function getTrendBasedPrediction(transactions) {
    const monthlyExpenses = {};
    
    transactions
        .filter(t => t.type === 'expense' && !isTransfer(t))
        .forEach(t => {
            const monthKey = getMonthKey(t.date);
            monthlyExpenses[monthKey] = (monthlyExpenses[monthKey] || 0) + t.amount;
        });

    const months = Object.keys(monthlyExpenses).sort();
    const values = months.map(m => monthlyExpenses[m]);

    if (values.length < 2) return predictNextMonthSpending(transactions);

    // Calculate trend (linear regression slope)
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((sum, val) => sum + val, 0) / n;
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
        numerator += (i - xMean) * (values[i] - yMean);
        denominator += Math.pow(i - xMean, 2);
    }
    
    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = yMean - slope * xMean;
    
    // Predict next value
    const prediction = slope * n + intercept;

    return {
        prediction: Math.max(0, Math.round(prediction)),
        trend: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable',
        monthlyChange: Math.round(slope)
    };
}

// ===== PERIOD COMPARISON =====

// Compare Month over Month
function compareMonthOverMonth(transactions) {
    const currentMonth = getMonthKey(new Date().toISOString());
    const lastMonth = getMonthKey(new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString());

    const currentData = {
        income: 0,
        expense: 0,
        balance: 0
    };
    const lastMonthData = {
        income: 0,
        expense: 0,
        balance: 0
    };

    transactions.filter(t => !isTransfer(t)).forEach(t => {
        const monthKey = getMonthKey(t.date);
        const amount = t.amount;

        if (monthKey === currentMonth) {
            if (t.type === 'income') currentData.income += amount;
            else currentData.expense += amount;
        } else if (monthKey === lastMonth) {
            if (t.type === 'income') lastMonthData.income += amount;
            else lastMonthData.expense += amount;
        }
    });

    currentData.balance = currentData.income - currentData.expense;
    lastMonthData.balance = lastMonthData.income - lastMonthData.expense;

    return {
        current: currentData,
        previous: lastMonthData,
        changes: {
            income: calculatePercentageChange(lastMonthData.income, currentData.income),
            expense: calculatePercentageChange(lastMonthData.expense, currentData.expense),
            balance: calculatePercentageChange(lastMonthData.balance, currentData.balance)
        }
    };
}

// Compare Year over Year
function compareYearOverYear(transactions) {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;

    const currentData = { income: 0, expense: 0, balance: 0 };
    const lastYearData = { income: 0, expense: 0, balance: 0 };

    transactions.filter(t => !isTransfer(t)).forEach(t => {
        const tDate = new Date(t.date);
        const tMonth = tDate.getMonth();
        const tYear = tDate.getFullYear();
        const amount = t.amount;

        if (tYear === currentYear && tMonth === currentMonth) {
            if (t.type === 'income') currentData.income += amount;
            else currentData.expense += amount;
        } else if (tYear === lastYear && tMonth === currentMonth) {
            if (t.type === 'income') lastYearData.income += amount;
            else lastYearData.expense += amount;
        }
    });

    currentData.balance = currentData.income - currentData.expense;
    lastYearData.balance = lastYearData.income - lastYearData.expense;

    return {
        current: currentData,
        previous: lastYearData,
        changes: {
            income: calculatePercentageChange(lastYearData.income, currentData.income),
            expense: calculatePercentageChange(lastYearData.expense, currentData.expense),
            balance: calculatePercentageChange(lastYearData.balance, currentData.balance)
        }
    };
}

// Compare custom periods
function compareCustomPeriod(transactions, start1, end1, start2, end2) {
    const period1Data = { income: 0, expense: 0, balance: 0 };
    const period2Data = { income: 0, expense: 0, balance: 0 };

    const s1 = new Date(start1);
    const e1 = new Date(end1);
    const s2 = new Date(start2);
    const e2 = new Date(end2);

    transactions.filter(t => !isTransfer(t)).forEach(t => {
        const tDate = new Date(t.date);
        const amount = t.amount;

        if (tDate >= s1 && tDate <= e1) {
            if (t.type === 'income') period1Data.income += amount;
            else period1Data.expense += amount;
        } else if (tDate >= s2 && tDate <= e2) {
            if (t.type === 'income') period2Data.income += amount;
            else period2Data.expense += amount;
        }
    });

    period1Data.balance = period1Data.income - period1Data.expense;
    period2Data.balance = period2Data.income - period2Data.expense;

    return {
        period1: period1Data,
        period2: period2Data,
        changes: {
            income: calculatePercentageChange(period2Data.income, period1Data.income),
            expense: calculatePercentageChange(period2Data.expense, period1Data.expense),
            balance: calculatePercentageChange(period2Data.balance, period1Data.balance)
        }
    };
}

// Generate comparison insights
function generateComparisonInsights(comparisonData) {
    const insights = [];
    const { changes } = comparisonData;

    if (Math.abs(changes.income) > 10) {
        const direction = changes.income > 0 ? 'increased' : 'decreased';
        insights.push(`💰 Income ${direction} by ${Math.abs(changes.income).toFixed(1)}%`);
    }

    if (Math.abs(changes.expense) > 10) {
        const direction = changes.expense > 0 ? 'increased' : 'decreased';
        const emoji = changes.expense > 0 ? '⚠️' : '✅';
        insights.push(`${emoji} Expenses ${direction} by ${Math.abs(changes.expense).toFixed(1)}%`);
    }

    if (changes.balance > 20) {
        insights.push(`🎉 Balance improved by ${changes.balance.toFixed(1)}%`);
    } else if (changes.balance < -20) {
        insights.push(`📉 Balance decreased by ${Math.abs(changes.balance).toFixed(1)}%`);
    }

    return insights;
}

// ===== AUTO-GENERATED INSIGHTS =====

function generateInsights(transactions) {
    const insights = [];

    // Spending patterns insights
    const peakTimes = getPeakSpendingTimes(transactions);
    if (peakTimes.peakDay) {
        insights.push({
            type: 'pattern',
            icon: '🎯',
            message: `Your highest spending day is ${peakTimes.peakDay} (avg ${formatCurrency(Math.round(peakTimes.peakDayAverage))})`
        });
    }

    // Category trends insights
    const growing = identifyGrowingCategories(transactions, 15);
    if (growing.length > 0) {
        const top = growing[0];
        insights.push({
            type: 'trend',
            icon: '📈',
            message: `Spending on '${top.category}' increased by ${top.change}% this month`
        });
    }

    const declining = identifyDecliningCategories(transactions, -15);
    if (declining.length > 0) {
        const top = declining[0];
        insights.push({
            type: 'trend',
            icon: '✅',
            message: `Great job! '${top.category}' expenses decreased by ${Math.abs(top.change)}%`
        });
    }

    // Predictive insights
    const prediction = predictNextMonthSpending(transactions);
    if (prediction.basedOnMonths >= 2) {
        insights.push({
            type: 'prediction',
            icon: '🔮',
            message: `Expected expenses next month: ${formatCurrency(prediction.prediction)} (${prediction.confidence} confidence)`
        });
    }

    // MoM comparison insights
    const mom = compareMonthOverMonth(transactions);
    const momInsights = generateComparisonInsights(mom);
    momInsights.forEach(msg => {
        insights.push({
            type: 'comparison',
            icon: '📊',
            message: msg
        });
    });

    return insights;
}

// ===== EXPORT MODULE =====

window.analyticsModule = {
    // Spending patterns
    analyzeSpendingByDay,
    analyzeSpendingByWeek,
    getSpendingHeatmap,
    getPeakSpendingTimes,
    
    // Category trends
    analyzeCategoryTrends,
    getTrendDirection,
    getCategoryMoMChange,
    identifyGrowingCategories,
    identifyDecliningCategories,
    
    // Predictive analytics
    predictNextMonthSpending,
    getTrendBasedPrediction,
    calculateMovingAverage,
    
    // Period comparison
    compareMonthOverMonth,
    compareYearOverYear,
    compareCustomPeriod,
    generateComparisonInsights,
    
    // Insights
    generateInsights,
    
    // Utilities
    formatCurrency,
    calculatePercentageChange
};

console.log('Analytics module loaded');
