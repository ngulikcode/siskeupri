// Admin Dashboard Module
// Displays user analytics and statistics (admin-only)

let adminStats = {
    totalUsers: 0,
    activeUsers: 0,
    pwaInstallations: 0
};

// Fetch admin statistics
async function fetchAdminStats() {
    try {
        // Check if user is admin
        const isAdminUser = await window.analyticsTracking.isAdmin();
        if (!isAdminUser) {
            console.error('Access denied: Admin only');
            return null;
        }

        // Fetch total users count
        const { data: totalData, error: totalError } = await supabase
            .rpc('get_total_users_count');
        
        if (totalError) throw totalError;

        // Fetch active users count
        const { data: activeData, error: activeError } = await supabase
            .rpc('get_active_users_count');
        
        if (activeError) throw activeError;

        // Fetch PWA installations count
        const { data: pwaData, error: pwaError } = await supabase
            .rpc('get_pwa_installations_count');
        
        if (pwaError) throw pwaError;

        adminStats = {
            totalUsers: totalData || 0,
            activeUsers: activeData || 0,
            pwaInstallations: pwaData || 0
        };

        return adminStats;
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        return null;
    }
}

// Fetch all users with their last login
async function fetchAllUsers() {
    try {
        const isAdminUser = await window.analyticsTracking.isAdmin();
        if (!isAdminUser) {
            throw new Error('Access denied: Admin only');
        }

        // Get all analytics events
        const { data: analytics, error } = await supabase
            .from('user_analytics')
            .select('user_id, event_type, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Group by user and get last login
        const usersMap = new Map();
        
        analytics.forEach(event => {
            if (!usersMap.has(event.user_id)) {
                usersMap.set(event.user_id, {
                    user_id: event.user_id,
                    last_login: event.event_type === 'login' ? event.created_at : null,
                    last_activity: event.created_at
                });
            } else {
                const user = usersMap.get(event.user_id);
                if (event.event_type === 'login' && !user.last_login) {
                    user.last_login = event.created_at;
                }
            }
        });

        return Array.from(usersMap.values());
    } catch (error) {
        console.error('Error fetching all users:', error);
        return [];
    }
}

// Fetch user growth data for chart
async function fetchUserGrowthData(days = 30) {
    try {
        const isAdminUser = await window.analyticsTracking.isAdmin();
        if (!isAdminUser) {
            throw new Error('Access denied: Admin only');
        }

        const { data, error } = await supabase
            .from('user_analytics')
            .select('created_at, user_id')
            .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Group by date
        const growthByDate = {};
        const uniqueUsers = new Set();

        data.forEach(event => {
            const date = event.created_at.split('T')[0];
            uniqueUsers.add(event.user_id);
            
            if (!growthByDate[date]) {
                growthByDate[date] = new Set();
            }
            growthByDate[date].add(event.user_id);
        });

        // Convert to array format for chart
        const labels = Object.keys(growthByDate).sort();
        const values = labels.map(date => growthByDate[date].size);

        return { labels, values };
    } catch (error) {
        console.error('Error fetching user growth data:', error);
        return { labels: [], values: [] };
    }
}

// Render admin dashboard
async function renderAdminDashboard() {
    const container = document.getElementById('admin-dashboard-content');
    if (!container) return;

    // Check if user is admin
    const isAdminUser = await window.analyticsTracking.isAdmin();
    if (!isAdminUser) {
        container.innerHTML = `
            <div class="admin-error-state">
                <i class="fa-solid fa-lock" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                <h3>Access Denied</h3>
                <p>You do not have permission to access this page.</p>
            </div>
        `;
        return;
    }

    // Show loading state
    container.innerHTML = `
        <div class="admin-loading">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-color);"></i>
            <p style="margin-top: 1rem; color: var(--text-muted);">Loading analytics...</p>
        </div>
    `;

    // Fetch stats
    const stats = await fetchAdminStats();
    if (!stats) {
        container.innerHTML = `
            <div class="admin-error-state">
                <i class="fa-solid fa-database" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                <h3>Setup Required</h3>
                <p>Analytics tables not found. Please run the database migration script.</p>
                <div style="background: var(--bg-secondary); padding: 1rem; border-radius: 8px; margin-top: 1rem; text-align: left;">
                    <p style="font-size: 0.875rem; margin-bottom: 0.5rem;"><strong>Steps:</strong></p>
                    <ol style="font-size: 0.875rem; margin: 0; padding-left: 1.5rem;">
                        <li>Go to Supabase Dashboard > SQL Editor</li>
                        <li>Run the script from <code>database/analytics-migration.sql</code></li>
                        <li>Refresh this page</li>
                    </ol>
                </div>
            </div>
        `;
        return;
    }

    // Render stats cards
    container.innerHTML = `
        <div class="admin-stats-grid">
            <div class="admin-stat-card">
                <div class="admin-stat-icon">
                    <i class="fa-solid fa-users"></i>
                </div>
                <div class="admin-stat-content">
                    <h4>Total Users</h4>
                    <p class="admin-stat-value">${stats.totalUsers}</p>
                    <small>All registered users</small>
                </div>
            </div>

            <div class="admin-stat-card">
                <div class="admin-stat-icon active">
                    <i class="fa-solid fa-user-check"></i>
                </div>
                <div class="admin-stat-content">
                    <h4>Active Users</h4>
                    <p class="admin-stat-value">${stats.activeUsers}</p>
                    <small>Logged in last 24 hours</small>
                </div>
            </div>

            <div class="admin-stat-card">
                <div class="admin-stat-icon pwa">
                    <i class="fa-solid fa-download"></i>
                </div>
                <div class="admin-stat-content">
                    <h4>PWA Installations</h4>
                    <p class="admin-stat-value">${stats.pwaInstallations}</p>
                    <small>Users who installed PWA</small>
                </div>
            </div>

            <div class="admin-stat-card">
                <div class="admin-stat-icon rate">
                    <i class="fa-solid fa-chart-line"></i>
                </div>
                <div class="admin-stat-content">
                    <h4>Install Rate</h4>
                    <p class="admin-stat-value">${stats.totalUsers > 0 ? ((stats.pwaInstallations / stats.totalUsers) * 100).toFixed(1) : 0}%</p>
                    <small>PWA installation rate</small>
                </div>
            </div>
        </div>

        <div class="admin-chart-section">
            <h3>User Activity (Last 30 Days)</h3>
            <canvas id="admin-user-growth-chart"></canvas>
        </div>

        <div class="admin-users-section">
            <div class="card-header">
                <h3>Recent User Activity</h3>
                <button id="export-users-btn" class="btn-secondary">Export CSV</button>
            </div>
            <div id="admin-users-list"></div>
        </div>
    `;

    // Render user growth chart
    await renderUserGrowthChart();

    // Render users list
    await renderUsersList();

    // Add export button listener
    const exportBtn = document.getElementById('export-users-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportUsersToCSV);
    }
}

// Render user growth chart
async function renderUserGrowthChart() {
    const canvas = document.getElementById('admin-user-growth-chart');
    if (!canvas) return;

    const growthData = await fetchUserGrowthData(30);
    
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: growthData.labels,
            datasets: [{
                label: 'Active Users',
                data: growthData.values,
                borderColor: '#D4AF37',
                backgroundColor: 'rgba(212, 175, 55, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(18, 18, 18, 0.95)',
                    titleColor: '#ffffff',
                    bodyColor: '#9ca3af'
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
                    ticks: { 
                        color: '#9ca3af',
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
}

// Render users list
async function renderUsersList() {
    const container = document.getElementById('admin-users-list');
    if (!container) return;

    const users = await fetchAllUsers();
    
    if (users.length === 0) {
        container.innerHTML = '<p class="empty-state">No user data available</p>';
        return;
    }

    const html = `
        <table class="admin-users-table">
            <thead>
                <tr>
                    <th>User ID</th>
                    <th>Last Login</th>
                    <th>Last Activity</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => {
                    const lastLogin = user.last_login ? new Date(user.last_login).toLocaleString('id-ID') : 'Never';
                    const lastActivity = new Date(user.last_activity).toLocaleString('id-ID');
                    const isActive = user.last_login && (Date.now() - new Date(user.last_login).getTime()) < 24 * 60 * 60 * 1000;
                    
                    return `
                        <tr>
                            <td><code>${user.user_id.substring(0, 8)}...</code></td>
                            <td>${lastLogin}</td>
                            <td>${lastActivity}</td>
                            <td><span class="status-badge ${isActive ? 'active' : 'inactive'}">${isActive ? 'Active' : 'Inactive'}</span></td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

// Export users to CSV
async function exportUsersToCSV() {
    const users = await fetchAllUsers();
    
    if (users.length === 0) {
        Swal.fire('Info', 'No data to export', 'info');
        return;
    }

    const header = ['User ID', 'Last Login', 'Last Activity', 'Status'];
    const rows = users.map(user => {
        const lastLogin = user.last_login ? new Date(user.last_login).toISOString() : 'Never';
        const lastActivity = new Date(user.last_activity).toISOString();
        const isActive = user.last_login && (Date.now() - new Date(user.last_login).getTime()) < 24 * 60 * 60 * 1000;
        
        return [
            user.user_id,
            lastLogin,
            lastActivity,
            isActive ? 'Active' : 'Inactive'
        ];
    });

    const csv = [
        header.join(','),
        ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users_analytics_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

// Refresh dashboard data
async function refreshAdminDashboard() {
    await renderAdminDashboard();
}

// Export module
window.adminDashboard = {
    fetchAdminStats,
    fetchAllUsers,
    fetchUserGrowthData,
    renderAdminDashboard,
    refreshAdminDashboard,
    exportUsersToCSV
};

console.log('Admin dashboard module loaded');
