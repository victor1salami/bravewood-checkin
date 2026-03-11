/* ============================================
   app.js
   Main application entry point. Combines all
   method modules and initializes the app.
   Depends on: config.js, storage.js, auth.js,
   staff.js, attendance.js, dashboard.js,
   reports.js, ui.js
   ============================================ */

   import { StorageMethods } from "./storage.js";
   import { AuthMethods } from "./auth.js";
   import { StaffMethods } from "./staff.js";
   import { AttendanceMethods } from "./attendance.js";
   import { DashboardMethods } from "./dashboard.js";
   import { ReportMethods } from "./reports.js";
   import { UIMethods } from "./ui.js";


const appState = {
  currentUser: null,
  currentPage: "dashboard",
  tempResetStaff: null,
  attendanceChart: null,
  currentEnrollStaffId: null,
  profileEditMode: false,
  supabase: null, // For cross-device sync if configured in storage.js
};

// Combine all method mixins into the main app object
const app = Object.assign(
  {},
  appState,
  StorageMethods,
  AuthMethods,
  StaffMethods,
  AttendanceMethods,
  DashboardMethods,
  ReportMethods,
  UIMethods
);

// Attach to window for HTML event listeners (e.g., onclick="app.login()")
window.app = app;

Object.assign(app, {
  init() {
      // Initialize Supabase for cross-device sync (if configured)
      this.initSupabase();

      this.migrateData();
      this.seedData();
      this.loadTheme();
      this.updateDateTime();

      // Keep clock updated
      setInterval(() => this.updateDateTime(), 1000);

      this.setupEventListeners();
      this.loadDepartmentsAndRoles();

      // Clear bulk upload messages on page refresh
      if (typeof this.clearBulkUploadMessages === "function") {
        this.clearBulkUploadMessages();
      }

      // Global drop zone setup for CSV files
      const dropZone = document.getElementById("csvUploadZone");
      if (dropZone) {
        dropZone.addEventListener("dragover", (e) => {
          e.preventDefault();
          dropZone.classList.add("dragover");
        });
        dropZone.addEventListener("dragleave", () =>
          dropZone.classList.remove("dragover"),
        );
        dropZone.addEventListener("drop", (e) => {
          e.preventDefault();
          dropZone.classList.remove("dragover");
          const files = e.dataTransfer.files;
          if (files.length > 0) {
            document.getElementById("csvFile").files = files;
            this.handleCSVUpload({ target: { files } });
          }
        });
      }

      // History back navigation routing
      window.addEventListener("popstate", (e) => {
        if (e.state && e.state.page) {
          this.navigate(e.state.page, false);
        }
      });

      // Check for existing session to maintain login after page refresh
      this.checkSession();
    },

    setupEventListeners() {
      // Time string formatters for staff modals
      const staffWorkTime = document.getElementById("staffWorkTime");
      const editStaffWorkTime = document.getElementById("editStaffWorkTime");
      const profileEditWorkTime = document.getElementById(
        "profileEditWorkTime",
      );

      if (staffWorkTime) {
        staffWorkTime.addEventListener("input", (e) => {
          document.getElementById("staffWorkTimeDisplay").textContent =
            this.formatTimeWithAmPm(e.target.value);
        });
      }

      if (editStaffWorkTime) {
        editStaffWorkTime.addEventListener("input", (e) => {
          document.getElementById("editStaffWorkTimeDisplay").textContent =
            this.formatTimeWithAmPm(e.target.value);
        });
      }

      if (profileEditWorkTime) {
        profileEditWorkTime.addEventListener("input", (e) => {
          document.getElementById("profileEditWorkTimeDisplay").textContent =
            this.formatTimeWithAmPm(e.target.value);
        });
      }

      // Main login form handler
      const loginForm = document.getElementById("loginForm");
      if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
          e.preventDefault();
          const staffId = document.getElementById("loginStaffId").value.trim();
          const password = document.getElementById("loginPassword").value;
          const loginBtn = document.getElementById("loginBtn");

          loginBtn.innerHTML = '<span class="spinner"></span>';
          loginBtn.disabled = true;

          // login() method is mixed in from auth.js
          const result = this.login(staffId, password);

          loginBtn.innerHTML = "<span>Sign In</span>";
          loginBtn.disabled = false;

          if (result.success) {
            this.showToast("Welcome back!", "success");
            this.showApp();
          } else if (result.error === "PASSWORD_NOT_CREATED") {
            this.showToast("Please create your password first", "warning");
            this.showFirstTimeSetup();
            document.getElementById("setupStaffId").value = result.staffId;
          } else {
            this.showToast(result.error || "Login failed", "error");
            const loginBox = document.querySelector(".login-box");
            loginBox.classList.add("shake");
            setTimeout(() => loginBox.classList.remove("shake"), 400);
          }
        });
      }
    },

    goToDashboard() {
      this.currentUser ? this.showApp() : this.showLogin();
    },
  },
);

// Global modal overlay dismiss logic
document.querySelectorAll(".modal-overlay").forEach((overlay) => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.classList.remove("active");
    }
  });
});

// Bootstrap application once DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  app.init();
});
