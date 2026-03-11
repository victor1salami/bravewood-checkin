/* ============================================
   reports.js
   Report generation, export, staff progress
   tracking, and audit log views.
   Depends on: storage.js (for data)
   ============================================ */

const ReportMethods = {

    loadReportFilters() {
        const users = JSON.parse(localStorage.getItem('bravewood_users') || '[]');
        const departments = [...new Set(users.filter(u => u.department).map(u => u.department))];
        document.getElementById('reportDept').innerHTML = '<option value="">All Departments</option>' + departments.map(d => `<option value="${d}">${d}</option>`).join('');

        const today = new Date();
        const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        document.getElementById('reportToDate').value = today.toISOString().split('T')[0];
        document.getElementById('reportFromDate').value = lastWeek.toISOString().split('T')[0];
    },

    generateReport() {
        const fromDate = document.getElementById('reportFromDate').value;
        const toDate = document.getElementById('reportToDate').value;
        const department = document.getElementById('reportDept').value;
        const staffId = document.getElementById('reportStaffId').value.trim();

        const attendance = JSON.parse(localStorage.getItem('bravewood_attendance') || '[]');
        const users = JSON.parse(localStorage.getItem('bravewood_users') || '[]');

        let filtered = attendance.filter(a => {
            if (fromDate && a.date < fromDate) return false;
            if (toDate && a.date > toDate) return false;
            if (staffId && a.staffId !== staffId) return false;
            const staff = users.find(u => u.staffId === a.staffId);
            if (department && (!staff || staff.department !== department)) return false;
            return true;
        }).sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));

        document.getElementById('reportTable').innerHTML = filtered.map(a => {
            const staff = users.find(u => u.staffId === a.staffId);
            return `<tr>
                <td>${a.date}</td>
                <td>${a.staffId}</td>
                <td>${staff ? staff.name : '-'}</td>
                <td>${staff ? staff.department || '-' : '-'}</td>
                <td>${staff ? staff.departmentRole || '-' : '-'}</td>
                <td>${a.time}</td>
                <td><span class="badge ${a.status === 'ON_TIME' ? 'badge-success' : 'badge-warning'}">${a.status === 'ON_TIME' ? 'On Time' : 'Late'}</span></td>
            </tr>`;
        }).join('') || '<tr><td colspan="7" class="text-center" style="padding: 24px; color: var(--text-secondary);">No records found</td></tr>';
    },

    exportReport() {
        const fromDate = document.getElementById('reportFromDate').value;
        const toDate = document.getElementById('reportToDate').value;
        const department = document.getElementById('reportDept').value;
        const staffId = document.getElementById('reportStaffId').value.trim();

        const attendance = JSON.parse(localStorage.getItem('bravewood_attendance') || '[]');
        const users = JSON.parse(localStorage.getItem('bravewood_users') || '[]');

        let filtered = attendance.filter(a => {
            if (fromDate && a.date < fromDate) return false;
            if (toDate && a.date > toDate) return false;
            if (staffId && a.staffId !== staffId) return false;
            const staff = users.find(u => u.staffId === a.staffId);
            if (department && (!staff || staff.department !== department)) return false;
            return true;
        });

        const csv = ['Date,Staff ID,Name,Department,Role,Check-in Time,Status', ...filtered.map(a => {
            const staff = users.find(u => u.staffId === a.staffId);
            return `${a.date},${a.staffId},${staff ? staff.name : '-'},${staff ? staff.department || '-' : '-'},${staff ? staff.departmentRole || '-' : '-'},${a.time},${a.status}`;
        })].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('Report exported!', 'success');
    },

    loadAuditLog() {
        const logs = JSON.parse(localStorage.getItem('bravewood_audit') || '[]').sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        document.getElementById('auditTable').innerHTML = logs.slice(0, 100).map(log =>
            `<tr>
                <td>${new Date(log.timestamp).toLocaleString()}</td>
                <td>${log.user}</td>
                <td><span class="badge badge-info">${log.action}</span></td>
                <td>${log.details}</td>
            </tr>`
        ).join('') || '<tr><td colspan="4" class="text-center" style="padding: 24px; color: var(--text-secondary);">No audit records</td></tr>';
    },

    logAudit(action, details) {
        const logs = JSON.parse(localStorage.getItem('bravewood_audit') || '[]');
        logs.push({ id: Date.now().toString(), timestamp: new Date().toISOString(), user: this.currentUser ? this.currentUser.staffId : 'SYSTEM', action, details });
        localStorage.setItem('bravewood_audit', JSON.stringify(logs));
    },

    loadStaffPortal() {
        this.navigate('staffProgress');
    },

    loadStaffProgress() {
        const attendance = JSON.parse(localStorage.getItem('bravewood_attendance') || '[]');
        const users = JSON.parse(localStorage.getItem('bravewood_users') || '[]');
        const rules = JSON.parse(localStorage.getItem('bravewood_rules') || '{}');
        
        const myAttendance = attendance.filter(a => a.staffId === this.currentUser.staffId).sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));
        
        const totalDays = myAttendance.length;
        const onTimeDays = myAttendance.filter(a => a.status === 'ON_TIME').length;
        const lateDays = myAttendance.filter(a => a.status === 'LATE').length;
        
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const workDays = rules.workDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        let expectedWorkDays = 0;
        
        for (let d = new Date(startOfMonth); d <= now; d.setDate(d.getDate() + 1)) {
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
            if (workDays.includes(dayName)) expectedWorkDays++;
        }
        
        const missedDays = Math.max(0, expectedWorkDays - totalDays);
        
        document.getElementById('staffProgressGrid').innerHTML = `
            <div class="progress-card">
                <h4>Attendance Summary</h4>
                <div class="progress-stat">
                    <span class="progress-stat-label">Total Check-ins</span>
                    <span class="progress-stat-value">${totalDays}</span>
                </div>
                <div class="progress-stat">
                    <span class="progress-stat-label">On Time</span>
                    <span class="progress-stat-value" style="color: var(--success);">${onTimeDays}</span>
                </div>
                <div class="progress-stat">
                    <span class="progress-stat-label">Late</span>
                    <span class="progress-stat-value" style="color: var(--warning);">${lateDays}</span>
                </div>
                <div class="progress-stat">
                    <span class="progress-stat-label">Days Missed</span>
                    <span class="progress-stat-value" style="color: var(--danger);">${missedDays}</span>
                </div>
            </div>
            <div class="progress-card">
                <h4>Performance</h4>
                <div class="progress-stat">
                    <span class="progress-stat-label">Punctuality Rate</span>
                    <span class="progress-stat-value">${totalDays > 0 ? Math.round((onTimeDays / totalDays) * 100) : 0}%</span>
                </div>
                <div class="progress-stat">
                    <span class="progress-stat-label">Attendance Rate</span>
                    <span class="progress-stat-value">${expectedWorkDays > 0 ? Math.round((totalDays / expectedWorkDays) * 100) : 0}%</span>
                </div>
                <div class="progress-stat">
                    <span class="progress-stat-label">Current Streak</span>
                    <span class="progress-stat-value">${this.calculateStreak(myAttendance)} days</span>
                </div>
            </div>
        `;
        
        document.getElementById('staffProgressTable').innerHTML = myAttendance.map(a =>
            `<tr><td>${a.date}</td><td>${a.time}</td><td><span class="badge ${a.status === 'ON_TIME' ? 'badge-success' : 'badge-warning'}">${a.status === 'ON_TIME' ? 'On Time' : 'Late'}</span></td></tr>`
        ).join('') || '<tr><td colspan="3" class="text-center" style="padding: 24px; color: var(--text-secondary);">No attendance records</td></tr>';
    },

    calculateStreak(attendance) {
        if (attendance.length === 0) return 0;
        let streak = 0;
        const today = new Date().toISOString().split('T')[0];
        
        for (let record of attendance) {
            if (record.date === today || new Date(record.date) < new Date(today)) {
                streak++;
            } else {
                break;
            }
        }
        return streak;
    }
};
