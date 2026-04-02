// landing.js - Manages Auth and Routing on the Home Page

document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in -> auto redirect
    if (localStorage.getItem('token')) {
        window.location.href = 'analyzer.html';
        return;
    }

    const API_BASE = 'https://ai-code-analyzer-backend.onrender.com/api/auth';

    // UI Tab Switching for User Portal
    const authTabs = document.querySelectorAll('.auth-tab');
    const authForms = document.querySelectorAll('#user-auth-card .auth-form');

    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active from all tabs & forms
            authTabs.forEach(t => t.classList.remove('active'));
            authForms.forEach(f => f.classList.add('hidden'));
            
            // Add active to clicked tab
            tab.classList.add('active');
            
            // Show corresponding form
            const targetId = tab.getAttribute('data-target');
            const targetForm = document.getElementById(targetId);
            if(targetForm) {
                targetForm.classList.remove('hidden');
                targetForm.classList.add('active');
            }
        });
    });

    // 1. User Login Handler
    const ulForm = document.getElementById('user-login-form');
    const ulError = document.getElementById('ul-error');

    if (ulForm) {
        ulForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('ul-username').value;
            const password = document.getElementById('ul-password').value;
            
            await performLogin(username, password, ulError);
        });
    }

    // 2. User Registration Handler
    const urForm = document.getElementById('user-register-form');
    const urError = document.getElementById('ur-error');

    if (urForm) {
        urForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('ur-username').value;
            const email = document.getElementById('ur-email').value;
            const password = document.getElementById('ur-password').value;

            try {
                const response = await fetch(`${API_BASE}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });

                if (response.ok) {
                    // Registration success! Automatically log them in.
                    await performLogin(username, password, urError);
                } else {
                    const errMsg = await response.text();
                    showError(urError, errMsg || 'Registration failed.');
                }
            } catch (err) {
                showError(urError, 'Cannot connect to backend server. Is it running?');
            }
        });
    }

    // 3. Admin Login Handler
    const alForm = document.getElementById('admin-login-form');
    const alError = document.getElementById('al-error');

    if (alForm) {
        alForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('al-username').value;
            const password = document.getElementById('al-password').value;
            
            // Reusing performLogin because endpoint is the same. Security is enforced
            // via roles inside the app after login.
            await performLogin(username, password, alError, true);
        });
    }

    // Core Login Logic
    async function performLogin(username, password, errorElement, isAdminIntent = false) {
        try {
            const response = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                const data = await response.json();
                
                // If they tried to login via Admin Portal but lack ADMIN role
                if (isAdminIntent && data.role !== 'ADMIN') {
                    showError(errorElement, 'Access Denied: You do not have administrator privileges.');
                    return;
                }

                // Save Auth details
                localStorage.setItem('token', data.token);
                localStorage.setItem('username', data.username);
                localStorage.setItem('role', data.role);
                
                // Redirect to main app
                window.location.href = 'analyzer.html';
                
            } else {
                showError(errorElement, 'Invalid Credentials.');
            }
        } catch (err) {
            showError(errorElement, 'Server connection error. Ensure Spring Boot is running.');
        }
    }

    function showError(element, message) {
        element.textContent = message;
        element.classList.remove('hidden');
    }
});
