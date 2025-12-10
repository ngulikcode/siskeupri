// tour.js - Tour System untuk Personal Finance Dashboard (Mobile Bottom Nav Support)

class AppTour {
    constructor() {
        this.currentStep = 0;
        this.isActive = false;
        this.steps = [
            {
                target: '.stats-grid',
                title: 'Ringkasan Keuangan 💰',
                content: 'Di sini Anda dapat melihat total income, expense, dan balance Anda secara real-time.',
                position: 'bottom'
            },
            {
                target: '.account-overview-card',
                title: 'Kelola Akun 🏦',
                content: 'Kelola berbagai akun keuangan Anda seperti Bank, E-Wallet, dan Cash. Klik "Manage Accounts" untuk menambah akun baru.',
                position: 'bottom'
            },
            {
                target: '.budget-overview-card',
                title: 'Budget Planning 📊',
                content: 'Set budget bulanan untuk setiap kategori pengeluaran. Sistem akan memberi warning jika Anda mendekati atau melebihi budget.',
                position: 'bottom'
            },
            {
                target: '.chart-card',
                title: 'Visualisasi Data 📈',
                content: 'Lihat grafik analisis keuangan Anda. Anda bisa switch antara Bar Chart, Pie Chart untuk breakdown, dan Monthly Trend.',
                position: 'bottom'
            },
            {
                target: '.transaction-form-card',
                title: 'Tambah Transaksi ✏️',
                content: 'Gunakan form ini untuk mencatat setiap transaksi income atau expense Anda. Pilih kategori, akun, dan tanggal dengan mudah.',
                position: 'bottom',
                mobilePosition: 'bottom'
            },
            {
                target: '.recent-transactions-card',
                title: 'Riwayat Transaksi 📝',
                content: 'Lihat semua transaksi Anda di sini. Gunakan filter, search, dan download report dalam format CSV atau PDF.',
                position: 'bottom',
                mobilePosition: 'bottom'
            },
            {
                target: '#manage-recurring-btn',
                title: 'Recurring Transactions 🔄',
                content: 'Set transaksi berulang seperti gaji bulanan atau tagihan rutin. Sistem akan otomatis mencatat transaksi sesuai jadwal.',
                position: 'top'
            },
            {
                target: '.sidebar nav',
                targetMobile: '.bottom-nav', // Different target for mobile
                title: 'Menu Navigasi 🧭',
                content: 'Akses semua fitur melalui menu navigasi: Accounts, Categories, Budgets, Recurring, dan Guide.',
                contentMobile: 'Gunakan bottom navigation untuk mengakses semua fitur: Dashboard, Accounts, Categories, Budgets, Recurring, dan Guide.',
                position: 'right',
                mobilePosition: 'top'
            }
        ];

        this.overlay = null;
        this.highlightBox = null;
        this.tooltip = null;
        this.isMobile = false;
    }

    init() {
        // Check if mobile
        this.checkMobile();
        window.addEventListener('resize', () => this.checkMobile());

        // Check if tour has been completed before
        const tourCompleted = localStorage.getItem('finance-tour-completed');
        if (!tourCompleted) {
            // Show tour after a short delay on first login
            setTimeout(() => {
                this.showWelcomePrompt();
            }, 1000);
        }

        // Add "Start Tour" button to dashboard
        this.addTourButton();
    }

    checkMobile() {
        this.isMobile = window.innerWidth <= 768;
    }

    showWelcomePrompt() {
        // Check if previously dismissed
        if (localStorage.getItem('finance-tour-dismissed')) {
            return;
        }

        Swal.fire({
            title: 'Selamat Datang! 👋',
            text: 'Apakah Anda ingin mengikuti tour untuk mengenal fitur-fitur aplikasi?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Ya, Mulai Tour',
            cancelButtonText: 'Tidak, Nanti Saja',
            confirmButtonColor: '#D4AF37',
            cancelButtonColor: '#6c757d'
        }).then((result) => {
            if (result.isConfirmed) {
                this.start();
            } else {
                // Save dismissal state permanently
                localStorage.setItem('finance-tour-dismissed', 'true');
            }
        });
    }

    addTourButton() {
        // Add tour button to top bar
        const topBar = document.querySelector('.top-bar-left');
        if (topBar && !document.getElementById('start-tour-btn')) {
            const tourBtn = document.createElement('button');
            tourBtn.id = 'start-tour-btn';
            tourBtn.className = 'btn-secondary';
            tourBtn.innerHTML = '🎯 Tour';
            tourBtn.style.marginLeft = '1rem';
            tourBtn.onclick = () => this.start();
            topBar.appendChild(tourBtn);
        }
    }

    start() {
        this.isActive = true;
        this.currentStep = 0;
        this.createOverlay();
        this.showStep(0);
        
        // Add class to body to prevent scroll
        document.body.classList.add('tour-active');
    }

    createOverlay() {
        // Create dark overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'tour-overlay-element';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.75);
            z-index: 9998;
            backdrop-filter: blur(2px);
        `;
        this.overlay.onclick = () => this.end();
        document.body.appendChild(this.overlay);

        // Create highlight box
        this.highlightBox = document.createElement('div');
        this.highlightBox.className = 'tour-highlight-element';
        this.highlightBox.style.cssText = `
            position: absolute;
            border: 4px solid #D4AF37;
            border-radius: 8px;
            pointer-events: none;
            z-index: 9999;
            box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.75);
            transition: all 0.3s ease;
        `;
        document.body.appendChild(this.highlightBox);

        // Create tooltip
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'tour-tooltip-element';
        this.tooltip.style.cssText = `
            position: fixed;
            background: #121212;
            border: 1px solid #27272a;
            border-radius: 12px;
            padding: 1.5rem;
            max-width: ${this.isMobile ? 'calc(100vw - 2rem)' : '400px'};
            width: ${this.isMobile ? 'calc(100vw - 2rem)' : 'auto'};
            z-index: 10000;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            transition: all 0.3s ease;
        `;
        document.body.appendChild(this.tooltip);
    }

    showStep(index) {
        if (index < 0 || index >= this.steps.length) return;

        const step = this.steps[index];
        
        // Select target based on device
        const targetSelector = this.isMobile && step.targetMobile ? step.targetMobile : step.target;
        const targetEl = document.querySelector(targetSelector);

        if (!targetEl) {
            console.warn(`Target element not found: ${targetSelector}`);
            // Skip to next step if element not found
            if (index < this.steps.length - 1) {
                this.currentStep = index + 1;
                this.showStep(this.currentStep);
            } else {
                this.end();
            }
            return;
        }

        // Get content based on device
        const content = this.isMobile && step.contentMobile ? step.contentMobile : step.content;

        // Scroll element into view with better offset
        const offset = this.isMobile ? 100 : 150;
        const elementPosition = targetEl.getBoundingClientRect().top + window.scrollY;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });

        setTimeout(() => {
            const rect = targetEl.getBoundingClientRect();

            // Update highlight box position (fixed positioning for mobile)
            this.highlightBox.style.position = 'fixed';
            this.highlightBox.style.top = `${rect.top - 4}px`;
            this.highlightBox.style.left = `${rect.left - 4}px`;
            this.highlightBox.style.width = `${rect.width + 8}px`;
            this.highlightBox.style.height = `${rect.height + 8}px`;

            // Calculate tooltip position
            const position = this.isMobile && step.mobilePosition ? step.mobilePosition : step.position;
            const tooltipPos = this.calculateTooltipPosition(rect, position);
            const isBottomNavTarget = this.isMobile && (targetSelector === '.bottom-nav' || targetEl.id === 'bottom-nav' || targetEl.classList.contains('bottom-nav'));
            const prevBottomNav = document.querySelector('.bottom-nav.tour-highlighted');
            if (prevBottomNav && prevBottomNav !== targetEl) prevBottomNav.classList.remove('tour-highlighted');
            this.tooltip.classList.remove('above-bottom-nav');
            if (isBottomNavTarget) {
                targetEl.classList.add('tour-highlighted');
                this.tooltip.classList.add('above-bottom-nav');
            }
            
            Object.assign(this.tooltip.style, tooltipPos);

            // Update tooltip content with responsive buttons
            this.tooltip.innerHTML = this.getTooltipHTML(step, index, content);

            this.adjustTooltipPosition(rect, position);
        }, 400);
    }

    calculateTooltipPosition(rect, position) {
        const padding = this.isMobile ? 10 : 20;
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        let style = {};

        if (this.isMobile) {
            // Mobile: position based on target location
            if (position === 'top') {
                // Show above bottom nav - calculate space above it
                const bottomNavHeight = 70; // Height of bottom nav
                const tooltipHeight = 280; // Estimated tooltip height
                const availableSpace = viewportHeight - rect.bottom - bottomNavHeight;
                
                // If bottom nav is the target, show tooltip in the middle of screen
                const isBottomNav = rect.bottom > (viewportHeight - bottomNavHeight - 20);
                
                if (isBottomNav) {
                    // Position in center-bottom area, above the bottom nav
                    style = {
                        position: 'fixed',
                        bottom: `${bottomNavHeight + 10}px`,
                        left: '1rem',
                        right: '1rem',
                        top: 'auto',
                        transform: 'none',
                        maxWidth: 'calc(100vw - 2rem)',
                        width: 'calc(100vw - 2rem)',
                        maxHeight: `calc(100vh - ${bottomNavHeight + 120}px)`,
                        overflowY: 'auto'
                    };
                } else {
                    // Regular top positioning
                    style = {
                        position: 'fixed',
                        bottom: `${viewportHeight - rect.top + padding}px`,
                        left: '1rem',
                        right: '1rem',
                        top: 'auto',
                        transform: 'none',
                        maxWidth: 'calc(100vw - 2rem)',
                        width: 'calc(100vw - 2rem)'
                    };
                }
            } else {
                // Default: show at bottom for other elements
                style = {
                    position: 'fixed',
                    bottom: '1rem',
                    left: '1rem',
                    right: '1rem',
                    top: 'auto',
                    transform: 'none',
                    maxWidth: 'calc(100vw - 2rem)',
                    width: 'calc(100vw - 2rem)'
                };
            }
        } else {
            // Desktop positioning
            switch(position) {
                case 'bottom':
                    const bottomPos = rect.bottom + padding;
                    if (bottomPos + 300 > viewportHeight) {
                        // Not enough space below, show above
                        style = {
                            position: 'fixed',
                            bottom: `${viewportHeight - rect.top + padding}px`,
                            left: `${Math.max(20, rect.left)}px`,
                            top: 'auto'
                        };
                    } else {
                        style = {
                            position: 'fixed',
                            top: `${bottomPos}px`,
                            left: `${Math.max(20, rect.left)}px`
                        };
                    }
                    break;

                case 'top':
                    style = {
                        position: 'fixed',
                        bottom: `${viewportHeight - rect.top + padding}px`,
                        left: `${Math.max(20, rect.left)}px`,
                        top: 'auto'
                    };
                    break;

                case 'right':
                    const rightPos = rect.right + padding;
                    if (rightPos + 400 > viewportWidth) {
                        // Not enough space on right, show on left or bottom
                        style = {
                            position: 'fixed',
                            top: `${rect.bottom + padding}px`,
                            left: '50%',
                            transform: 'translateX(-50%)'
                        };
                    } else {
                        style = {
                            position: 'fixed',
                            top: `${rect.top}px`,
                            left: `${rightPos}px`
                        };
                    }
                    break;

                case 'left':
                    const leftPos = rect.left - 400 - padding;
                    if (leftPos < 0) {
                        // Not enough space on left, show bottom
                        style = {
                            position: 'fixed',
                            top: `${rect.bottom + padding}px`,
                            left: '50%',
                            transform: 'translateX(-50%)'
                        };
                    } else {
                        style = {
                            position: 'fixed',
                            top: `${rect.top}px`,
                            left: `${leftPos}px`
                        };
                    }
                    break;

                default:
                    style = {
                        position: 'fixed',
                        top: `${rect.bottom + padding}px`,
                        left: `${rect.left}px`
                    };
            }
        }

        return style;
    }

    adjustTooltipPosition(rect, position) {
        if (this.isMobile || !this.tooltip) return;
        const padding = 20;
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const tt = this.tooltip.getBoundingClientRect();
        let top = tt.top;
        let left = tt.left;

        switch(position) {
            case 'bottom':
                top = rect.bottom + padding;
                if (top + tt.height > viewportHeight - 20) top = Math.max(20, rect.top - tt.height - padding);
                left = rect.left;
                break;
            case 'top':
                top = rect.top - tt.height - padding;
                if (top < 20) top = Math.min(viewportHeight - tt.height - 20, rect.bottom + padding);
                left = rect.left;
                break;
            case 'right':
                left = rect.right + padding;
                if (left + tt.width > viewportWidth - 20) left = rect.left - tt.width - padding;
                top = rect.top;
                break;
            case 'left':
                left = rect.left - tt.width - padding;
                if (left < 20) left = rect.right + padding;
                top = rect.top;
                break;
            default:
                top = rect.bottom + padding;
                left = rect.left;
        }

        if (left + tt.width > viewportWidth - 20) left = viewportWidth - tt.width - 20;
        if (left < 20) left = 20;
        if (top + tt.height > viewportHeight - 20) top = viewportHeight - tt.height - 20;
        if (top < 20) top = 20;

        Object.assign(this.tooltip.style, {
            position: 'fixed',
            top: `${top}px`,
            left: `${left}px`,
            right: 'auto',
            bottom: 'auto',
            transform: 'none'
        });
    }

    getTooltipHTML(step, index, content) {
        const buttonSize = this.isMobile ? 'small' : 'normal';
        const fontSize = this.isMobile ? '0.875rem' : '0.9rem';
        const titleSize = this.isMobile ? '1.1rem' : '1.25rem';

        return `
            <div style="margin-bottom: 1rem;">
                <button onclick="appTour.end()" style="
                    position: absolute;
                    top: ${this.isMobile ? '0.75rem' : '1rem'};
                    right: ${this.isMobile ? '0.75rem' : '1rem'};
                    background: none;
                    border: none;
                    color: #9ca3af;
                    cursor: pointer;
                    font-size: ${this.isMobile ? '1.5rem' : '1.25rem'};
                    padding: 0;
                    line-height: 1;
                    z-index: 10001;
                ">✕</button>
                <h3 style="
                    color: #ffffff;
                    font-size: ${titleSize};
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                    padding-right: 2rem;
                ">${step.title}</h3>
                <p style="
                    color: #9ca3af;
                    font-size: ${fontSize};
                    line-height: 1.6;
                ">${content}</p>
            </div>
            
            <div style="margin-bottom: 1rem;">
                <div style="display: flex; gap: 0.5rem;">
                    ${this.steps.map((_, i) => `
                        <div style="
                            height: 4px;
                            flex: 1;
                            border-radius: 2px;
                            background: ${i === index ? '#D4AF37' : '#27272a'};
                        "></div>
                    `).join('')}
                </div>
                <p style="
                    color: #9ca3af;
                    font-size: ${this.isMobile ? '0.75rem' : '0.875rem'};
                    margin-top: 0.5rem;
                    text-align: center;
                ">Langkah ${index + 1} dari ${this.steps.length}</p>
            </div>
            
            <div style="
                display: flex; 
                justify-content: space-between; 
                align-items: center;
                gap: 0.5rem;
                flex-wrap: ${this.isMobile ? 'wrap' : 'nowrap'};
            ">
                <button onclick="appTour.prevStep()" ${index === 0 ? 'disabled' : ''} style="
                    padding: ${this.isMobile ? '0.625rem 1rem' : '0.5rem 1rem'};
                    background: transparent;
                    border: 1px solid #27272a;
                    color: ${index === 0 ? '#6c757d' : '#ffffff'};
                    border-radius: 0.5rem;
                    cursor: ${index === 0 ? 'not-allowed' : 'pointer'};
                    font-size: ${this.isMobile ? '0.75rem' : '0.875rem'};
                    flex: ${this.isMobile ? '1' : '0 0 auto'};
                    min-width: ${this.isMobile ? 'auto' : '100px'};
                ">← ${this.isMobile ? 'Back' : 'Sebelumnya'}</button>
                
                <button onclick="appTour.end()" style="
                    padding: ${this.isMobile ? '0.625rem 1rem' : '0.5rem 1rem'};
                    background: transparent;
                    border: none;
                    color: #9ca3af;
                    cursor: pointer;
                    font-size: ${this.isMobile ? '0.75rem' : '0.875rem'};
                    flex: ${this.isMobile ? '1' : '0 0 auto'};
                ">${this.isMobile ? 'Skip' : 'Lewati'}</button>
                
                <button onclick="appTour.nextStep()" style="
                    padding: ${this.isMobile ? '0.625rem 1.25rem' : '0.5rem 1.5rem'};
                    background: #D4AF37;
                    border: none;
                    color: #000000;
                    border-radius: 0.5rem;
                    cursor: pointer;
                    font-size: ${this.isMobile ? '0.75rem' : '0.875rem'};
                    font-weight: 600;
                    flex: ${this.isMobile ? '1' : '0 0 auto'};
                    min-width: ${this.isMobile ? 'auto' : '100px'};
                ">${index === this.steps.length - 1 ? '✓' : (this.isMobile ? 'Next →' : 'Selanjutnya →')}</button>
            </div>
        `;
    }

    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.showStep(this.currentStep);
        } else {
            this.end();
        }
    }

    prevStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.showStep(this.currentStep);
        }
    }

    end() {
        this.isActive = false;
        
        // Remove class from body
        document.body.classList.remove('tour-active');
        
        // Remove elements
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        if (this.highlightBox) {
            this.highlightBox.remove();
            this.highlightBox = null;
        }
        if (this.tooltip) {
            this.tooltip.remove();
            this.tooltip = null;
        }

        const bn = document.querySelector('.bottom-nav.tour-highlighted');
        if (bn) bn.classList.remove('tour-highlighted');

        // Mark tour as completed
        localStorage.setItem('finance-tour-completed', 'true');

        // Show completion message
        Swal.fire({
            title: 'Tour Selesai! 🎉',
            text: 'Anda sudah mengenal semua fitur. Selamat mengelola keuangan!',
            icon: 'success',
            confirmButtonText: 'Mulai Menggunakan',
            confirmButtonColor: '#D4AF37'
        });
    }

    reset() {
        // Reset tour completion status
        localStorage.removeItem('finance-tour-completed');
        Swal.fire({
            title: 'Tour direset',
            text: 'Anda bisa memulai tour lagi.',
            icon: 'info',
            confirmButtonColor: '#D4AF37'
        });
    }
}

// Create global instance
const appTour = new AppTour();

// Initialize tour when DOM is ready and user is logged in
document.addEventListener('DOMContentLoaded', () => {
    // Wait for dashboard to be visible
    const checkDashboard = setInterval(() => {
        const dashboard = document.getElementById('dashboard-section');
        if (dashboard && !dashboard.classList.contains('hidden')) {
            clearInterval(checkDashboard);
            setTimeout(() => {
                appTour.init();
            }, 500);
        }
    }, 500);
});
