// ====== KONFIGURASI SUPAABASE ======
const SUPABASE_URL = "https://bizryujdcymmjjzhurhi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpenJ5dWpkY3ltbWpqemh1cmhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyOTUzMzAsImV4cCI6MjA3NDg3MTMzMH0.XuKnQ3MStAj6yp2rkxEmISnaJEUUYicBOBucU-rgLqc";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ====== AUTH FUNCTIONS ======
// ====== AUTH FUNCTIONS ======
const auth = {
    // Login function
    async login(username, password) {
        try {
            // Get user from database - PERBAIKI QUERY INI
            const { data: user, error } = await client
                .from('users')
                .select('*')
                .eq('username', username)
                .eq('is_active', true);

            if (error) {
                console.error('Database error:', error);
                throw new Error('Terjadi kesalahan sistem');
            }

            // Check if user exists
            if (!user || user.length === 0) {
                throw new Error('Username tidak ditemukan atau akun tidak aktif');
            }

            const userData = user[0];

            // Simple password check
            const passwordValid = await this.checkPassword(password, userData.password_hash);
            
            if (!passwordValid) {
                throw new Error('Password salah');
            }

            // Update last login
            await client
                .from('users')
                .update({ last_login: new Date().toISOString() })
                .eq('id', userData.id);

            // Store user session
            this.setSession(userData);

            return userData;

        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    // ... (sisanya tetap sama)

    // Simple password check (TEMPORARY - will improve)
    async checkPassword(inputPassword, storedHash) {
        // For now, using simple comparison
        // In Phase 2, we'll implement proper bcrypt
         // Use the same hashing method as user-management.js
    const inputHash = `hash_${btoa(inputPassword)}`;
    return storedHash === inputHash;
},

    // Set user session
    setSession(userData) {
        const sessionData = {
            user: {
                id: userData.id,
                username: userData.username,
                nama: userData.nama,
                role: userData.role
            },
            loginTime: Date.now()
        };
        
        localStorage.setItem('taekwondo_session', JSON.stringify(sessionData));
    },

    // Check if user is authenticated
    checkAuth() {
        const session = localStorage.getItem('taekwondo_session');
        if (!session) return null;

        const sessionData = JSON.parse(session);
        const twoHours = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

        // Check if session expired
        if (Date.now() - sessionData.loginTime > twoHours) {
            this.logout();
            return null;
        }

        return sessionData.user;
    },

    // Logout
    logout() {
        localStorage.removeItem('taekwondo_session');
        window.location.href = 'login.html';
    },

    // Redirect based on role
    redirectBasedOnRole(user) {
        if (user.role === 'pengajar') {
            window.location.href = 'Absensi.html';
        } else {
            window.location.href = 'Data-Murid.html';
        }
    }
};

// ====== LOGIN FORM HANDLING ======
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const loginBtn = document.getElementById('loginBtn');

    // Check if already logged in
    const currentUser = auth.checkAuth();
    if (currentUser) {
        auth.redirectBasedOnRole(currentUser);
        return;
    }

    // Login form submission
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        // Basic validation
        if (!username || !password) {
            showError('Username dan password harus diisi');
            return;
        }

        try {
            // Show loading state
            loginBtn.disabled = true;
            loginBtn.textContent = 'Memproses...';
            loginForm.classList.add('loading');

            // Attempt login
            const user = await auth.login(username, password);
            
            // Success - redirect
            auth.redirectBasedOnRole(user);

        } catch (error) {
            showError(error.message);
        } finally {
            // Reset loading state
            loginBtn.disabled = false;
            loginBtn.textContent = 'Masuk';
            loginForm.classList.remove('loading');
        }
    });

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }

    // Clear error on input
    document.getElementById('username').addEventListener('input', () => {
        errorMessage.style.display = 'none';
    });

    document.getElementById('password').addEventListener('input', () => {
        errorMessage.style.display = 'none';
    });
});