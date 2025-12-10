/**
 * Theme Toggle Logic
 * Handles switching between Light and Dark modes
 */

const themeToggleBtn = document.getElementById('theme-toggle-btn');
const themeIcon = themeToggleBtn?.querySelector('i');
const htmlElement = document.documentElement;

// Function to set theme
function setTheme(theme) {
    if (theme === 'light') {
        htmlElement.setAttribute('data-theme', 'light');
        if (themeIcon) {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon'); // Show moon icon to switch back to dark
        }
        localStorage.setItem('theme', 'light');
    } else {
        htmlElement.removeAttribute('data-theme'); // Default is dark
        if (themeIcon) {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun'); // Show sun icon to switch to light
        }
        localStorage.setItem('theme', 'dark');
    }
}

// Check saved theme or system preference
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    setTheme(savedTheme);
} 

// Event Listener
if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    });
}
