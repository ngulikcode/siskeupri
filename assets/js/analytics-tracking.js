// Analytics Tracking Module
// Tracks user events: login, PWA installation, session activity

// Check if user is admin
async function isAdmin() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;
        
        return user.user_metadata?.is_admin === true;
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

// Track user login event
async function trackLogin() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('user_analytics')
            .insert([{
                user_id: user.id,
                event_type: 'login',
                event_data: {
                    timestamp: new Date().toISOString(),
                    email: user.email
                },
                user_agent: navigator.userAgent
            }]);

        if (error) {
            console.error('Error tracking login:', error);
        }
    } catch (error) {
        console.error('Error in trackLogin:', error);
    }
}

// Track PWA installation
async function trackPWAInstall() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check if already tracked
        const { data: existing } = await supabase
            .from('pwa_installations')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (existing) {
            console.log('PWA installation already tracked');
            return;
        }

        // Detect platform
        const platform = navigator.platform || 'Unknown';
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                            window.navigator.standalone ||
                            document.referrer.includes('android-app://');

        const { error } = await supabase
            .from('pwa_installations')
            .insert([{
                user_id: user.id,
                user_agent: navigator.userAgent,
                platform: platform,
                is_standalone: isStandalone
            }]);

        if (error) {
            console.error('Error tracking PWA install:', error);
        } else {
            console.log('PWA installation tracked successfully');
        }
    } catch (error) {
        console.error('Error in trackPWAInstall:', error);
    }
}

// Track session start
async function trackSessionStart() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('user_analytics')
            .insert([{
                user_id: user.id,
                event_type: 'session_start',
                event_data: {
                    timestamp: new Date().toISOString(),
                    page: window.location.pathname
                },
                user_agent: navigator.userAgent
            }]);

        if (error) {
            console.error('Error tracking session start:', error);
        }
    } catch (error) {
        console.error('Error in trackSessionStart:', error);
    }
}

// Track session end (on page unload)
async function trackSessionEnd() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Use sendBeacon for reliable tracking on page unload
        const data = {
            user_id: user.id,
            event_type: 'session_end',
            event_data: {
                timestamp: new Date().toISOString(),
                duration: performance.now()
            },
            user_agent: navigator.userAgent
        };

        const { error } = await supabase
            .from('user_analytics')
            .insert([data]);

        if (error) {
            console.error('Error tracking session end:', error);
        }
    } catch (error) {
        console.error('Error in trackSessionEnd:', error);
    }
}

// Initialize tracking
function initializeTracking() {
    // Track session start when page loads
    trackSessionStart();

    // Track session end when page unloads
    window.addEventListener('beforeunload', trackSessionEnd);

    // Check if running as PWA and track installation
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone || 
        document.referrer.includes('android-app://')) {
        trackPWAInstall();
    }

    // Listen for PWA install prompt
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        deferredPrompt = e;
    });

    // Track when PWA is actually installed
    window.addEventListener('appinstalled', () => {
        console.log('PWA was installed');
        trackPWAInstall();
    });
}

// Export module
window.analyticsTracking = {
    isAdmin,
    trackLogin,
    trackPWAInstall,
    trackSessionStart,
    trackSessionEnd,
    initializeTracking
};

// Auto-initialize if user is logged in
(async function() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        initializeTracking();
    }
})();

console.log('Analytics tracking module loaded');
