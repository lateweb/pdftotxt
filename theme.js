// theme.js
(function() {
    'use strict';

    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const themeLabel = document.getElementById('themeLabel');

    function applyTheme(theme) {
        document.body.classList.toggle('dark', theme === 'dark');
        localStorage.setItem('theme-mode', theme);
        themeIcon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        themeLabel.textContent = theme === 'dark' ? 'Light' : 'Dark';
    }

    // Apply saved theme immediately
    const savedTheme = localStorage.getItem('theme-mode') || 'light';
    applyTheme(savedTheme);

    // Toggle on button click
    themeToggle.addEventListener('click', () => {
        const next = document.body.classList.contains('dark') ? 'light' : 'dark';
        applyTheme(next);
    });
})();
