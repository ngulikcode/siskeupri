// Admin Dashboard Event Listeners and Navigation
// Handles admin menu visibility and navigation

// Initialize admin features after auth
async function initializeAdminFeatures() {
    const isAdminUser = await window.analyticsTracking.isAdmin();
    
    // Show/hide admin menu item
    const adminMenuItem = document.getElementById('admin-menu-item');
    if (adminMenuItem) {
        if (isAdminUser) {
            adminMenuItem.classList.remove('hidden');
        } else {
            adminMenuItem.classList.add('hidden');
        }
    }
}

// Admin Dashboard Navigation
const adminDashboardNavBtn = document.getElementById('admin-dashboard-nav-btn');
if (adminDashboardNavBtn) {
    adminDashboardNavBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        // Check if user is admin
        const isAdminUser = await window.analyticsTracking.isAdmin();
        if (!isAdminUser) {
            Swal.fire('Access Denied', 'You do not have permission to access this page', 'error');
            return;
        }

        // Hide all content sections
        document.querySelector('.main-content').classList.add('hidden');
        document.getElementById('analytics-content')?.classList.add('hidden');
        document.getElementById('admin-dashboard-section')?.classList.remove('hidden');

        // Update active nav
        document.querySelectorAll('.sidebar nav li').forEach(li => li.classList.remove('active'));
        adminDashboardNavBtn.parentElement.classList.add('active');

        // Render admin dashboard
        if (window.adminDashboard) {
            await window.adminDashboard.renderAdminDashboard();
        }
    });
}

// Refresh Admin Dashboard Button
const refreshAdminBtn = document.getElementById('refresh-admin-dashboard-btn');
if (refreshAdminBtn) {
    refreshAdminBtn.addEventListener('click', async () => {
        if (window.adminDashboard) {
            await window.adminDashboard.refreshAdminDashboard();
            Swal.fire('Success', 'Dashboard data refreshed', 'success');
        }
    });
}

// Update existing dashboard nav button to hide admin dashboard
const dashboardNavBtn = document.getElementById('dashboard-nav-btn');
if (dashboardNavBtn) {
    const originalClickHandler = dashboardNavBtn.onclick;
    dashboardNavBtn.addEventListener('click', (e) => {
        document.getElementById('admin-dashboard-section')?.classList.add('hidden');
        document.querySelector('.main-content')?.classList.remove('hidden');
        document.getElementById('analytics-content')?.classList.add('hidden');
    });
}

// Update analytics nav button to hide admin dashboard
const analyticsNavBtn = document.getElementById('analytics-nav-btn');
if (analyticsNavBtn) {
    analyticsNavBtn.addEventListener('click', (e) => {
        document.getElementById('admin-dashboard-section')?.classList.add('hidden');
        document.querySelector('.main-content')?.classList.add('hidden');
        document.getElementById('analytics-content')?.classList.remove('hidden');
    });
}

// Track login when user successfully authenticates
// This should be called from auth.js after successful login
window.addEventListener('userLoggedIn', async () => {
    // Track login event
    if (window.analyticsTracking) {
        await window.analyticsTracking.trackLogin();
    }
    
    // Initialize admin features
    await initializeAdminFeatures();
});

// Initialize on page load if user is already logged in
(async function() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await initializeAdminFeatures();
    }
})();

console.log('Admin dashboard listeners loaded');
