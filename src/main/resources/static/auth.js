class AuthService {
    constructor() {
        this.apiBase = '/api/auth';
    }

    async login(username, password) {
        try {
            console.log('Attempting login for user:', username);

            const response = await fetch(`${this.apiBase}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
                credentials: 'include'  // ADDED: Include credentials/session
            });

            console.log('Login response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Login failed: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            console.log('Login result:', result);
            return result;
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: error.message };
        }
    }

    async register(userData) {
        try {
            console.log('Attempting registration for user:', userData.username);

            const response = await fetch(`${this.apiBase}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
                credentials: 'include'  // ADDED: Include credentials
            });

            console.log('Register response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Registration failed: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            console.log('Registration result:', result);
            return result;
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, message: error.message };
        }
    }

    async logout() {
        try {
            console.log('Calling logout API...');
            const response = await fetch(`${this.apiBase}/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include'  // ADDED: Include credentials
            });

            const result = await response.json();
            console.log('Logout API response:', result);
            return result;
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, message: error.message };
        }
    }

    async getCurrentUser() {
        try {
            const response = await fetch(`${this.apiBase}/current-user`, {
                credentials: 'include'  // Already added - KEEP THIS
            });

            console.log('Current user response status:', response.status); // ADDED: Log status

            if (response.status === 200) {
                const user = await response.json();
                console.log('Current user:', user);
                return user;
            }
            console.log('No current user found, status:', response.status);
            return null;
        } catch (error) {
            console.error('Get current user error:', error);
            return null;
        }
    }

    // ADDED: Debug method to test authentication
    async debugAuth() {
        try {
            const response = await fetch(`${this.apiBase}/debug-auth`, {
                credentials: 'include'
            });
            const result = await response.json();
            console.log('Debug auth result:', result);
            return result;
        } catch (error) {
            console.error('Debug auth error:', error);
            return { authenticated: false };
        }
    }
}

// Login form handler
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing auth...');

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        console.log('Login form found, attaching handler...');

        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('Login form submitted');

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            // Show loading state
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            submitBtn.disabled = true;

            // Hide any previous error messages
            const messageDiv = document.getElementById('loginMessage');
            if (messageDiv) {
                messageDiv.style.display = 'none';
            }

            try {
                const authService = new AuthService();
                const result = await authService.login(username, password);

                if (result.success) {
                    console.log('Login successful, redirecting to:', result.redirect);

                    // ADDED: Test authentication immediately after login
                    console.log('Testing authentication after login...');
                    const debugResult = await authService.debugAuth();
                    console.log('Post-login auth test:', debugResult);

                    // Add a small delay to ensure session is set
                    setTimeout(() => {
                        window.location.href = result.redirect;
                    }, 500);
                } else {
                    console.log('Login failed:', result.message);
                    // Show error message
                    if (messageDiv) {
                        messageDiv.textContent = result.message || 'Login failed';
                        messageDiv.style.display = 'block';
                    } else {
                        alert(result.message || 'Login failed');
                    }
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            } catch (error) {
                console.error('Login error:', error);
                if (messageDiv) {
                    messageDiv.textContent = 'Login failed: ' + error.message;
                    messageDiv.style.display = 'block';
                } else {
                    alert('Login failed: ' + error.message);
                }
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // Check if user is already logged in - BUT DON'T AUTO-REDIRECT
    checkAuthentication();
});

async function checkAuthentication() {
    try {
        console.log('Checking authentication...');
        const authService = new AuthService();
        const user = await authService.getCurrentUser();

        if (user && user.username) {
            console.log('User is already logged in as:', user.username);

            // Only redirect if we're on login page
            if (window.location.pathname === '/login' || window.location.pathname === '/') {
                console.log('Redirecting authenticated user from login page to dashboard...');
                const redirect = user.role === 'ADMIN' ? '/admin-dashboard' :
                    user.role === 'INSTRUCTOR' ? '/instructor-dashboard' :
                        '/member-dashboard';
                console.log('Redirecting to:', redirect);
                window.location.href = redirect;
            }
        } else {
            console.log('No user logged in');
        }
    } catch (error) {
        console.error('Auth check error:', error);
    }
}

async function logout() {
    try {
        console.log('Starting logout process...');
        const authService = new AuthService();

        // Call the logout API
        const result = await authService.logout();
        console.log('Logout API result:', result);

        // Clear all storage
        localStorage.clear();
        sessionStorage.clear();

        // Clear any cookies by setting them to expire
        document.cookie.split(";").forEach(function(c) {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });

        // Force redirect to login page with cache busting
        console.log('Redirecting to login page...');
        window.location.href = '/login?logout=true&t=' + new Date().getTime();

    } catch (error) {
        console.error('Logout error:', error);
        // Even if there's an error, force redirect to login
        window.location.href = '/login?logout=true&t=' + new Date().getTime();
    }
}

// ADDED: Global function to test auth from browser console
window.testAuth = async function() {
    const authService = new AuthService();
    const result = await authService.debugAuth();
    console.log('Auth test result:', result);
    return result;
};