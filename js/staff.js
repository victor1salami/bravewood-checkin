/* ============================================
   staff.js
   Staff management: CRUD, search, fingerprint
   enrollment, CSV bulk upload, image upload.
   Depends on: config.js, storage.js
   ============================================ */

import { AppConfig } from "./config.js";

export const StaffMethods = {
  currentEnrollStaffId: null,

  async loadStaff() {
    await this.populateDeptRoleSelects();
    const users = await this.getUsers();
    const staffList = users.filter((u) => u.systemRole === "STAFF");
    this.renderStaffTable(staffList);
  },

  renderStaffTable(staffList) {
    document.getElementById("staffTable").innerHTML = staffList
      .map(
        (staff) => `
            <tr>
                <td><div style="width: 40px; height: 40px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 14px; overflow: hidden;">${staff.profileImage ? `<img src="${staff.profileImage}" style="width: 100%; height: 100%; object-fit: cover;">` : staff.name.charAt(0).toUpperCase()}</div></td>
                <td>${staff.staffId}</td>
                <td>${staff.name}</td>
                <td>${staff.department || "-"}</td>
                <td><span class="badge badge-info">${staff.departmentRole || "Staff"}</span></td>
                <td>${staff.fingerprint_registered ? '<span class="badge badge-success"><span class="material-icons" style="font-size: 12px;">check</span> Registered</span>' : `<button class="btn btn-sm btn-warning" onclick="app.openFingerprintModal('${staff.staffId}')"><span class="material-icons" style="font-size: 14px;">fingerprint</span> Enroll</button>`}</td>
                <td>
                    <div class="action-dropdown">
                        <button class="btn btn-sm btn-secondary" onclick="app.toggleActionMenu(this, '${staff.staffId}')">
                            <span class="material-icons" style="font-size: 16px;">visibility</span> View
                        </button>
                    </div>
                </td>
            </tr>
        `,
      )
      .join("");
  },

  toggleActionMenu(btn, staffId) {
    const existingMenu = document.querySelector(".action-menu.active");
    if (existingMenu) {
      existingMenu.classList.remove("active");
      if (existingMenu.dataset.staffId === staffId) return;
    }

    const menu = document.createElement("div");
    menu.className = "action-menu active";
    menu.dataset.staffId = staffId;
    menu.innerHTML = `
            <div class="action-menu-item" onclick="app.openEditStaffModal('${staffId}'); app.closeActionMenu();">
                <span class="material-icons" style="color: var(--primary);">edit</span> Edit
            </div>
            <div class="action-menu-item" onclick="app.openAdminResetModal('${staffId}'); app.closeActionMenu();">
                <span class="material-icons" style="color: var(--warning);">lock_reset</span> Reset PW
            </div>
            <div class="action-menu-item" onclick="app.deleteStaff('${staffId}'); app.closeActionMenu();">
                <span class="material-icons" style="color: var(--danger);">delete</span> Delete
            </div>
        `;

    btn.parentElement.appendChild(menu);

    document.addEventListener("click", function closeMenu(e) {
      if (!menu.contains(e.target) && e.target !== btn) {
        menu.classList.remove("active");
        document.removeEventListener("click", closeMenu);
      }
    });
  },

  closeActionMenu() {
    const menu = document.querySelector(".action-menu.active");
    if (menu) menu.classList.remove("active");
  },

  async searchStaff() {
    const query = document.getElementById("staffSearch").value.toLowerCase();
    const users = await this.getUsers();
    const staffList = users.filter(
      (u) =>
        u.systemRole === "STAFF" &&
        (u.name.toLowerCase().includes(query) ||
          u.staffId.toLowerCase().includes(query) ||
          (u.department && u.department.toLowerCase().includes(query)) ||
          (u.departmentRole && u.departmentRole.toLowerCase().includes(query))),
    );
    this.renderStaffTable(staffList);
  },

  async openAddStaffModal() {
    await this.populateDeptRoleSelects();
    document.getElementById("addStaffForm").reset();
    document.getElementById("profilePreview").innerHTML =
      '<span class="material-icons">person</span>';
    document.getElementById("staffWorkTimeDisplay").textContent = "--:-- AM/PM";
    this.openModal("addStaffModal");
  },

  async openEditStaffModal(staffId) {
    await this.populateDeptRoleSelects();
    const users = await this.getUsers();
    const staff = users.find((u) => u.staffId === staffId);
    if (!staff) return;

    document.getElementById("editStaffId").value = staff.staffId;
    document.getElementById("editStaffName").value = staff.name;
    document.getElementById("editStaffDepartment").value =
      staff.department || "";
    document.getElementById("editStaffRole").value =
      staff.departmentRole || "Staff";
    document.getElementById("editStaffWorkTime").value =
      staff.workStartTime || "09:00";
    document.getElementById("editStaffWorkTimeDisplay").textContent =
      this.formatTimeWithAmPm(staff.workStartTime);
    document.getElementById("editIsAdmin").checked =
      staff.systemRole === "ADMIN";
    this.openModal("editStaffModal");
  },

  previewImage(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        document.getElementById("profilePreview").innerHTML =
          `<img src="${e.target.result}" alt="Preview">`;
      };
      reader.readAsDataURL(file);
    }
  },

  previewProfileImage(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        document.getElementById("profileEditImagePreview").src =
          e.target.result;
        document.getElementById("profileEditImagePreview").style.display =
          "block";
        document.getElementById("profileEditIcon").style.display = "none";
      };
      reader.readAsDataURL(file);
    }
  },

  async saveStaff(event) {
    event.preventDefault();
    const staffId = document.getElementById("staffId").value.trim();
    const name = document.getElementById("staffName").value.trim();
    const department = document.getElementById("staffDepartment").value;
    const departmentRole = document.getElementById("staffRole").value;
    const workStartTime = document.getElementById("staffWorkTime").value;
    const isAdmin = document.getElementById("isAdmin").checked;
    const profileImage =
      document.getElementById("profilePreview").querySelector("img")?.src ||
      null;

    const users = await this.getUsers();
    if (users.some((u) => u.staffId === staffId)) {
      this.showToast("Staff ID already exists", "error");
      return;
    }

    const randomQ =
      AppConfig.securityQuestions[
        Math.floor(Math.random() * AppConfig.securityQuestions.length)
      ];

    users.push({
      staffId,
      password: staffId.toLowerCase(),
      name,
      systemRole: isAdmin ? "ADMIN" : "STAFF",
      department,
      departmentRole,
      workStartTime,
      fingerprint_registered: false,
      profileImage,
      passwordCreated: false,
      securityQuestion: randomQ,
      securityAnswer: name.split(" ")[0].toLowerCase(),
      email: "",
      phone: "",
    });

    await this.setUsers(users);
    await this.logAudit(
      "STAFF_ADD",
      `Added staff: ${name} (${staffId}) - ${departmentRole} in ${department}`,
    );
    this.showToast(
      "Staff added! They must create password on first login.",
      "success",
    );
    this.closeModal("addStaffModal");
    await this.loadStaff();
  },

  async updateStaff(event) {
    event.preventDefault();
    const staffId = document.getElementById("editStaffId").value;
    const name = document.getElementById("editStaffName").value.trim();
    const department = document.getElementById("editStaffDepartment").value;
    const departmentRole = document.getElementById("editStaffRole").value;
    const workStartTime = document.getElementById("editStaffWorkTime").value;
    const isAdmin = document.getElementById("editIsAdmin").checked;

    const users = await this.getUsers();
    const index = users.findIndex((u) => u.staffId === staffId);
    if (index === -1) return;

    const oldRole = users[index].departmentRole;
    const oldSystemRole = users[index].systemRole;

    users[index] = {
      ...users[index],
      name,
      department,
      departmentRole,
      workStartTime,
      systemRole: isAdmin ? "ADMIN" : "STAFF",
    };
    await this.setUsers(users);

    let changes = [];
    if (oldRole !== departmentRole)
      changes.push(`Role: ${oldRole} -> ${departmentRole}`);
    if (oldSystemRole !== users[index].systemRole)
      changes.push(`Access: ${oldSystemRole} -> ${users[index].systemRole}`);

    await this.logAudit(
      "STAFF_EDIT",
      `Updated: ${name} (${staffId})${changes.length ? " - " + changes.join(", ") : ""}`,
    );
    this.showToast("Staff updated!", "success");
    this.closeModal("editStaffModal");
    await this.loadStaff();
  },

  async deleteStaff(staffId) {
    if (!confirm("Delete this staff member?")) return;
    const users = await this.getUsers();
    const staff = users.find((u) => u.staffId === staffId);

    const filtered = users.filter((u) => u.staffId !== staffId);
    await this.setUsers(filtered);

    const attendance = await this.getAttendance();
    await this.setAttendance(attendance.filter((a) => a.staffId !== staffId));

    await this.logAudit(
      "STAFF_DELETE",
      `Deleted: ${staff ? staff.name : staffId} (${staffId})`,
    );
    this.showToast("Staff deleted!", "success");
    await this.loadStaff();
  },

  // Fingerprint enrollment
  openFingerprintModal(staffId) {
    this.currentEnrollStaffId = staffId;
    document
      .getElementById("fingerprintEnrollStep1")
      .classList.remove("hidden");
    document.getElementById("fingerprintEnrollStep2").classList.add("hidden");
    this.openModal("fingerprintModal");
  },

  async enrollFingerprint() {
    const users = await this.getUsers();
    const index = users.findIndex(
      (u) => u.staffId === this.currentEnrollStaffId,
    );

    if (index !== -1) {
      users[index].fingerprint_registered = true;
      await this.setUsers(users);
      document.getElementById("fingerprintEnrollStep1").classList.add("hidden");
      document
        .getElementById("fingerprintEnrollStep2")
        .classList.remove("hidden");
      await this.logAudit(
        "FINGERPRINT_ENROLL",
        `Enrolled for: ${users[index].name} (${this.currentEnrollStaffId})`,
      );
      setTimeout(async () => {
        this.closeModal("fingerprintModal");
        await this.loadStaff();
      }, 1500);
    }
  },

  // Bulk CSV upload
  handleCSVUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const lines = e.target.result.split("\n").filter((line) => line.trim());
      let success = 0,
        failed = 0,
        errors = [];
      const users = await this.getUsers();

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim());
        if (cols.length < 5) continue;
        const [staffId, name, department, departmentRole, workStartTime] = cols;

        if (users.some((u) => u.staffId === staffId)) {
          failed++;
          errors.push(`Row ${i}: ${staffId} exists`);
          continue;
        }

        const randomQ =
          AppConfig.securityQuestions[
            Math.floor(Math.random() * AppConfig.securityQuestions.length)
          ];
        users.push({
          staffId,
          password: staffId.toLowerCase(),
          name,
          systemRole: "STAFF",
          department,
          departmentRole: departmentRole || "Staff",
          workStartTime: workStartTime || "09:00",
          fingerprint_registered: false,
          profileImage: null,
          passwordCreated: false,
          securityQuestion: randomQ,
          securityAnswer: name.split(" ")[0].toLowerCase(),
          email: "",
          phone: "",
        });
        success++;
      }

      await this.setUsers(users);
      document.getElementById("uploadSuccess").textContent = success;
      document.getElementById("uploadFailed").textContent = failed;
      document.getElementById("uploadErrors").innerHTML = errors
        .map((e) => `<div>${e}</div>`)
        .join("");
      document.getElementById("uploadResults").classList.remove("hidden");
      await this.logAudit("BULK_UPLOAD", `CSV: ${success} success, ${failed} failed`);
      if (success > 0) this.showToast(`${success} staff uploaded!`, "success");
    };
    reader.readAsText(file);
  },

  // Bulk profile image upload
  handleBulkImageUpload(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    this.getUsers().then((users) => {
      const results = [];
      let processed = 0;

      files.forEach((file) => {
        const staffId = file.name.split(".")[0];
        const userIndex = users.findIndex((u) => u.staffId === staffId);

        if (userIndex === -1) {
          results.push({
            staffId,
            status: "error",
            message: "Staff ID not found",
          });
          processed++;
          if (processed === files.length) this.showBulkImageResults(results);
          return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
          users[userIndex].profileImage = e.target.result;
          results.push({ staffId, status: "success", message: "Uploaded" });
          processed++;

          if (processed === files.length) {
            await this.setUsers(users);
            this.showBulkImageResults(results);
            await this.logAudit(
              "BULK_IMAGE_UPLOAD",
              `${results.filter((r) => r.status === "success").length} images uploaded`,
            );
          }
        };
        reader.readAsDataURL(file);
      });
    });
  },

  showBulkImageResults(results) {
    const container = document.getElementById("bulkImageTags");
    container.innerHTML = results
      .map(
        (r) => `
            <div class="tag" style="background: ${r.status === "success" ? "rgba(16, 124, 16, 0.15)" : "rgba(164, 38, 44, 0.15)"}; color: ${r.status === "success" ? "var(--success)" : "var(--danger)"}; border-color: ${r.status === "success" ? "rgba(16, 124, 16, 0.3)" : "rgba(164, 38, 44, 0.3)"};">
                ${r.staffId}: ${r.message}
            </div>
        `,
      )
      .join("");
    document.getElementById("bulkImageResults").classList.remove("hidden");
  },

  clearBulkUploadMessages() {
    const uploadResults = document.getElementById("uploadResults");
    const bulkImageResults = document.getElementById("bulkImageResults");
    if (uploadResults) uploadResults.classList.add("hidden");
    if (bulkImageResults) bulkImageResults.classList.add("hidden");
  },
};
