// Auth Logic

const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const toggleAuthBtn = document.getElementById('toggle-auth');
const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const logoutBtn = document.getElementById('logout-btn');
const userEmailDisplay = document.getElementById('user-email');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.querySelector('.sidebar');
const profileModal = document.getElementById('profile-modal');
const profileBtn = document.getElementById('profile-settings-btn');
const closeProfileModalBtn = document.getElementById('close-profile-modal-btn');
const profileForm = document.getElementById('profile-form');
const profileFullNameInput = document.getElementById('profile-full-name');
const profileNewPasswordInput = document.getElementById('profile-new-password');
const profileConfirmPasswordInput = document.getElementById('profile-confirm-password');
const forgotPasswordBtn = document.getElementById('forgot-password-btn');
const magicLinkBtn = document.getElementById('magic-link-btn');
const inviteUserBtn = document.getElementById('invite-user-btn');
const resetPasswordModal = document.getElementById('reset-password-modal');
const closeResetPasswordModalBtn = document.getElementById('close-reset-password-modal-btn');
const resetPasswordForm = document.getElementById('reset-password-form');
const resetNewPasswordInput = document.getElementById('reset-new-password');
const resetConfirmPasswordInput = document.getElementById('reset-confirm-password');

// Global handler for invalid/expired refresh tokens
function handleAuthSessionError(error) {
    if (!error) return;
    const message = (error.message || '').toLowerCase();
    if (message.includes('refresh token')) {
        // Force sign out and ask user to login again
        supabase.auth.signOut().finally(() => {
            // Optional: clear any cached session if stored elsewhere
            localStorage.removeItem('supabase.auth.token');
            Swal.fire({
                title: 'Session expired',
                text: 'Please sign in again to continue.',
                icon: 'info',
                confirmButtonColor: '#D4AF37'
            });
        });
    }
}

// Catch unhandled refresh token errors (e.g., stale/invalid session)
window.addEventListener('unhandledrejection', (event) => {
    const err = event.reason;
    if (err && err.message && /refresh token/i.test(err.message)) {
        event.preventDefault();
        handleAuthSessionError(err);
    }
});

// Create Overlay for mobile
const overlay = document.createElement('div');
overlay.className = 'sidebar-overlay';
document.body.appendChild(overlay);

let isLoginMode = true;

// Sidebar Toggle
if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    });
}

// Close sidebar when clicking overlay
overlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
});

// Profile Settings Modal
if (profileBtn) {
    profileBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const fullName = user.user_metadata?.full_name || '';
            profileFullNameInput.value = fullName;
        }
        profileModal.classList.remove('hidden');
    });
}

if (closeProfileModalBtn) {
    closeProfileModalBtn.addEventListener('click', () => {
        profileModal.classList.add('hidden');
        profileForm.reset();
    });
}

// PWA Install Popup - Tambahkan ke auth.js atau buat file terpisah

let deferredInstallPrompt = null;
let installPromptShown = false;

// Fungsi untuk menampilkan pop-up install
function showInstallPopup() {
    if (!deferredInstallPrompt || installPromptShown) return;
    
    // Cek apakah aplikasi sudah terinstall
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
        return;
    }
    
    installPromptShown = true;

    const isMobile = window.innerWidth <= 768;
    const modalWidth = isMobile ? '90%' : '500px';
    
    Swal.fire({
        title: '📱 Unduh Aplikasi SisKePri',
        html: `
            <div style="text-align: center; width: 100%;">
                <p style="font-size: ${isMobile ? '14px' : '16px'}; margin-bottom: ${isMobile ? '15px' : '20px'}; color: #333; line-height: 1.5;">
                    Pasang aplikasi ke perangkat Anda untuk pengalaman yang lebih baik!
                </p>
                <p style="font-size: ${isMobile ? '12px' : '13px'}; color: #666; margin-top: ${isMobile ? '12px' : '15px'}; line-height: 1.4;">
                    Klik "Install Sekarang" untuk menambahkan aplikasi ke layar utama Anda.
                </p>
            </div>
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: '✓ Install Sekarang',
        cancelButtonText: '✕ Nanti Saja',
        confirmButtonColor: '#D4AF37',
        cancelButtonColor: '#6c757d',
        reverseButtons: true,
        allowOutsideClick: false,
        allowEscapeKey: true,
        width: modalWidth,
        padding: isMobile ? '1rem' : '1.5rem',
        customClass: {
            popup: 'install-popup-custom',
            title: isMobile ? 'swal2-title-mobile' : '',
            htmlContainer: isMobile ? 'swal2-html-container-mobile' : ''
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                deferredInstallPrompt.prompt();
                const choice = await deferredInstallPrompt.userChoice;
                
                if (choice && choice.outcome === 'accepted') {
                    Swal.fire({
                        title: '🎉 Berhasil!',
                        text: 'Aplikasi SisKePri berhasil ditambahkan ke perangkat Anda.',
                        icon: 'success',
                        timer: 3000,
                        showConfirmButton: false,
                        toast: true,
                        position: 'top-end',
                        confirmButtonColor: '#D4AF37'
                    });
                    // Hapus data dismissed karena sudah terinstall
                    localStorage.removeItem('pwa_install_dismissed');
                } else {
                    // User membatalkan di native prompt
                    installPromptShown = false;
                }
            } catch (error) {
                console.error('Error showing install prompt:', error);
                installPromptShown = false;
            }
            
            deferredInstallPrompt = null;
        } else {
            // User klik "Nanti Saja"
            // Simpan timestamp untuk tidak mengganggu lagi dalam 7 hari
            localStorage.setItem('pwa_install_dismissed', Date.now());
            installPromptShown = false; // Reset untuk next time
        }
    });
}

// Fungsi untuk cek apakah sudah waktunya menampilkan prompt lagi
function shouldShowInstallPrompt() {
    // Jika sudah pernah didismiss, jangan munculkan lagi (Permanent Dismissal)
    const dismissed = localStorage.getItem('pwa_install_dismissed');
    if (dismissed) return false;
    
    return true; 
}

// Fungsi untuk menampilkan alert install setelah dashboard dimuat
function triggerInstallPrompt() {
    // Cek apakah sudah terinstall atau tidak
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
        // Aplikasi sudah terinstall, tidak perlu tampilkan alert
        return;
    }
    
    // Cek apakah dashboard visible
    const dashboardSection = document.getElementById('dashboard-section');
    if (!dashboardSection || dashboardSection.classList.contains('hidden')) {
        return;
    }
    
    // Cek apakah deferred prompt tersedia dan boleh ditampilkan
    if (deferredInstallPrompt && shouldShowInstallPrompt() && !installPromptShown) {
        setTimeout(() => {
            if (deferredInstallPrompt && shouldShowInstallPrompt() && !installPromptShown) {
                showInstallPopup();
            }
        }, 3000); // Delay 3 detik setelah dashboard dimuat
    }
}

// Listener untuk event beforeinstallprompt
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent default browser install prompt
    e.preventDefault();
    
    // Store the event for later use
    deferredInstallPrompt = e;
    installPromptShown = false; // Reset flag
    
    // Log untuk debugging (bukan error) - ini normal behavior
    console.log('📱 PWA Install prompt available. Click the install button to install the app.');
    console.log('ℹ️ This message is normal - we prevent the default banner to show our custom button instead.');
    
    // Update button visibility jika button sudah ada
    const pwaInstallBtn = document.getElementById('pwa-install-btn');
    if (pwaInstallBtn) {
        const isAuthVisible = !document.getElementById('auth-section')?.classList.contains('hidden');
        if (isAuthVisible && deferredInstallPrompt) {
            pwaInstallBtn.style.display = 'flex';
        }
    }
    
    // Cek apakah dashboard sudah visible saat event terjadi
    const isDashboardVisible = !document.getElementById('dashboard-section')?.classList.contains('hidden');
    
    if (isDashboardVisible && shouldShowInstallPrompt()) {
        triggerInstallPrompt();
    }
});

// Fungsi untuk deteksi iOS/Safari
function isIOSDevice() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// Fungsi untuk menampilkan instruksi install manual untuk iOS
function showIOSInstallInstructions() {
    // Cek apakah sudah terinstall
    if (window.navigator.standalone) {
        return;
    }
    
    // Cek apakah sudah pernah ditampilkan
    const dismissed = localStorage.getItem('pwa_install_dismissed');
    const today = new Date().toDateString();
    const lastShownDate = localStorage.getItem('ios_install_shown_date');
    
    if (lastShownDate === today || (dismissed && (Date.now() - parseInt(dismissed)) < 7 * 24 * 60 * 60 * 1000)) {
        return;
    }
    
    const dashboardSection = document.getElementById('dashboard-section');
    if (!dashboardSection || dashboardSection.classList.contains('hidden')) {
        return;
    }
    
    setTimeout(() => {
        // Deteksi ukuran layar untuk responsive width
        const isMobile = window.innerWidth <= 768;
        const modalWidth = isMobile ? '90%' : '550px';
        
        Swal.fire({
            title: '📱 Unduh Aplikasi SisKePri',
            html: `
                <div style="text-align: center; width: 100%;">
                    <p style="font-size: ${isMobile ? '14px' : '16px'}; margin-bottom: ${isMobile ? '15px' : '20px'}; color: #333; line-height: 1.5;">
                        Pasang aplikasi ke iPhone/iPad Anda untuk pengalaman yang lebih baik!
                    </p>
                    <div style="text-align: left; margin: ${isMobile ? '15px' : '20px'} auto; max-width: ${isMobile ? '100%' : '400px'}; background: #f8f9fa; padding: ${isMobile ? '15px' : '20px'}; border-radius: 10px; box-sizing: border-box;">
                        <p style="margin: 0 0 ${isMobile ? '8px' : '10px'} 0; font-size: ${isMobile ? '13px' : '14px'}; font-weight: bold;">
                            📱 Cara Instal di iOS:
                        </p>
                        <ol style="margin: ${isMobile ? '8px' : '10px'} 0; padding-left: ${isMobile ? '20px' : '25px'}; line-height: ${isMobile ? '1.6' : '2'}; font-size: ${isMobile ? '12px' : '13px'};">
                            <li style="margin-bottom: ${isMobile ? '6px' : '8px'};">Klik tombol <strong>Share</strong> (kotak dengan panah) di bagian bawah layar</li>
                            <li style="margin-bottom: ${isMobile ? '6px' : '8px'};">Scroll ke bawah dan pilih <strong>"Add to Home Screen"</strong></li>
                            <li style="margin-bottom: ${isMobile ? '6px' : '8px'};">Klik <strong>"Add"</strong> untuk mengkonfirmasi</li>
                            <li style="margin-bottom: 0;">Aplikasi akan muncul di layar utama Anda!</li>
                        </ol>
                    </div>
                    <div style="text-align: left; margin: ${isMobile ? '15px' : '20px'} auto; max-width: ${isMobile ? '100%' : '350px'}; background: #fff3cd; padding: ${isMobile ? '12px' : '15px'}; border-radius: 10px; border-left: 4px solid #ffc107; box-sizing: border-box;">
                        <p style="margin: 0; font-size: ${isMobile ? '12px' : '13px'}; color: #856404; line-height: 1.4;">
                            <strong>💡 Tips:</strong> Setelah terpasang, aplikasi dapat diakses langsung dari layar utama tanpa membuka Safari.
                        </p>
                    </div>
                </div>
            `,
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: '✓ Mengerti',
            cancelButtonText: '✕ Nanti Saja',
            confirmButtonColor: '#D4AF37',
            cancelButtonColor: '#6c757d',
            reverseButtons: true,
            allowOutsideClick: false,
            allowEscapeKey: true,
            width: modalWidth,
            padding: isMobile ? '1rem' : '1.5rem',
            customClass: {
                popup: 'install-popup-custom',
                title: isMobile ? 'swal2-title-mobile' : '',
                htmlContainer: isMobile ? 'swal2-html-container-mobile' : ''
            }
        }).then((result) => {
            localStorage.setItem('ios_install_shown_date', today);
            if (result.dismiss === Swal.DismissReason.cancel) {
                localStorage.setItem('pwa_install_dismissed', Date.now());
            }
        });
    }, 3000);
}

// Listener untuk event ketika dashboard sudah dimuat
document.addEventListener('dashboardDataLoaded', () => {
    // Cek untuk iOS/Safari
    if (isIOSDevice() && !window.navigator.standalone) {
        showIOSInstallInstructions();
    }
    
    // Cek untuk browser yang support beforeinstallprompt
    if (deferredInstallPrompt && shouldShowInstallPrompt() && !installPromptShown) {
        triggerInstallPrompt();
    }
});

// Listener untuk event setelah app berhasil di-install
window.addEventListener('appinstalled', () => {
    Swal.fire({
        title: '🎉 Terpasang!',
        text: 'Aplikasi SisKePri berhasil dipasang di perangkat Anda.',
        icon: 'success',
        timer: 4000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
    });
    
    // Hapus data dismissed karena sudah terinstall
    localStorage.removeItem('pwa_install_dismissed');
    deferredInstallPrompt = null;
});

// Fungsi untuk manual trigger (bisa dipanggil dari settings/menu)
function manualInstallPrompt() {
    if (!deferredInstallPrompt) {
        Swal.fire({
            title: 'Sudah Terinstall',
            text: 'Aplikasi sudah terinstall atau browser tidak mendukung instalasi.',
            icon: 'info',
            confirmButtonColor: '#D4AF37'
        });
        return;
    }
    
    installPromptShown = false; // Reset flag
    showInstallPopup();
}

// Export untuk digunakan di tempat lain
window.manualInstallPrompt = manualInstallPrompt;

// Optional: Tambahkan button manual install di sidebar
// Uncomment jika ingin menambahkan tombol install manual

document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.querySelector('.sidebar nav ul');
    if (sidebar && deferredInstallPrompt) {
        const installLi = document.createElement('li');
        installLi.innerHTML = '<a href="#" id="manual-install-btn"><i class="fa-solid fa-download"></i> Install App</a>';
        sidebar.insertBefore(installLi, sidebar.children[3]); // Insert before Guide
        
        document.getElementById('manual-install-btn').addEventListener('click', (e) => {
            e.preventDefault();
            manualInstallPrompt();
        });
    }
});


if (profileModal) {
    profileModal.addEventListener('click', (e) => {
        if (e.target === profileModal) {
            profileModal.classList.add('hidden');
        }
    });
}

if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = profileFullNameInput.value.trim();
        const newPassword = profileNewPasswordInput.value;
        const confirmPassword = profileConfirmPasswordInput.value;

        try {
            if (newPassword || confirmPassword) {
                if (newPassword !== confirmPassword) {
                    Swal.fire('Error', 'New password and confirmation do not match.', 'error');
                    return;
                }
                const { error: pwError } = await supabase.auth.updateUser({ password: newPassword });
                if (pwError) throw pwError;
            }

            if (fullName) {
                const { error: metaError } = await supabase.auth.updateUser({ data: { full_name: fullName } });
                if (metaError) throw metaError;
            }

            Swal.fire('Success', 'Profile updated successfully', 'success');
            profileModal.classList.add('hidden');
            profileForm.reset();
        } catch (err) {
            Swal.fire('Error', err.message, 'error');
        }
    });
}

// Google Login
const googleLoginBtn = document.getElementById('google-login-btn');
if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            });
            if (error) throw error;
        } catch (error) {
            Swal.fire({
                title: 'Login Failed',
                text: error.message,
                icon: 'error',
                confirmButtonColor: '#d33'
            });
        }
    });
}

// Toggle between Login and Signup
toggleAuthBtn.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    document.querySelector('.auth-card h1').textContent = isLoginMode ? 'Welcome Back' : 'Create Account';
    document.querySelector('.btn-primary').textContent = isLoginMode ? 'Sign In' : 'Sign Up';
    toggleAuthBtn.textContent = isLoginMode ? 'Sign Up' : 'Sign In';
    document.querySelector('.auth-footer').childNodes[0].textContent = isLoginMode ? "Don't have an account? " : "Already have an account? ";
    
    // Toggle Google Button Visibility
    const googleBtn = document.getElementById('google-login-btn');
    if (googleBtn) {
        googleBtn.style.display = isLoginMode ? 'flex' : 'none';
    }
});

if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        if (!email) { Swal.fire('Warning', 'Enter your email first.', 'warning'); return; }
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) { Swal.fire('Error', error.message, 'error'); return; }
        Swal.fire('Success', 'Password reset link sent to your email.', 'success');
    });
}

if (magicLinkBtn) {
    magicLinkBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        if (!email) { Swal.fire('Warning', 'Enter your email first.', 'warning'); return; }
        const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
        if (error) { Swal.fire('Error', error.message, 'error'); return; }
        Swal.fire('Success', 'Magic link sent to your email.', 'success');
    });
}

if (inviteUserBtn) {
    inviteUserBtn.addEventListener('click', async () => {
        const inviteEmail = prompt('Enter email to invite');
        if (!inviteEmail) return;
        const { error } = await supabase.auth.signInWithOtp({ email: inviteEmail, options: { emailRedirectTo: window.location.origin, shouldCreateUser: true } });
        if (error) { Swal.fire('Error', error.message, 'error'); return; }
        Swal.fire('Success', 'Invitation sent via magic link.', 'success');
    });
}

if (closeResetPasswordModalBtn) {
    closeResetPasswordModalBtn.addEventListener('click', () => {
        resetPasswordModal.classList.add('hidden');
        resetPasswordForm.reset();
    });
}

if (resetPasswordModal) {
    resetPasswordModal.addEventListener('click', (e) => {
        if (e.target === resetPasswordModal) {
            resetPasswordModal.classList.add('hidden');
        }
    });
}

if (resetPasswordForm) {
    resetPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const p1 = resetNewPasswordInput.value;
        const p2 = resetConfirmPasswordInput.value;
        if (p1 !== p2) { Swal.fire('Error', 'Passwords do not match.', 'error'); return; }
        const { error } = await supabase.auth.updateUser({ password: p1 });
        if (error) { Swal.fire('Error', error.message, 'error'); return; }
        Swal.fire('Success', 'Password updated. Please sign in.', 'success');
        resetPasswordModal.classList.add('hidden');
    resetPasswordForm.reset();
    });
}

// Handle login/signup
async function handleLogin(e) {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;
    
    // Get hCaptcha Token
    const captchaToken = hcaptcha.getResponse();
    if (!captchaToken) {
        Swal.fire({
            title: 'Captcha Required',
            text: 'Please complete the captcha check.',
            icon: 'warning',
            confirmButtonColor: '#D4AF37'
        });
        return;
    }

    try {
        if (isLoginMode) {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
                options: { captchaToken }
            });
            if (error) throw error;
            // Success handled by state change listener
        } else {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: { captchaToken }
            });
            if (error) throw error;
            Swal.fire({
                title: 'Registration Successful',
                text: 'Please check your email to confirm your account.',
                icon: 'success',
                confirmButtonColor: '#D4AF37'
            });
        }
    } catch (error) {
        let errorMsg = error.message;
        if (errorMsg === 'Invalid login credentials') errorMsg = 'Email atau password salah';
        
        Swal.fire({
            title: 'Error',
            text: errorMsg,
            icon: 'error',
            confirmButtonColor: '#d33'
        });
        
        // Reset Captcha on error so user can try again
        hcaptcha.reset();
    }
}

// Handle Form Submit
loginForm.addEventListener('submit', handleLogin);

// Handle Logout
logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error logging out:', error);
});

// Auth State Change Listener
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
        if (resetPasswordModal) {
            resetPasswordModal.classList.remove('hidden');
        }
        return;
    }
    if (session) {
        // User is logged in
        authSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        const displayName = session.user.user_metadata?.full_name
            || session.user.user_metadata?.name
            || session.user.user_metadata?.display_name
            || session.user.email;
        userEmailDisplay.textContent = displayName;
        const sidebarEmail = document.getElementById('user-email-sidebar');
        if (sidebarEmail) sidebarEmail.textContent = displayName;
        
        // Set user avatar
        const userAvatar = document.getElementById('user-avatar');
        const userAvatarPlaceholder = document.querySelector('.user-avatar-placeholder');
        const userAvatarInitials = document.getElementById('user-avatar-initials');
        
        if (userAvatar && userAvatarPlaceholder && userAvatarInitials) {
            const avatarUrl = session.user.user_metadata?.avatar_url || session.user.user_metadata?.avatar;
            
            if (avatarUrl) {
                userAvatar.src = avatarUrl;
                userAvatar.style.display = 'block';
                userAvatarPlaceholder.style.display = 'none';
            } else {
                // Generate initials from name
                const initials = displayName
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);
                userAvatarInitials.textContent = initials;
                userAvatar.style.display = 'none';
                userAvatarPlaceholder.style.display = 'flex';
            }
        }
        
        // Dispatch event for analytics tracking
        window.dispatchEvent(new Event('userLoggedIn'));

        // Show AI Assistant
        const aiWidget = document.getElementById('ai-widget-container');
        if (aiWidget) aiWidget.style.display = 'flex';
        
        // Initialize notifications
        if (typeof window.initNotifications === 'function') {
            window.initNotifications();
        }
        if (typeof window.loadDashboardData === 'function') {
            window.loadDashboardData();
        } else {
            document.addEventListener('appReady', () => {
                window.loadDashboardData();
            }, { once: true });
        }
    } else {
        // User is logged out
        authSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
        
        // Hide AI Assistant
        const aiWidget = document.getElementById('ai-widget-container');
        if (aiWidget) aiWidget.style.display = 'none';
    }
});

// PWA Install Button Handler (for login page)
const pwaInstallBtn = document.getElementById('pwa-install-btn');
if (pwaInstallBtn) {
    // Show button only on auth section (login page) and when prompt is available
    function updatePWAButtonVisibility() {
        const isAuthVisible = !authSection.classList.contains('hidden');
        const hasDeferredPrompt = deferredInstallPrompt !== null;
        const isAlreadyInstalled = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
        
        if (isAuthVisible && hasDeferredPrompt && !isAlreadyInstalled) {
            pwaInstallBtn.style.display = 'flex';
            console.log('📱 PWA install button is now visible');
        } else {
            pwaInstallBtn.style.display = 'none';
        }
    }
    
    // Initial check
    updatePWAButtonVisibility();
    
    // Listen for auth state changes
    supabase.auth.onAuthStateChange(() => {
        updatePWAButtonVisibility();
    });
    
    // Also update when beforeinstallprompt fires
    window.addEventListener('beforeinstallprompt', () => {
        setTimeout(updatePWAButtonVisibility, 100);
    });
    
    // Handle button click
    pwaInstallBtn.addEventListener('click', async () => {
        // Check if app is already installed
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
            Swal.fire({
                title: '✅ Aplikasi Sudah Terinstall',
                text: 'Aplikasi SisKePri sudah terinstall di perangkat Anda.',
                icon: 'info',
                timer: 3000,
                showConfirmButton: false,
                toast: true,
                position: 'top-end',
                confirmButtonColor: '#D4AF37'
            });
            return;
        }
        
        // Check if deferred prompt is available
        if (deferredInstallPrompt) {
            try {
                console.log('📱 Showing PWA install prompt...');
                await deferredInstallPrompt.prompt();
                const choice = await deferredInstallPrompt.userChoice;
                
                console.log('📱 User choice:', choice.outcome);
                
                if (choice && choice.outcome === 'accepted') {
                    Swal.fire({
                        title: '🎉 Berhasil!',
                        text: 'Aplikasi SisKePri berhasil ditambahkan ke perangkat Anda.',
                        icon: 'success',
                        timer: 3000,
                        showConfirmButton: false,
                        toast: true,
                        position: 'top-end',
                        confirmButtonColor: '#D4AF37'
                    });
                    deferredInstallPrompt = null;
                } else {
                    console.log('📱 User declined PWA installation');
                }
            } catch (error) {
                console.error('❌ Error showing install prompt:', error);
                // Fallback: show instructions
                showInstallPopup();
            }
        } else {
            console.log('📱 No deferred prompt available, showing instructions...');
            // No deferred prompt available, show instructions
            showInstallPopup();
        }
    });
}