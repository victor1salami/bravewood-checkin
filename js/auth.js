/* ============================================
   auth.js
   Authentication: login, logout, session,
   password creation, reset, and admin reset.
   Depends on: config.js, storage.js
   ============================================ */

const AuthMethods = {

    currentUser: null,
    tempResetStaff: null,

    checkSession() {
        const session = localStorage.getItem('bravewood_session');
        if (session) {
            this.currentUser = JSON.parse(session);
            this.showApp();
        }
    },

    login(staffId, password) {
        const users = JSON.parse(localStorage.getItem('bravewood_users') || '[]');

        if (users.length === 0) {
            return { success: false, error: 'No users found. Please reset system.' };
        }

        const user = users.find(u => u.staffId === staffId);

        if (!user) {
            return { success: false, error: `Staff ID "${staffId}" not found` };
        }

        if (user.password !== password) {
            return { success: false, error: 'Incorrect password' };
        }

        if (!user.passwordCreated) {
            return { success: false, error: 'PASSWORD_NOT_CREATED', staffId: user.staffId };
        }

        this.currentUser = { ...user };
        delete this.currentUser.password;
        delete this.currentUser.securityAnswer;
        localStorage.setItem('bravewood_session', JSON.stringify(this.currentUser));
        this.logAudit('LOGIN', `User ${staffId} logged in`);
        return { success: true };
    },

    logout() {
        if (this.currentUser) {
            this.logAudit('LOGOUT', `User ${this.currentUser.staffId} logged out`);
        }
        this.currentUser = null;
        localStorage.removeItem('bravewood_session');
        this.showLogin();
    },

    // View-switching helpers for auth flow
    showLogin() {
        document.getElementById('loginPage').style.display = 'flex';
        document.getElementById('appContainer').classList.remove('active');
        document.getElementById('checkinPage').classList.remove('active');
        document.getElementById('accessDeniedPage').classList.remove('active');
        document.getElementById('loginForm').reset();
        this.updateUrl('login');
    },

    showApp() {
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('appContainer').classList.add('active');
        document.getElementById('checkinPage').classList.remove('active');
        document.getElementById('accessDeniedPage').classList.remove('active');
        this.updateSidebar();
        this.navigate('dashboard');
    },

    showCheckin() {
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('appContainer').classList.remove('active');
        document.getElementById('checkinPage').classList.add('active');
        document.getElementById('accessDeniedPage').classList.remove('active');
        this.updateDateTime();
        this.updateUrl('checkin');
    },

    showAccessDenied() {
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('appContainer').classList.remove('active');
        document.getElementById('checkinPage').classList.remove('active');
        document.getElementById('accessDeniedPage').classList.add('active');
        this.updateUrl('access-denied');
    },

    // First-time password creation
    showFirstTimeSetup() {
        document.getElementById('firstTimeSetupForm').reset();
        const strength = document.getElementById('passwordStrength');
        if (strength) strength.className = 'password-strength';
        this.openModal('firstTimeSetupModal');
    },

    checkPasswordStrength(password) {
        const bar = document.getElementById('passwordStrength');
        if (!bar) return;
        if (!password) { bar.className = 'password-strength'; return; }
        if (password.length < 6) bar.className = 'password-strength weak';
        else if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password))
            bar.className = 'password-strength medium';
        else bar.className = 'password-strength strong';
    },

    createPassword(event) {
        event.preventDefault();
        const staffId = document.getElementById('setupStaffId').value.trim();
        const password = document.getElementById('setupPassword').value;
        const confirmPassword = document.getElementById('setupConfirmPassword').value;
        const securityQuestion = document.getElementById('setupSecurityQuestion').value;
        const securityAnswer = document.getElementById('setupSecurityAnswer').value.trim();

        if (password !== confirmPassword) { this.showToast('Passwords do not match', 'error'); return; }
        if (password.length < 6) { this.showToast('Password must be at least 6 characters', 'error'); return; }
        if (!securityQuestion) { this.showToast('Please select a security question', 'error'); return; }
        if (!securityAnswer) { this.showToast('Please provide an answer to your security question', 'error'); return; }

        const users = JSON.parse(localStorage.getItem('bravewood_users') || '[]');
        const userIndex = users.findIndex(u => u.staffId === staffId);

        if (userIndex === -1) { this.showToast('Staff ID not found. Contact admin.', 'error'); return; }

        users[userIndex].securityQuestion = securityQuestion;
        users[userIndex].securityAnswer = securityAnswer.toLowerCase();
        users[userIndex].password = password;
        users[userIndex].passwordCreated = true;
        localStorage.setItem('bravewood_users', JSON.stringify(users));
        this.logAudit('PASSWORD_CREATE', `Password created for staff: ${staffId}`);

        this.showToast('Password created! Please login.', 'success');
        this.closeModal('firstTimeSetupModal');
    },

    // Forgot password flow
    showForgotPassword() {
        document.getElementById('forgotStep1').classList.remove('hidden');
        document.getElementById('forgotStep2').classList.add('hidden');
        document.getElementById('forgotStaffId').value = '';
        this.openModal('forgotPasswordModal');
    },

    verifyStaffForReset(event) {
        event.preventDefault();
        const staffId = document.getElementById('forgotStaffId').value.trim();
        const users = JSON.parse(localStorage.getItem('bravewood_users') || '[]');
        const user = users.find(u => u.staffId === staffId);

        if (!user) { this.showToast('Staff ID not found', 'error'); return; }

        if (!user.securityQuestion) {
            this.showToast('Security question not set up. Please contact your administrator.', 'error');
            return;
        }

        this.tempResetStaff = user;
        document.getElementById('securityQuestionLabel').textContent = user.securityQuestion;
        document.getElementById('forgotStep1').classList.add('hidden');
        document.getElementById('forgotStep2').classList.remove('hidden');
    },

    resetPassword(event) {
        event.preventDefault();
        if (!this.tempResetStaff) return;

        const answer = document.getElementById('securityAnswer').value.trim().toLowerCase();
        const newPassword = document.getElementById('resetPassword').value;
        const confirmPassword = document.getElementById('resetConfirmPassword').value;

        if (answer !== this.tempResetStaff.securityAnswer.toLowerCase()) { this.showToast('Incorrect security answer', 'error'); return; }
        if (newPassword !== confirmPassword) { this.showToast('Passwords do not match', 'error'); return; }
        if (newPassword.length < 6) { this.showToast('Password must be at least 6 characters', 'error'); return; }

        const users = JSON.parse(localStorage.getItem('bravewood_users') || '[]');
        const userIndex = users.findIndex(u => u.staffId === this.tempResetStaff.staffId);

        if (userIndex !== -1) {
            users[userIndex].password = newPassword;
            users[userIndex].passwordCreated = true;
            localStorage.setItem('bravewood_users', JSON.stringify(users));
            this.logAudit('PASSWORD_RESET', `Password reset for staff: ${this.tempResetStaff.staffId}`);
        }

        this.tempResetStaff = null;
        this.showToast('Password reset! Please login.', 'success');
        this.closeModal('forgotPasswordModal');
    },

    // Change password (logged-in user)
    openChangePasswordModal() {
        document.getElementById('changePasswordForm').reset();
        this.openModal('changePasswordModal');
    },

    changePassword(event) {
        event.preventDefault();
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmNewPassword').value;

        if (newPassword !== confirmPassword) { this.showToast('New passwords do not match', 'error'); return; }
        if (newPassword.length < 6) { this.showToast('Password must be at least 6 characters', 'error'); return; }

        const users = JSON.parse(localStorage.getItem('bravewood_users') || '[]');
        const userIndex = users.findIndex(u => u.staffId === this.currentUser.staffId);

        if (userIndex === -1 || users[userIndex].password !== currentPassword) { this.showToast('Current password is incorrect', 'error'); return; }

        users[userIndex].password = newPassword;
        localStorage.setItem('bravewood_users', JSON.stringify(users));
        this.logAudit('PASSWORD_CHANGE', `Password changed by: ${this.currentUser.staffId}`);
        this.showToast('Password changed successfully!', 'success');
        this.closeModal('changePasswordModal');
    },

    // Admin password reset
    openAdminResetModal(staffId) {
        const users = JSON.parse(localStorage.getItem('bravewood_users') || '[]');
        const user = users.find(u => u.staffId === staffId);
        if (!user) return;

        document.getElementById('adminResetStaffId').value = staffId;
        document.getElementById('adminResetStaffName').value = user.name;
        document.getElementById('adminResetNewPassword').value = '';
        this.openModal('adminResetModal');
    },

    generateTempPassword() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let password = '';
        for (let i = 0; i < 10; i++) password += chars.charAt(Math.floor(Math.random() * chars.length));
        document.getElementById('adminResetNewPassword').value = password;
    },

    adminResetPassword(event) {
        event.preventDefault();
        const staffId = document.getElementById('adminResetStaffId').value;
        const newPassword = document.getElementById('adminResetNewPassword').value;

        if (!newPassword || newPassword.length < 6) { this.showToast('Password must be at least 6 characters', 'error'); return; }

        const users = JSON.parse(localStorage.getItem('bravewood_users') || '[]');
        const userIndex = users.findIndex(u => u.staffId === staffId);

        if (userIndex !== -1) {
            users[userIndex].password = newPassword;
            users[userIndex].passwordCreated = true;
            localStorage.setItem('bravewood_users', JSON.stringify(users));
            this.logAudit('ADMIN_PASSWORD_RESET', `Admin reset password for: ${staffId}`);
        }

        this.showToast(`Password reset! New: ${newPassword}`, 'success');
        this.closeModal('adminResetModal');
    }
};
