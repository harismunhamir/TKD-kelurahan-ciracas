// ====== KONFIGURASI SUPAABASE ======
const SUPABASE_URL = "https://bizryujdcymmjjzhurhi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpenJ5dWpkY3ltbWpqemh1cmhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyOTUzMzAsImV4cCI6MjA3NDg3MTMzMH0.XuKnQ3MStAj6yp2rkxEmISnaJEUUYicBOBucU-rgLqc";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ====== PASSWORD HASHING (Simple - will improve) ======
const passwordManager = {
    // Temporary simple password generator
    // In production, use proper bcrypt!
    generateHash(password) {
        // Simple hash for demo - REPLACE with proper bcrypt later
        return `hash_${btoa(password)}`;
    },
    
    // Temporary password check
    checkPassword(inputPassword, storedHash) {
        // Simple check for demo
        const inputHash = `hash_${btoa(inputPassword)}`;
        return storedHash === inputHash;
    }
};

// ====== USER MANAGEMENT FUNCTIONS ======
const userManager = {
    // Load all users
    async loadUsers() {
        try {
            const { data: users, error } = await client
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return users || [];
        } catch (error) {
            console.error('Error loading users:', error);
            throw error;
        }
    },

    // Add new user
    async addUser(userData) {
        try {
            const { data, error } = await client
                .from('users')
                .insert([{
                    username: userData.username,
                    password_hash: passwordManager.generateHash(userData.password),
                    nama: userData.nama,
                    role: userData.role,
                    is_active: true
                }])
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error('Error adding user:', error);
            throw error;
        }
    },

    // Reset password
    async resetPassword(userId, newPassword) {
        try {
            const { error } = await client
                .from('users')
                .update({
                    password_hash: passwordManager.generateHash(newPassword)
                })
                .eq('id', userId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error resetting password:', error);
            throw error;
        }
    },

    // Toggle user active status
    async toggleUserStatus(userId, currentStatus) {
        try {
            const { error } = await client
                .from('users')
                .update({
                    is_active: !currentStatus
                })
                .eq('id', userId);

            if (error) throw error;
            return !currentStatus;
        } catch (error) {
            console.error('Error toggling user status:', error);
            throw error;
        }
    },

    // DELETE user - PASTIKAN SEPERTI INI
    async deleteUser(userId) {
        const { error } = await client
            .from('users')
            .delete()
            .eq('id', userId);

        if (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
        return true;
    }
};

// ====== UI MANAGEMENT ======
document.addEventListener('DOMContentLoaded', function() {
    initializeUserManagement();
});

async function initializeUserManagement() {
    try {
        // Load users
        await loadAndDisplayUsers();
        
        // Initialize form handlers
        initializeForms();
        
        // Initialize modal
        initializeModal();
        
        // Initialize logout
        document.getElementById('logoutBtn').addEventListener('click', function() {
            localStorage.removeItem('taekwondo_session');
            window.location.href = 'login.html';
        });

    } catch (error) {
        showMessage('Error memuat user management', 'error');
    }
}

async function loadAndDisplayUsers() {
    try {
        const users = await userManager.loadUsers();
        const tbody = document.getElementById('usersTableBody');
        
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Tidak ada data users</td></tr>';
            return;
        }
        
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.username}</td>
                <td>${user.nama}</td>
                <td>
                    <span class="role-badge ${user.role === 'admin' ? 'role-admin' : 'role-pengajar'}">
                        ${user.role}
                    </span>
                </td>
                <td class="${user.is_active ? 'status-active' : 'status-inactive'}">
                    ${user.is_active ? 'Aktif' : 'Nonaktif'}
                </td>
                <td>${user.last_login ? new Date(user.last_login).toLocaleString('id-ID') : 'Belum login'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn primary btn-sm" onclick="openResetPasswordModal(${user.id}, '${user.username}')">
                            Reset Password
                        </button>
                        <button class="action-btn ${user.is_active ? 'delete-btn' : 'primary'} btn-sm" 
                                onclick="toggleUserStatus(${user.id}, ${user.is_active})">
                            ${user.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                        <!-- TAMBAH TOMBOL DELETE -->
                        <button class="action-btn danger btn-sm" 
                                onclick="deleteUser(${user.id}, '${user.username}')">
                            Hapus
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        document.getElementById('usersTableBody').innerHTML = 
            '<tr><td colspan="7" style="text-align: center; padding: 20px;">Error memuat data users</td></tr>';
    }
}

function initializeForms() {
    // Add user form
    document.getElementById('addUserForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('newUsername').value.trim();
        const nama = document.getElementById('newNama').value.trim();
        const password = document.getElementById('newPassword').value;
        const role = document.getElementById('newRole').value;
        
        if (!username || !nama || !password) {
            showMessage('Semua field harus diisi', 'error');
            return;
        }
        
        if (password.length < 4) {
            showMessage('Password minimal 4 karakter', 'error');
            return;
        }
        
        try {
            await userManager.addUser({ username, nama, password, role });
            showMessage('User berhasil ditambahkan', 'success');
            this.reset();
            await loadAndDisplayUsers();
        } catch (error) {
            if (error.message.includes('duplicate key')) {
                showMessage('Username sudah digunakan', 'error');
            } else {
                showMessage('Error menambahkan user', 'error');
            }
        }
    });
}

function initializeModal() {
    const modal = document.getElementById('resetPasswordModal');
    const closeBtn = document.querySelector('#resetPasswordModal .close');
    const cancelBtn = document.getElementById('cancelReset');
    const form = document.getElementById('resetPasswordForm');
    
    [closeBtn, cancelBtn].forEach(btn => {
        btn.addEventListener('click', () => modal.classList.add('hidden'));
    });
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const userId = document.getElementById('resetUserId').value;
        const newPassword = document.getElementById('newPasswordReset').value;
        
        if (newPassword.length < 4) {
            showMessage('Password minimal 4 karakter', 'error');
            return;
        }
        
        try {
            await userManager.resetPassword(userId, newPassword);
            showMessage('Password berhasil direset', 'success');
            modal.classList.add('hidden');
            form.reset();
        } catch (error) {
            showMessage('Error reset password', 'error');
        }
    });
}

// ====== GLOBAL FUNCTIONS ======
window.openResetPasswordModal = function(userId, username) {
    document.getElementById('resetUserId').value = userId;
    document.querySelector('#resetPasswordModal h3').textContent = `Reset Password - ${username}`;
    document.getElementById('resetPasswordModal').classList.remove('hidden');
};

window.toggleUserStatus = async function(userId, currentStatus) {
    if (!confirm(`Yakin ingin ${currentStatus ? 'menonaktifkan' : 'mengaktifkan'} user ini?`)) {
        return;
    }
    
    try {
        await userManager.toggleUserStatus(userId, currentStatus);
        showMessage(`User berhasil ${currentStatus ? 'dinonaktifkan' : 'diaktifkan'}`, 'success');
        await loadAndDisplayUsers();
    } catch (error) {
        showMessage('Error mengubah status user', 'error');
    }
};

// TAMBAH FUNGSI DELETE
window.deleteUser = async function(userId, username) {
    if (!confirm(`Yakin ingin menghapus user "${username}"? Tindakan ini tidak dapat dibatalkan!`)) {
        return;
    }
    
    try {
        await userManager.deleteUser(userId);
        showMessage(`User "${username}" berhasil dihapus`, 'success');
        await loadAndDisplayUsers();
    } catch (error) {
        console.error('Delete error:', error);
        showMessage('Error menghapus user', 'error');
    }
};

function showMessage(message, type = 'info') {
    const existing = document.querySelector('.message');
    if (existing) existing.remove();
    
    const msg = document.createElement('div');
    msg.className = `message ${type}-message`;
    msg.textContent = message;
    msg.style.cssText = 'padding: 10px; margin: 10px; border-radius: 5px; font-weight: bold;';
    
    if (type === 'info') msg.style.background = '#d1ecf1';
    if (type === 'success') msg.style.background = '#d4edda';
    if (type === 'error') msg.style.background = '#f8d7da';
    
    document.querySelector('.content').prepend(msg);
    
    if (type !== 'error') {
        setTimeout(() => msg.remove(), 3000);
    }
}