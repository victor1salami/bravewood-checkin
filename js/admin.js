/* ============================================
   admin.js
   Admin management and System Configuration:
   Admin access control and Department/Role setup.
   Depends on: storage.js, ui.js
   ============================================ */

export const AdminMethods = {
  async loadAdmins() {
    const users = await this.getUsers();
    const admins = users.filter((u) => u.systemRole !== "STAFF");
    this.renderAdminTable(admins);
  },

  renderAdminTable(admins) {
    document.getElementById("adminTable").innerHTML = admins
      .map(
        (admin) => `
            <tr>
                <td>${admin.staffId}</td>
                <td>${admin.name}</td>
                <td><span class="badge ${admin.systemRole === "SUPER_ADMIN" ? "badge-danger" : "badge-info"}">${admin.systemRole}</span></td>
                <td>
                    ${
                      admin.systemRole !== "SUPER_ADMIN"
                        ? `<button class="btn btn-sm btn-danger" onclick="app.removeAdminAccess('${admin.staffId}')">Revoke Access</button>`
                        : "-"
                    }
                </td>
            </tr>
        `,
      )
      .join("") || '<tr><td colspan="4" class="text-center">No admins found</td></tr>';
  },

  async removeAdminAccess(staffId) {
    if (!confirm(`Revoke admin access for ${staffId}?`)) return;
    const users = await this.getUsers();
    const index = users.findIndex((u) => u.staffId === staffId);
    if (index !== -1) {
      users[index].systemRole = "STAFF";
      await this.setUsers(users);
      await this.logAudit("ADMIN_REVOKE", `Revoked admin access for: ${staffId}`);
      this.showToast("Admin access revoked", "success");
      await this.loadAdmins();
    }
  },

  async loadDeptRoleManagement() {
    const departments = await this.getDepartments();
    const roles = (await this.storageGet("roles")) || [];
    this.renderDeptTags(departments);
    this.renderRoleTags(roles);
  },

  renderDeptTags(departments) {
    document.getElementById("deptTags").innerHTML = departments
      .map(
        (dept) => `
            <div class="tag">
                ${dept}
                <span class="material-icons" onclick="app.deleteDepartment('${dept}')">close</span>
            </div>
        `,
      )
      .join("") || '<p class="text-muted">No departments defined</p>';
  },

  renderRoleTags(roles) {
    document.getElementById("roleTags").innerHTML = roles
      .map(
        (role) => `
            <div class="tag">
                ${role}
                <span class="material-icons" onclick="app.deleteRole('${role}')">close</span>
            </div>
        `,
      )
      .join("") || '<p class="text-muted">No roles defined</p>';
  },

  openAddDeptModal() {
    this.openModal("addDeptModal");
  },

  async addDepartment(event) {
    event.preventDefault();
    const name = document.getElementById("newDeptName").value.trim();
    if (!name) return;

    const departments = await this.getDepartments();
    if (departments.includes(name)) {
      this.showToast("Department already exists", "error");
      return;
    }

    departments.push(name);
    await this.storageSet("departments", departments);
    await this.logAudit("DEPT_ADD", `Added department: ${name}`);
    this.showToast("Department added", "success");
    this.closeModal("addDeptModal");
    await this.loadDeptRoleManagement();
  },

  async deleteDepartment(name) {
    if (!confirm(`Delete department "${name}"?`)) return;
    const departments = await this.getDepartments();
    const filtered = departments.filter((d) => d !== name);
    await this.storageSet("departments", filtered);
    await this.logAudit("DEPT_DELETE", `Deleted department: ${name}`);
    await this.loadDeptRoleManagement();
  },

  openAddRoleModal() {
    this.openModal("addRoleModal");
  },

  async addRole(event) {
    event.preventDefault();
    const name = document.getElementById("newRoleName").value.trim();
    if (!name) return;

    const roles = (await this.storageGet("roles")) || [];
    if (roles.includes(name)) {
      this.showToast("Role already exists", "error");
      return;
    }

    roles.push(name);
    await this.storageSet("roles", roles);
    await this.logAudit("ROLE_ADD", `Added role: ${name}`);
    this.showToast("Role added", "success");
    this.closeModal("addRoleModal");
    await this.loadDeptRoleManagement();
  },

  async deleteRole(name) {
    if (!confirm(`Delete role "${name}"?`)) return;
    const roles = (await this.storageGet("roles")) || [];
    const filtered = roles.filter((r) => r !== name);
    await this.storageSet("roles", filtered);
    await this.logAudit("ROLE_DELETE", `Deleted role: ${name}`);
    await this.loadDeptRoleManagement();
  },
};
