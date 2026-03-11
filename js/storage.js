/* ============================================
   storage.js
   Data persistence layer: Supabase init,
   localStorage helpers, migration, and seed data.
   Depends on: config.js (AppConfig)
   ============================================ */

// These methods will be mixed into the app object.
// They are defined here for organization, then
// assigned in app.js via Object.assign(app, StorageMethods).

const StorageMethods = {

    supabase: null,

    initSupabase() {
        const { url, anonKey } = AppConfig.supabase;
        // Short-circuit if using the default placeholder key
        if (anonKey === 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4anJ2dnh2eGh2YnRrd2FtbnJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDg4MzQsImV4cCI6MjA4ODYyNDgzNH0.2XiHrYVD-1RIU3xIugJJ39iEtS-7xlNzcGs10eSIrbE') {
            console.warn('Supabase not configured - using local mode');
            this.supabase = null;
            return;
        }
        try {
            this.supabase = supabase.createClient(url, anonKey);
            console.log('Supabase initialized');
        } catch (e) {
            console.error('Supabase init failed:', e);
            this.supabase = null;
        }
    },

    // Unified storage methods (localStorage with optional API sync)
    // Resolves the duplicate definition issue from the original code
    async storageGet(key) {
        if (AppConfig.api.enabled) {
            try {
                const response = await fetch(`${AppConfig.api.baseUrl}/storage/${key}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    signal: AbortSignal.timeout(AppConfig.api.timeout)
                });
                if (response.ok) {
                    const data = await response.json();
                    localStorage.setItem(`bravewood_${key}`, JSON.stringify(data.value));
                    return data.value;
                }
            } catch (e) {
                console.warn('API fetch failed, using localStorage:', e.message);
            }
        }
        try {
            return JSON.parse(localStorage.getItem(`bravewood_${key}`) || 'null');
        } catch {
            return null;
        }
    },

    async storageSet(key, value) {
        localStorage.setItem(`bravewood_${key}`, JSON.stringify(value));
        if (AppConfig.api.enabled) {
            try {
                const response = await fetch(`${AppConfig.api.baseUrl}/storage/${key}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ value }),
                    signal: AbortSignal.timeout(AppConfig.api.timeout)
                });
                return response.ok;
            } catch (e) {
                console.warn('API save failed, data cached locally:', e.message);
                return false;
            }
        }
        return true;
    },

    async storageRemove(key) {
        localStorage.removeItem(`bravewood_${key}`);
        if (AppConfig.api.enabled) {
            try {
                await fetch(`${AppConfig.api.baseUrl}/storage/${key}`, {
                    method: 'DELETE',
                    signal: AbortSignal.timeout(AppConfig.api.timeout)
                });
            } catch (e) {
                console.warn('API delete failed:', e.message);
            }
        }
    },

    // Direct localStorage accessor helpers
    getUsers() { return JSON.parse(localStorage.getItem('bravewood_users') || '[]'); },
    setUsers(users) { localStorage.setItem('bravewood_users', JSON.stringify(users)); },
    getAttendance() { return JSON.parse(localStorage.getItem('bravewood_attendance') || '[]'); },
    setAttendance(attendance) { localStorage.setItem('bravewood_attendance', JSON.stringify(attendance)); },
    getRules() { return JSON.parse(localStorage.getItem('bravewood_rules') || '{}'); },
    setRules(rules) { localStorage.setItem('bravewood_rules', JSON.stringify(rules)); },
    getAudit() { return JSON.parse(localStorage.getItem('bravewood_audit') || '[]'); },
    setAudit(audit) { localStorage.setItem('bravewood_audit', JSON.stringify(audit)); },
    getDepartments() { return JSON.parse(localStorage.getItem('bravewood_departments') || '[]'); },
    getWorkDays() {
        const rules = JSON.parse(localStorage.getItem('bravewood_rules') || '{}');
        return rules.workDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    },

    // Data migration for legacy field names
    migrateData() {
        const users = JSON.parse(localStorage.getItem('bravewood_users') || '[]');
        if (users.length === 0) return;

        let migrated = false;
        const newUsers = users.map(u => {
            if (u.username && !u.staffId) {
                migrated = true;
                return {
                    ...u,
                    staffId: u.username,
                    systemRole: u.role || 'STAFF',
                    departmentRole: u.departmentRole || 'Staff',
                    passwordCreated: u.passwordCreated !== false,
                    email: u.email || '',
                    phone: u.phone || ''
                };
            }
            return u;
        });

        if (migrated) {
            localStorage.setItem('bravewood_users', JSON.stringify(newUsers));
        }
    },

    // Seed initial demo data on first run
    seedData() {
        if (localStorage.getItem('bravewood_initialized') === 'true') return;

        const users = [
            {
                staffId: 'superadmin',
                password: 'admin123',
                name: 'Super Admin',
                systemRole: 'SUPER_ADMIN',
                department: 'IT',
                departmentRole: 'C-Level',
                workStartTime: '09:00',
                fingerprint_registered: false,
                profileImage: null,
                passwordCreated: true,
                securityQuestion: "What city were you born in?",
                securityAnswer: "lagos",
                email: 'superadmin@bravewood.com',
                phone: ''
            },
            {
                staffId: 'admin001',
                password: 'admin001',
                name: 'John Admin',
                systemRole: 'ADMIN',
                department: 'HR',
                departmentRole: 'Manager',
                workStartTime: '09:00',
                fingerprint_registered: true,
                profileImage: null,
                passwordCreated: true,
                securityQuestion: "What is your mother's maiden name?",
                securityAnswer: "smith",
                email: 'john@bravewood.com',
                phone: ''
            },
            {
                staffId: 'staff001',
                password: 'staff001',
                name: 'Mike Johnson',
                systemRole: 'STAFF',
                department: 'IT',
                departmentRole: 'Senior Staff',
                workStartTime: '09:00',
                fingerprint_registered: true,
                profileImage: null,
                passwordCreated: true,
                securityQuestion: "What city were you born in?",
                securityAnswer: "lagos",
                email: 'mike@bravewood.com',
                phone: ''
            },
            {
                staffId: 'staff002',
                password: 'staff002',
                name: 'Emily Davis',
                systemRole: 'STAFF',
                department: 'HR',
                departmentRole: 'Staff',
                workStartTime: '09:00',
                fingerprint_registered: true,
                profileImage: null,
                passwordCreated: true,
                securityQuestion: "What is your favorite color?",
                securityAnswer: "blue",
                email: 'emily@bravewood.com',
                phone: ''
            }
        ];

        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        const attendance = [
            { id: '1', staffId: 'staff001', date: today, time: '08:45', status: 'ON_TIME' },
            { id: '2', staffId: 'staff002', date: today, time: '09:15', status: 'LATE' },
            { id: '3', staffId: 'staff001', date: yesterday, time: '08:50', status: 'ON_TIME' },
            { id: '4', staffId: 'staff002', date: yesterday, time: '08:55', status: 'ON_TIME' }
        ];

        const rules = {
            workStartTime: '09:00',
            gracePeriod: 15,
            workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            officeLat: 40.7128,
            officeLng: -74.0060,
            allowedRadius: 100,
            gpsEnabled: false
        };

        const auditLog = [
            { id: '1', timestamp: new Date().toISOString(), user: 'superadmin', action: 'SYSTEM_INIT', details: 'System initialized with seed data' }
        ];

        const departments = [...AppConfig.defaultDepartments];
        const roles = [...AppConfig.defaultRoles];

        localStorage.setItem('bravewood_users', JSON.stringify(users));
        localStorage.setItem('bravewood_attendance', JSON.stringify(attendance));
        localStorage.setItem('bravewood_rules', JSON.stringify(rules));
        localStorage.setItem('bravewood_audit', JSON.stringify(auditLog));
        localStorage.setItem('bravewood_departments', JSON.stringify(departments));
        localStorage.setItem('bravewood_roles', JSON.stringify(roles));
        localStorage.setItem('bravewood_initialized', 'true');
    },

    // Initialize departments and roles from defaults if empty
    loadDepartmentsAndRoles() {
        let departments = JSON.parse(localStorage.getItem('bravewood_departments') || '[]');
        let roles = JSON.parse(localStorage.getItem('bravewood_roles') || '[]');

        if (departments.length === 0) {
            departments = [...AppConfig.defaultDepartments];
            localStorage.setItem('bravewood_departments', JSON.stringify(departments));
        }
        if (roles.length === 0) {
            roles = [...AppConfig.defaultRoles];
            localStorage.setItem('bravewood_roles', JSON.stringify(roles));
        }
    },

    // Populate department and role <select> elements across forms
    populateDeptRoleSelects() {
        const departments = this.getDepartments();
        const roles = JSON.parse(localStorage.getItem('bravewood_roles') || '[]');

        const deptSelects = ['staffDepartment', 'editStaffDepartment', 'profileEditDepartment'];
        const roleSelects = ['staffRole', 'editStaffRole', 'profileEditRole'];

        deptSelects.forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                select.innerHTML = '<option value="">Select Department</option>' +
                    departments.map(d => `<option value="${d}">${d}</option>`).join('');
            }
        });

        roleSelects.forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                select.innerHTML = '<option value="">Select Role</option>' +
                    roles.map(r => `<option value="${r}">${r}</option>`).join('');
            }
        });
    },

    // Wipe all data and reload
    resetSystem() {
        if (!confirm('WARNING: This will DELETE ALL DATA and reset to factory defaults.\n\nAre you sure?')) return;
        if (!confirm('Really sure? All staff, attendance, and settings will be lost.')) return;

        localStorage.removeItem('bravewood_users');
        localStorage.removeItem('bravewood_attendance');
        localStorage.removeItem('bravewood_rules');
        localStorage.removeItem('bravewood_audit');
        localStorage.removeItem('bravewood_initialized');
        localStorage.removeItem('bravewood_session');
        localStorage.removeItem('bravewood_theme');
        localStorage.removeItem('bravewood_departments');
        localStorage.removeItem('bravewood_roles');

        this.showToast('System reset! Reloading...', 'success');
        setTimeout(() => location.reload(), 1500);
    }
};
