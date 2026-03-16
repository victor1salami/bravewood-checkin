/* ============================================
   staff.js
   Staff management: CRUD, search, fingerprint
   enrollment, CSV bulk upload, image upload.
   Depends on: config.js, storage.js
   ============================================ */

import { AppConfig } from "./config.js";

export const StaffMethods = {
  currentEnrollStaffId: null,

  // ============ PAGINATION STATE ============
  currentStaffPage: 1,
  staffPerPage: 50,
  filteredStaffData: [],

  async loadStaff() {
    await this.populateDeptRoleSelects();
    const users = await this.getUsers();
    const staffList = users.filter((u) => u.systemRole === "STAFF");
    // Initialize filtered data and reset to page 1
    this.filteredStaffData = staffList;
    this.currentStaffPage = 1;
    
    // Populate department and role filter dropdowns
    this.populateStaffFilters(staffList);
    
    // Reset filters
    document.getElementById("staffDepartmentFilter").value = "";
    document.getElementById("staffRoleFilter").value = "";
    document.getElementById("staffSortBy").value = "name-asc";
    
    this.renderStaffTable(staffList);
    this.renderStaffPagination();
  },
  
  /**
   * Populate department and role filter dropdowns
   */
  populateStaffFilters(staffList) {
    const departments = new Set(staffList.map(s => s.department).filter(Boolean));
    const roles = new Set(staffList.map(s => s.departmentRole).filter(Boolean));
    
    const deptSelect = document.getElementById("staffDepartmentFilter");
    const roleSelect = document.getElementById("staffRoleFilter");
    
    // Store original options
    const deptOptions = Array.from(deptSelect.options).map(opt => opt.value);
    const roleOptions = Array.from(roleSelect.options).map(opt => opt.value);
    
    // Keep the "All" option and add departments/roles
    while (deptSelect.options.length > 1) deptSelect.remove(1);
    while (roleSelect.options.length > 1) roleSelect.remove(1);
    
    Array.from(departments).sort().forEach(dept => {
      const option = document.createElement("option");
      option.value = dept;
      option.textContent = dept;
      deptSelect.appendChild(option);
    });
    
    Array.from(roles).sort().forEach(role => {
      const option = document.createElement("option");
      option.value = role;
      option.textContent = role;
      roleSelect.appendChild(option);
    });
  },
  
  /**
   * Filter and search staff by department, role, and search query
   */
  async filterStaff() {
    const query = document.getElementById("staffSearch").value.toLowerCase();
    const department = document.getElementById("staffDepartmentFilter").value;
    const role = document.getElementById("staffRoleFilter").value;
    
    const users = await this.getUsers();
    let staffList = users.filter((u) => u.systemRole === "STAFF");
    
    // Apply filters
    staffList = staffList.filter(u => {
      const matchesSearch = query === "" || 
        u.name.toLowerCase().includes(query) ||
        u.staffId.toLowerCase().includes(query) ||
        (u.department && u.department.toLowerCase().includes(query)) ||
        (u.departmentRole && u.departmentRole.toLowerCase().includes(query));
      
      const matchesDept = department === "" || u.department === department;
      const matchesRole = role === "" || u.departmentRole === role;
      
      return matchesSearch && matchesDept && matchesRole;
    });
    
    // Reset to first page on filter change
    this.currentStaffPage = 1;
    this.filteredStaffData = staffList;
    this.renderStaffTable(staffList);
    this.renderStaffPagination();
  },
  
  /**
   * Sort staff by selected criteria
   */
  async sortStaff() {
    const sortBy = document.getElementById("staffSortBy").value;
    let sortedList = [...this.filteredStaffData];
    
    switch(sortBy) {
      case "name-asc":
        sortedList.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        sortedList.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "id-asc":
        sortedList.sort((a, b) => a.staffId.localeCompare(b.staffId));
        break;
      case "id-desc":
        sortedList.sort((a, b) => b.staffId.localeCompare(a.staffId));
        break;
      case "department":
        sortedList.sort((a, b) => (a.department || "").localeCompare(b.department || ""));
        break;
    }
    
    this.currentStaffPage = 1;
    this.filteredStaffData = sortedList;
    this.renderStaffTable(sortedList);
    this.renderStaffPagination();
  },

  /**
   * Renders the staff table with pagination support.
   * Accepts full array but only renders current page slice.
   * @param {Array} staffList - Full array of staff to display (may be filtered)
   */
  renderStaffTable(staffList) {
    // Store the full filtered dataset for pagination calculations
    this.filteredStaffData = staffList || [];

    // Calculate pagination bounds
    const startIndex = (this.currentStaffPage - 1) * this.staffPerPage;
    const endIndex = startIndex + this.staffPerPage;
    const paginatedStaff = this.filteredStaffData.slice(startIndex, endIndex);

    // Render the current page of staff
    document.getElementById("staffTable").innerHTML = paginatedStaff
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

    // Show empty state if no results
    if (paginatedStaff.length === 0) {
      document.getElementById("staffTable").innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-secondary);">
            <span class="material-icons" style="font-size: 48px; display: block; margin-bottom: 12px;">people_outline</span>
            No staff members found
          </td>
        </tr>
      `;
    }

    // Update pagination controls
    this.renderStaffPagination();
  },

  /**
   * Renders pagination controls based on current state.
   * Shows Previous/Next, numbered pages, First/Last buttons.
   */
  renderStaffPagination() {
    const containerBottom = document.getElementById("staffPagination");
    const containerTop = document.getElementById("staffPaginationTop");
    
    if (!containerBottom && !containerTop) return;

    const totalItems = this.filteredStaffData.length;
    const totalPages = Math.ceil(totalItems / this.staffPerPage);

    // Hide pagination if only one page or no results
    if (totalPages <= 1) {
      if (containerBottom) {
        containerBottom.innerHTML = "";
        containerBottom.style.display = "none";
      }
      if (containerTop) {
        containerTop.innerHTML = "";
        containerTop.style.display = "none";
      }
      return;
    }

    if (containerBottom) containerBottom.style.display = "flex";
    if (containerTop) containerTop.style.display = "flex";

    // Calculate pagination bounds for page info display
    const startIndex = (this.currentStaffPage - 1) * this.staffPerPage;
    const endIndex = startIndex + this.staffPerPage;

    // Calculate visible page range (show max 5 page numbers)
    let startPage = Math.max(1, this.currentStaffPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }

    let html = "";

    // First button
    html += `
      <button class="pagination-btn" 
              onclick="app.changeStaffPage(1)" 
              ${this.currentStaffPage === 1 ? "disabled" : ""}
              title="First page">
        <span class="material-icons" style="font-size: 16px;">first_page</span>
      </button>
    `;

    // Previous button
    html += `
      <button class="pagination-btn" 
              onclick="app.prevStaffPage()" 
              ${this.currentStaffPage === 1 ? "disabled" : ""}
              title="Previous page">
        <span class="material-icons" style="font-size: 16px;">chevron_left</span>
      </button>
    `;

    // Page number buttons
    for (let i = startPage; i <= endPage; i++) {
      html += `
        <button class="pagination-btn ${i === this.currentStaffPage ? "active" : ""}" 
                onclick="app.changeStaffPage(${i})">
          ${i}
        </button>
      `;
    }

    // Next button
    html += `
      <button class="pagination-btn" 
              onclick="app.nextStaffPage()" 
              ${this.currentStaffPage === totalPages ? "disabled" : ""}
              title="Next page">
        <span class="material-icons" style="font-size: 16px;">chevron_right</span>
      </button>
    `;

    // Last button
    html += `
      <button class="pagination-btn" 
              onclick="app.changeStaffPage(${totalPages})" 
              ${this.currentStaffPage === totalPages ? "disabled" : ""}
              title="Last page">
        <span class="material-icons" style="font-size: 16px;">last_page</span>
      </button>
    `;

    // Page info
    html += `
      <span class="pagination-info">
        ${startIndex + 1}-${Math.min(endIndex, totalItems)} of ${totalItems}
      </span>
    `;

    // Render to both top and bottom containers
    if (containerTop) containerTop.innerHTML = html;
    if (containerBottom) containerBottom.innerHTML = html;
  },

  /**
   * Changes to a specific page number.
   * @param {number} page - Page number to navigate to
   */
  changeStaffPage(page) {
    const totalPages = Math.ceil(this.filteredStaffData.length / this.staffPerPage);
    if (page < 1 || page > totalPages) return;

    this.currentStaffPage = page;
    this.renderStaffTable(this.filteredStaffData);

    // Scroll to top of table for better UX
    const tableContainer = document.querySelector("#staffPage .table-container");
    if (tableContainer) {
      tableContainer.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  },

  /**
   * Navigates to the next page.
   */
  nextStaffPage() {
    const totalPages = Math.ceil(this.filteredStaffData.length / this.staffPerPage);
    if (this.currentStaffPage < totalPages) {
      this.changeStaffPage(this.currentStaffPage + 1);
    }
  },

  /**
   * Navigates to the previous page.
   */
  prevStaffPage() {
    if (this.currentStaffPage > 1) {
      this.changeStaffPage(this.currentStaffPage - 1);
    }
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

  /**
   * Search staff by name, ID, department, or role.
   * Resets to page 1 when search is performed.
   */
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
    // Reset to first page on new search
    this.currentStaffPage = 1;
    this.filteredStaffData = staffList;
    this.renderStaffTable(staffList);
    this.renderStaffPagination();
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

  /**
   * Handle CSV file selection and preview
   */
  handleCSVFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileName = document.getElementById("selectedFileName");
    fileName.textContent = `Selected: ${file.name}`;

    const reader = new FileReader();
    reader.onload = (e) => {
      const lines = e.target.result.split("\n").filter(line => line.trim());
      if (lines.length < 2) {
        this.showToast("CSV file must have a header row and at least one data row", "error");
        return;
      }

      const headers = lines[0].split(",").map(h => h.trim());
      const previewRows = lines.slice(1, 6).map(line => {
        return line.split(",").map(cell => cell.trim());
      });

      this.displayCSVPreview(headers, previewRows);
      document.getElementById("importBtn").style.display = "inline-block";
    };
    reader.readAsText(file);
  },

  /**
   * Display CSV preview in table format
   */
  displayCSVPreview(headers, rows) {
    const table = document.getElementById("csvPreviewTable");
    const thead = table.querySelector("thead");
    const tbody = table.querySelector("tbody");

    // Create header
    thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>`;

    // Create body rows
    tbody.innerHTML = rows.map(row => {
      return `<tr>${row.map(cell => `<td>${cell || ""}</td>`).join("")}</tr>`;
    }).join("");

    document.getElementById("csvPreviewSection").style.display = "block";
  },

  /**
   * Import CSV data into the system
   */
  async importCSVData() {
    const fileInput = document.getElementById("csvFileInput");
    const file = fileInput.files[0];
    if (!file) {
      this.showToast("Please select a CSV file", "error");
      return;
    }

    document.getElementById("importBtn").disabled = true;
    document.getElementById("importBtn").innerHTML = '<span class="material-icons" style="font-size: 16px; animation: spin 1s linear infinite;">hourglass_empty</span> Importing...';

    const reader = new FileReader();
    reader.onload = async (e) => {
      const lines = e.target.result.split("\n").filter(line => line.trim());
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      
      let success = 0;
      let failed = 0;
      let errors = [];

      const users = await this.getUsers();

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map(v => v.trim());
        
        if (values.length < headers.length) continue;

        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });

        // Validate required fields
        if (!row.staffid || !row.name || !row.department) {
          errors.push(`Row ${i + 1}: Missing required fields (staffId, name, department)`);
          failed++;
          continue;
        }

        // Check if staff already exists
        if (users.some(u => u.staffId === row.staffid)) {
          errors.push(`Row ${i + 1}: Staff ID "${row.staffid}" already exists`);
          failed++;
          continue;
        }

        // Create new user
        try {
          const randomQuestions = [
            "What is your mother's maiden name?",
            "What was the name of your first pet?",
            "What city were you born in?"
          ];
          const randomQ = randomQuestions[Math.floor(Math.random() * randomQuestions.length)];

          users.push({
            staffId: row.staffid,
            password: row.staffid.toLowerCase(),
            name: row.name,
            systemRole: "STAFF",
            department: row.department,
            departmentRole: row.departmentrole || "Staff",
            workStartTime: row.workstarttime || "09:00",
            workEndTime: row.workendtime || "17:00",
            fingerprint_registered: false,
            profileImage: null,
            passwordCreated: false,
            securityQuestion: randomQ,
            securityAnswer: row.name.split(" ")[0].toLowerCase(),
            email: row.email || "",
            phone: row.phone || "",
            createdAt: new Date().toISOString()
          });
          success++;
        } catch (error) {
          errors.push(`Row ${i + 1}: Error creating staff - ${error.message}`);
          failed++;
        }
      }

      // Save updated users
      await this.setUsers(users);

      // Display results
      this.displayImportResults(success, failed, errors);
      
      document.getElementById("importBtn").disabled = false;
      document.getElementById("importBtn").innerHTML = '<span class="material-icons" style="font-size: 16px;">cloud_upload</span> Import Staff';

      if (success > 0) {
        this.showToast(`Successfully imported ${success} staff member${success !== 1 ? 's' : ''}!`, "success");
        this.logAudit("BULK_CSV_IMPORT", `Imported ${success} staff, ${failed} failed`);
        
        // Refresh staff list if on staff page
        if (this.currentPage === "staff") {
          this.loadStaff();
        }
      }
    };
    reader.readAsText(file);
  },

  /**
   * Display import results
   */
  displayImportResults(success, failed, errors) {
    const resultsSection = document.getElementById("uploadResultsSection");
    const resultsContent = document.getElementById("resultsContent");

    let html = `
      <div style="margin-bottom: 16px;">
        <h4 style="margin-bottom: 8px;">Import Results</h4>
        <div style="display: flex; gap: 16px; margin-bottom: 12px;">
          <div style="flex: 1; padding: 12px; background: rgba(16, 124, 16, 0.1); border-radius: 6px; text-align: center;">
            <div style="font-size: 24px; font-weight: 700; color: var(--success);">${success}</div>
            <div style="font-size: 12px; color: var(--success);">Successful</div>
          </div>
          <div style="flex: 1; padding: 12px; background: rgba(164, 38, 44, 0.1); border-radius: 6px; text-align: center;">
            <div style="font-size: 24px; font-weight: 700; color: var(--danger);">${failed}</div>
            <div style="font-size: 12px; color: var(--danger);">Failed</div>
          </div>
        </div>
      </div>
    `;

    if (errors.length > 0) {
      html += `
        <div style="margin-top: 12px;">
          <h4 style="margin-bottom: 8px; color: var(--danger);">Errors</h4>
          <div style="max-height: 200px; overflow-y: auto; padding: 8px; background: rgba(164, 38, 44, 0.05); border-radius: 6px; font-size: 12px;">
            ${errors.slice(0, 10).map(err => `<div style="padding: 4px 0; color: var(--text-secondary);">• ${err}</div>`).join("")}
            ${errors.length > 10 ? `<div style="padding: 4px 0; color: var(--text-secondary);">... and ${errors.length - 10} more errors</div>` : ""}
          </div>
        </div>
      `;
    }

    resultsContent.innerHTML = html;
    resultsSection.style.display = "block";
  },

  /**
   * Download CSV template for bulk upload
   */
  downloadCSVTemplate() {
    const headers = ["staffId", "name", "department", "departmentRole", "email", "phone", "workStartTime", "workEndTime"];
    const sampleData = [
      ["EMP001", "John Doe", "IT Department", "Developer", "john@example.com", "555-0001", "09:00", "17:00"],
      ["EMP002", "Jane Smith", "Marketing", "Manager", "jane@example.com", "555-0002", "08:30", "17:30"],
      ["EMP003", "Bob Johnson", "HR", "Recruiter", "bob@example.com", "555-0003", "09:00", "17:00"]
    ];

    const csvContent = [
      headers.join(","),
      ...sampleData.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "staff_import_template.csv";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  /**
   * Reset bulk upload form
   */
  resetBulkUpload() {
    document.getElementById("csvFileInput").value = "";
    document.getElementById("selectedFileName").textContent = "";
    document.getElementById("csvPreviewSection").style.display = "none";
    document.getElementById("uploadResultsSection").style.display = "none";
    document.getElementById("importBtn").style.display = "none";
  },

  /**
   * Handle drag over event
   */
  handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    const area = document.getElementById("fileUploadArea");
    if (area) area.classList.add("dragover");
  },

  /**
   * Handle drag leave event
   */
  handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    const area = document.getElementById("fileUploadArea");
    if (area) area.classList.remove("dragover");
  },

  /**
   * Handle file drop event
   */
  handleFileDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const area = document.getElementById("fileUploadArea");
    if (area) area.classList.remove("dragover");

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const csvFile = Array.from(files).find(f => f.type === "text/csv" || f.name.endsWith(".csv"));
      if (csvFile) {
        const fileInput = document.getElementById("csvFileInput");
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(csvFile);
        fileInput.files = dataTransfer.files;
        this.handleCSVFileSelect({ target: { files: [csvFile] } });
      } else {
        this.showToast("Please drop a CSV file", "error");
      }
    }
  }
};
