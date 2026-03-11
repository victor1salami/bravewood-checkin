/* ============================================
   ui.js
   Presentation layer logic: sidebar, modals,
   toast notifications, theme toggling, routing,
   and date/time formatting.
   Depends on: auth.js, storage.js (for data)
   ============================================ */

const UIMethods = {

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('bravewood_theme', newTheme);
        this.storageSet('bravewood_theme', newTheme);
        const toggle = document.getElementById('themeToggle');
        if (toggle) {
            const icon = toggle.querySelector('.material-icons');
            if (icon) icon.textContent = newTheme === 'dark' ? 'light_mode' : 'dark_mode';
        }
        
        if (this.attendanceChart) {
            this.loadAttendanceChart();
        }
    },

    loadTheme() {
        const theme = localStorage.getItem('bravewood_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        const toggle = document.getElementById('themeToggle');
        if (toggle) {
            const icon = toggle.querySelector('.material-icons');
            if (icon) icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
        }
    },

    toggleThemeFromSettings() {
        const isDark = document.getElementById('settingsDarkMode').checked;
        const newTheme = isDark ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('bravewood_theme', newTheme);
        this.storageSet('bravewood_theme', newTheme);
        const toggle = document.getElementById('themeToggle');
        if (toggle) {
            const icon = toggle.querySelector('.material-icons');
            if (icon) icon.textContent = newTheme === 'dark' ? 'light_mode' : 'dark_mode';
        }
        if (this.attendanceChart) {
            this.loadAttendanceChart();
        }
    },

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    },

    navigate(page, updateHistory = true) {
        document.querySelectorAll('.page-content').forEach(el => el.classList.add('hidden'));
        document.getElementById(`${page}Page`).classList.remove('hidden');
        
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const navItem = document.querySelector(`[data-page="${page}"]`);
        if (navItem) navItem.classList.add('active');

        document.getElementById('pageTitle').textContent = 
            navItem ? navItem.querySelector('span:not(.material-icons)').textContent : 
            page.charAt(0).toUpperCase() + page.slice(1);

        if (window.innerWidth <= 768) {
            document.getElementById('sidebar').classList.remove('open');
            document.getElementById('sidebarOverlay').classList.remove('active');
        }
        
        if (updateHistory) {
            this.updateUrl(page);
        }
        
        this.loadPageData(page);
        this.currentPage = page;
    },

    loadPageData(page) {
        switch(page) {
            case 'dashboard': this.loadDashboard(); break;
            case 'staff': this.loadStaff(); break;
            case 'rules': this.loadRules(); break;
            case 'reports': this.loadReportFilters(); break;
            case 'audit': this.loadAuditLog(); break;
            case 'staffPortal': this.loadStaffPortal(); break;
            case 'admin': this.loadAdmins(); break;
            case 'deptRole': this.loadDeptRoleManagement(); break;
            case 'staffProgress': this.loadStaffProgress(); break;
            case 'profile': this.loadProfile(); break;
            case 'settings': this.loadSettings(); break;
        }
    },

    updateUrl(page) {
        const url = new URL(window.location);
        url.searchParams.set('page', page);
        window.history.pushState({ page }, '', url);
    },

    renderSidebar() {
        const nav = document.getElementById('sidebarNav');
        const role = this.currentUser.systemRole;
        let html = '';

        if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
            html += `
                <a href="#" class="nav-item ${this.currentPage === 'dashboard' ? 'active' : ''}" data-page="dashboard" onclick="app.navigate('dashboard'); return false;">
                    <span class="material-icons">dashboard</span><span>Dashboard</span>
                </a>
                <a href="#" class="nav-item ${this.currentPage === 'staff' ? 'active' : ''}" data-page="staff" onclick="app.navigate('staff'); return false;">
                    <span class="material-icons">people</span><span>Staff Directory</span>
                </a>
                <a href="#" class="nav-item ${this.currentPage === 'rules' ? 'active' : ''}" data-page="rules" onclick="app.navigate('rules'); return false;">
                    <span class="material-icons">rule</span><span>Attendance Rules</span>
                </a>
                <a href="#" class="nav-item ${this.currentPage === 'reports' ? 'active' : ''}" data-page="reports" onclick="app.navigate('reports'); return false;">
                    <span class="material-icons">analytics</span><span>Reports</span>
                </a>
                <a href="#" class="nav-item ${this.currentPage === 'audit' ? 'active' : ''}" data-page="audit" onclick="app.navigate('audit'); return false;">
                    <span class="material-icons">history</span><span>Audit Log</span>
                </a>
            `;
            if (role === 'SUPER_ADMIN') {
                html += `
                    <div class="nav-divider"></div>
                    <div class="nav-section-title">System Configuration</div>
                    <a href="#" class="nav-item ${this.currentPage === 'admin' ? 'active' : ''}" data-page="admin" onclick="app.navigate('admin'); return false;">
                        <span class="material-icons">security</span><span>Admin Access</span>
                    </a>
                    <a href="#" class="nav-item ${this.currentPage === 'deptRole' ? 'active' : ''}" data-page="deptRole" onclick="app.navigate('deptRole'); return false;">
                        <span class="material-icons">account_tree</span><span>Departments & Roles</span>
                    </a>
                `;
            }
            html += `
                <div class="nav-divider"></div>
                <div class="nav-section-title">Personal</div>
                <a href="#" class="nav-item ${this.currentPage === 'profile' ? 'active' : ''}" data-page="profile" onclick="app.navigate('profile'); return false;">
                    <span class="material-icons">account_circle</span><span>My Profile</span>
                </a>
                <a href="#" class="nav-item ${this.currentPage === 'settings' ? 'active' : ''}" data-page="settings" onclick="app.navigate('settings'); return false;">
                    <span class="material-icons">settings</span><span>Settings</span>
                </a>
            `;
        } else {
            html += `
                <a href="#" class="nav-item ${this.currentPage === 'staffProgress' ? 'active' : ''}" data-page="staffProgress" onclick="app.navigate('staffProgress'); return false;">
                    <span class="material-icons">trending_up</span><span>My Progress</span>
                </a>
                <a href="#" class="nav-item ${this.currentPage === 'profile' ? 'active' : ''}" data-page="profile" onclick="app.navigate('profile'); return false;">
                    <span class="material-icons">account_circle</span><span>My Profile</span>
                </a>
                <a href="#" class="nav-item ${this.currentPage === 'settings' ? 'active' : ''}" data-page="settings" onclick="app.navigate('settings'); return false;">
                    <span class="material-icons">settings</span><span>Settings</span>
                </a>
            `;
        }
        nav.innerHTML = html;
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return; // In case toastContainer is not yet added to DOM
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icons = { success: 'check_circle', error: 'error', warning: 'warning', info: 'info' };
        toast.innerHTML = `<span class="material-icons" style="font-size: 20px;">${icons[type] || icons.info}</span><span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    },

    openModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    },

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    },

    togglePasswordVisibility(inputId, btn) {
        const input = document.getElementById(inputId);
        const icon = btn.querySelector('.material-icons');
        if (input.type === 'password') {
            input.type = 'text';
            icon.textContent = 'visibility';
        } else {
            input.type = 'password';
            icon.textContent = 'visibility_off';
        }
    },

    formatTimeWithAmPm(time) {
        if (!time) return '--:-- AM/PM';
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    },

    updateDateTime() {
        const now = new Date();
        const timeEl = document.getElementById('checkinTime');
        const dateEl = document.getElementById('checkinDate');
        if (timeEl) timeEl.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        if (dateEl) dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    },

    loadRules() {
        const rules = JSON.parse(localStorage.getItem('bravewood_rules') || '{}');
        document.getElementById('workStartTime').value = rules.workStartTime || '09:00';
        document.getElementById('gracePeriod').value = rules.gracePeriod || 15;
        
        const workDays = rules.workDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].forEach(day => {
            document.getElementById(`day${day}`).checked = workDays.includes(day);
        });

        document.getElementById('officeLat').value = rules.officeLat || 40.7128;
        document.getElementById('officeLng').value = rules.officeLng || -74.0060;
        document.getElementById('allowedRadius').value = rules.allowedRadius || 100;
        document.getElementById('gpsEnabled').checked = rules.gpsEnabled || false;
    },

    saveRules(event) {
        event.preventDefault();
        const workDays = [];
        ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].forEach(day => {
            if (document.getElementById(`day${day}`).checked) workDays.push(day);
        });

        const rules = {
            workStartTime: document.getElementById('workStartTime').value,
            gracePeriod: parseInt(document.getElementById('gracePeriod').value),
            workDays: workDays,
            officeLat: parseFloat(document.getElementById('officeLat').value),
            officeLng: parseFloat(document.getElementById('officeLng').value),
            allowedRadius: parseInt(document.getElementById('allowedRadius').value),
            gpsEnabled: document.getElementById('gpsEnabled').checked
        };
        localStorage.setItem('bravewood_rules', JSON.stringify(rules));
        this.logAudit('RULES_UPDATE', 'Attendance rules updated');
        this.showToast('Rules saved!', 'success');
    },

    loadProfile() {
        const users = JSON.parse(localStorage.getItem('bravewood_users') || '[]');
        const user = users.find(u => u.staffId === this.currentUser.staffId);
        if (!user) return;

        // Update current user data
        this.currentUser = { ...user };
        delete this.currentUser.password;
        delete this.currentUser.securityAnswer;
        localStorage.setItem('bravewood_session', JSON.stringify(this.currentUser));

        // View mode
        const viewImage = document.getElementById('profileViewImage');
        const viewIcon = document.getElementById('profileViewIcon');
        if (user.profileImage) {
            viewImage.src = user.profileImage;
            viewImage.style.display = 'block';
            viewIcon.style.display = 'none';
        } else {
            viewImage.style.display = 'none';
            viewIcon.style.display = 'block';
        }

        document.getElementById('profileViewName').textContent = user.name;
        document.getElementById('profileViewRole').textContent = `${user.departmentRole} at ${user.department}`;
        document.getElementById('profileViewStaffId').value = user.staffId;
        document.getElementById('profileViewNameInput').value = user.name;
        document.getElementById('profileViewDepartment').value = user.department || '-';
        document.getElementById('profileViewRoleInput').value = user.departmentRole || '-';
        document.getElementById('profileViewWorkTime').value = this.formatTimeWithAmPm(user.workStartTime);
        document.getElementById('profileViewSystemRole').value = user.systemRole;
        document.getElementById('profileViewEmail').value = user.email || '';
        document.getElementById('profileViewPhone').value = user.phone || '';

        // Edit mode
        document.getElementById('profileEditStaffId').value = user.staffId;
        document.getElementById('profileEditName').value = user.name;
        document.getElementById('profileEditEmail').value = user.email || '';
        document.getElementById('profileEditPhone').value = user.phone || '';
        document.getElementById('profileEditWorkTime').value = user.workStartTime || '09:00';
        document.getElementById('profileEditWorkTimeDisplay').textContent = this.formatTimeWithAmPm(user.workStartTime);

        const editImagePreview = document.getElementById('profileEditImagePreview');
        const editIcon = document.getElementById('profileEditIcon');
        if (user.profileImage) {
            editImagePreview.src = user.profileImage;
            editImagePreview.style.display = 'block';
            editIcon.style.display = 'none';
        } else {
            editImagePreview.style.display = 'none';
            editIcon.style.display = 'block';
        }

        // Populate department and role selects
        this.populateDeptRoleSelects();
        document.getElementById('profileEditDepartment').value = user.department || '';
        document.getElementById('profileEditRole').value = user.departmentRole || '';

        // Statistics
        const attendance = JSON.parse(localStorage.getItem('bravewood_attendance') || '[]');
        const myAttendance = attendance.filter(a => a.staffId === user.staffId);
        const totalDays = myAttendance.length;
        const onTimeDays = myAttendance.filter(a => a.status === 'ON_TIME').length;
        const lateDays = myAttendance.filter(a => a.status === 'LATE').length;
        const punctuality = totalDays > 0 ? Math.round((onTimeDays / totalDays) * 100) : 0;

        document.getElementById('profileTotalCheckins').textContent = totalDays;
        document.getElementById('profileOnTime').textContent = onTimeDays;
        document.getElementById('profileLate').textContent = lateDays;
        document.getElementById('profilePunctuality').textContent = punctuality + '%';
    },

    toggleEditProfile() {
        this.profileEditMode = !this.profileEditMode;
        document.getElementById('profileViewMode').classList.toggle('hidden', this.profileEditMode);
        document.getElementById('profileEditMode').classList.toggle('hidden', !this.profileEditMode);
    },

    saveProfile(event) {
        event.preventDefault();
        const name = document.getElementById('profileEditName').value.trim();
        const email = document.getElementById('profileEditEmail').value.trim();
        const phone = document.getElementById('profileEditPhone').value.trim();
        const department = document.getElementById('profileEditDepartment').value;
        const departmentRole = document.getElementById('profileEditRole').value;
        const workStartTime = document.getElementById('profileEditWorkTime').value;
        const profileImageInput = document.getElementById('profileEditImagePreview');
        const profileImage = profileImageInput.style.display !== 'none' ? profileImageInput.src : null;

        const users = JSON.parse(localStorage.getItem('bravewood_users') || '[]');
        const index = users.findIndex(u => u.staffId === this.currentUser.staffId);
        if (index === -1) return;

        users[index] = { 
            ...users[index], 
            name, 
            email, 
            phone, 
            department, 
            departmentRole, 
            workStartTime,
            ...(profileImage && { profileImage })
        };
        localStorage.setItem('bravewood_users', JSON.stringify(users));

        // Update current user
        this.currentUser = { ...users[index] };
        delete this.currentUser.password;
        delete this.currentUser.securityAnswer;
        localStorage.setItem('bravewood_session', JSON.stringify(this.currentUser));

        this.logAudit('PROFILE_UPDATE', `Profile updated by: ${this.currentUser.staffId}`);
        this.showToast('Profile updated successfully!', 'success');
        this.toggleEditProfile();
        this.loadProfile();
    },

    emailMyData() {
        const users = JSON.parse(localStorage.getItem('bravewood_users') || '[]');
        const user = users.find(u => u.staffId === this.currentUser.staffId);
        if (!user || !user.email) {
            this.showToast('Please add your email address in profile first', 'warning');
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(user.email)) {
            this.showToast('Please enter a valid email address in your profile', 'error');
            return;
        }

        const attendance = JSON.parse(localStorage.getItem('bravewood_attendance') || '[]');
        const myAttendance = attendance.filter(a => a.staffId === user.staffId).sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));

        // Build comprehensive email content
        let emailBody = `Hello ${user.name},\n\n`;
        emailBody += `Here is your attendance data from Bravewood Staff Check-In System:\n\n`;
        emailBody += `========================================\n`;
        emailBody += `PROFILE INFORMATION\n`;
        emailBody += `========================================\n`;
        emailBody += `Staff ID: ${user.staffId}\n`;
        emailBody += `Name: ${user.name}\n`;
        emailBody += `Department: ${user.department || 'N/A'}\n`;
        emailBody += `Role: ${user.departmentRole || 'N/A'}\n`;
        emailBody += `Work Start Time: ${user.workStartTime || '09:00'}\n\n`;

        emailBody += `========================================\n`;
        emailBody += `ATTENDANCE SUMMARY\n`;
        emailBody += `========================================\n`;
        const totalDays = myAttendance.length;
        const onTimeDays = myAttendance.filter(a => a.status === 'ON_TIME').length;
        const lateDays = myAttendance.filter(a => a.status === 'LATE').length;
        const punctualityRate = totalDays > 0 ? Math.round((onTimeDays / totalDays) * 100) : 0;

        emailBody += `Total Check-ins: ${totalDays}\n`;
        emailBody += `On Time: ${onTimeDays}\n`;
        emailBody += `Late: ${lateDays}\n`;
        emailBody += `Punctuality Rate: ${punctualityRate}%\n\n`;

        emailBody += `========================================\n`;
        emailBody += `DETAILED ATTENDANCE RECORDS\n`;
        emailBody += `========================================\n`;

        if (myAttendance.length === 0) {
            emailBody += 'No attendance records found.\n';
        } else {
            myAttendance.forEach((a, index) => {
                emailBody += `${index + 1}. ${a.date} - ${a.time} - ${a.status}\n`;
            });
        }

        emailBody += `\n========================================\n`;
        emailBody += `Report generated on: ${new Date().toLocaleString()}\n`;
        emailBody += `========================================\n\n`;
        emailBody += `Best regards,\nBravewood Staff Check-In System`;

        const subject = `Your Attendance Data - ${new Date().toLocaleDateString()}`;
        const mailtoLink = `mailto:${user.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
        
        // Try to open email client with fallback
        try {
            const emailWindow = window.open(mailtoLink, '_blank');
            if (emailWindow) {
                this.showToast('Email client opened! Please send the email.', 'success');
            } else {
                // Fallback: copy to clipboard
                this.copyToClipboard(emailBody);
                this.showToast('Email content copied to clipboard! Please paste in your email client.', 'warning');
            }
        } catch (e) {
            this.copyToClipboard(emailBody);
            this.showToast('Email content copied to clipboard! Please paste in your email client.', 'warning');
        }
        this.logAudit('EMAIL_DATA', `User ${user.staffId} requested data email to ${user.email}`);
    },

    copyToClipboard(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
        } catch (err) {
            console.error('Failed to copy:', err);
        }
        document.body.removeChild(textarea);
    },

    loadSettings() {
        const theme = localStorage.getItem('bravewood_theme') || 'dark';
        document.getElementById('settingsDarkMode').checked = theme === 'dark';

        // Show super admin settings only for super admin
        const superAdminSettings = document.getElementById('superAdminSettings');
        if (superAdminSettings) {
            superAdminSettings.style.display = this.currentUser.systemRole === 'SUPER_ADMIN' ? 'block' : 'none';
        }
    }
};
