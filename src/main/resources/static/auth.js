class AuthService {
    constructor() {
        this.apiBase = '/api/auth';
    }

    async login(username, password) {
        try {
            const response = await fetch(`${this.apiBase}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                throw new Error('Login failed');
            }

            return await response.json();
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Login failed: ' + error.message };
        }
    }

    async register(userData) {
        // ... your existing register code
    }

    async logout() {
        // ... your existing logout code
    }

    async getCurrentUser() {
        // ... your existing getCurrentUser code
    }
}

// Login form handler - FIXED VERSION
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            // Show loading state
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            submitBtn.disabled = true;

            try {
                const authService = new AuthService();
                const result = await authService.login(username, password);

                if (result.success) {
                    console.log('Login successful, redirecting to:', result.redirect);
                    // Add a small delay to ensure session is set
                    setTimeout(() => {
                        window.location.href = result.redirect;
                    }, 500);
                } else {
                    alert(result.message || 'Login failed');
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            } catch (error) {
                console.error('Login error:', error);
                alert('Login failed: ' + error.message);
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // Register form handler - FIXED VERSION
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const userData = {
                username: document.getElementById('username').value,
                password: document.getElementById('password').value,
                email: document.getElementById('email').value,
                firstName: document.getElementById('firstName').value,
                lastName: document.getElementById('lastName').value
            };

            // Show loading state
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';
            submitBtn.disabled = true;

            try {
                const authService = new AuthService();
                const result = await authService.register(userData);

                if (result.success) {
                    console.log('Registration successful, redirecting to:', result.redirect);
                    setTimeout(() => {
                        window.location.href = result.redirect;
                    }, 500);
                } else {
                    alert(result.message || 'Registration failed');
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            } catch (error) {
                console.error('Registration error:', error);
                alert('Registration failed: ' + error.message);
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // Check if user is already logged in
    checkAuthentication();
});

async function checkAuthentication() {
    try {
        const authService = new AuthService();
        const user = await authService.getCurrentUser();

        if (user && window.location.pathname.includes('login.html')) {
            // Redirect to appropriate dashboard
            const redirect = user.role === 'ADMIN' ? '/admin-dashboard.html' :
                user.role === 'INSTRUCTOR' ? '/instructor-dashboard.html' :
                    '/member-dashboard.html';
            console.log('User already logged in, redirecting to:', redirect);
            window.location.href = redirect;
        }
    } catch (error) {
        console.error('Auth check error:', error);
    }
}

async function logout() {
    try {
        const authService = new AuthService();
        await authService.logout();
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '/login.html';
    }
}