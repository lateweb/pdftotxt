// theme.js
(function() {
    'use strict';

    const toggle = document.getElementById('theme-toggle');
    const moon = document.getElementById('moon-icon');
    const sun = document.getElementById('sun-icon');

    function applyTheme(theme) {
        document.body.classList.toggle('dark', theme === 'dark');
        localStorage.setItem('theme-mode', theme);
        if (moon && sun) {
            moon.style.display = theme === 'dark' ? 'none' : 'inline';
            sun.style.display = theme === 'dark' ? 'inline' : 'none';
        }
    }

    // Apply saved theme immediately
    const saved = localStorage.getItem('theme-mode') || 'light';
    applyTheme(saved);

    if (toggle) {
        toggle.addEventListener('click', () => {
            const next = document.body.classList.contains('dark') ? 'light' : 'dark';
            applyTheme(next);
        });
    }
})();
