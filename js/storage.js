/* ============================================
   storage.js
   Data persistence layer: Supabase init,
   localStorage helpers, migration, and seed data.
   Depends on: config.js (AppConfig)
   ============================================ */

import { AppConfig } from "./config.js";

// These methods will be mixed into the app object.
// They are defined here for organization, then
// assigned in app.js via Object.assign(app, StorageMethods).

export const StorageMethods = {
  supabase: null,

  initSupabase() {
    const { url, anonKey, enabled } = AppConfig.supabase;
    if (!enabled) {
      console.log("Supabase sync disabled in config - using local mode");
      this.supabase = null;
      return;
    }
    try {
      this.supabase = supabase.createClient(url, anonKey);
      console.log("Supabase initialized");
    } catch (e) {
      console.error("Supabase init failed:", e);
      this.supabase = null;
    }
  },

  // Unified storage methods (localStorage with optional Supabase/API sync)
  async storageGet(key) {
    let data = null;

    // 1. Try Supabase first if enabled
    if (this.supabase) {
      try {
        const tableName = key === "users" ? "profiles" : (key === "attendance" ? "attendance" : "system_rules");
        const query = this.supabase.from(tableName);
        
        let result;
        if (tableName === "system_rules") {
          result = await query.select("value").eq("key", key).single();
        } else {
          result = await query.select("*");
        }

        const { data: remoteData, error } = result;

        if (!error && remoteData) {
          // PROTECTION: If we received empty relational data but HAVE local data, 
          // do NOT overwrite. This avoids losing data if Supabase is wiped or empty.
          const localData = JSON.parse(localStorage.getItem(`bravewood_${key}`) || "null");
          
          if (Array.isArray(remoteData) && remoteData.length === 0 && localData && localData.length > 0) {
            console.warn(`Supabase returned empty ${key}, preserving local data.`);
            data = localData;
          } else {
            data = tableName === "system_rules" ? remoteData.value : remoteData;
            localStorage.setItem(`bravewood_${key}`, JSON.stringify(data));
          }
          return data;
        }
      } catch (e) {
        console.warn(`Supabase fetch failed for ${key}:`, e.message);
      }
    }

    // 2. Fallback to legacy API if enabled
    if (AppConfig.api.enabled) {
      try {
        const response = await fetch(
          `${AppConfig.api.baseUrl}/storage/${key}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(AppConfig.api.timeout),
          },
        );
        if (response.ok) {
          const apiData = await response.json();
          localStorage.setItem(`bravewood_${key}`, JSON.stringify(apiData.value));
          return apiData.value;
        }
      } catch (e) {
        console.warn("API fetch failed, using localStorage:", e.message);
      }
    }

    // 3. Final fallback to localStorage
    try {
      return JSON.parse(localStorage.getItem(`bravewood_${key}`) || "null");
    } catch {
      return null;
    }
  },

  async storageSet(key, value) {
    // 1. Update localStorage first (optimistic)
    localStorage.setItem(`bravewood_${key}`, JSON.stringify(value));

    // 2. Sync to Supabase if enabled
    if (this.supabase) {
      try {
        const tableName = key === "users" ? "profiles" : (key === "attendance" ? "attendance" : "system_rules");
        
        if (tableName === "system_rules") {
          await this.supabase
            .from("system_rules")
            .upsert({ key, value, updated_at: new Date().toISOString() });
        } else {
          // Relational tables handle items individually.
          // IMPORTANT: We use 'staffId' as the conflict target for profiles
          // to ensure we update existing records rather than failing on unique constraints.
          for (const item of value) {
             const onConflict = tableName === "profiles" ? "staffId" : "id";
             // Clean item: remove potential numeric ID strings from seed if they exist
             const cleanItem = { ...item };
             if (tableName === "profiles" && typeof cleanItem.id === 'string' && !cleanItem.id.includes('-')) {
                delete cleanItem.id; // Let Supabase generate a proper UUID
             }

             await this.supabase.from(tableName).upsert(cleanItem, { onConflict });
          }
        }
      } catch (e) {
        console.warn(`Supabase save failed for ${key}:`, e.message);
      }
    }

    // 3. Sync to legacy API if enabled
    if (AppConfig.api.enabled) {
      try {
        await fetch(
          `${AppConfig.api.baseUrl}/storage/${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ value }),
            signal: AbortSignal.timeout(AppConfig.api.timeout),
          },
        );
      } catch (e) {
        console.warn("API save failed:", e.message);
      }
    }
    return true;
  },

  // NEW: Direct Database Methods (Remote-First)
  async dbGetUsers() {
    if (!this.supabase) return this.getUsers(); // Fallback to local
    const { data, error } = await this.supabase.from("profiles").select("*");
    if (error) throw error;
    localStorage.setItem("bravewood_users", JSON.stringify(data)); // Optional cache
    return data;
  },

  async dbUpsertUser(user) {
    if (!this.supabase) {
      const users = await this.getUsers();
      const idx = users.findIndex(u => u.staffId === user.staffId);
      if (idx !== -1) users[idx] = user; else users.push(user);
      return this.setUsers(users);
    }
    const { error } = await this.supabase.from("profiles").upsert(user, { onConflict: 'staffId' });
    if (error) throw error;
    // Update local cache
    const users = await this.getUsers();
    const idx = users.findIndex(u => u.staffId === user.staffId);
    if (idx !== -1) users[idx] = user; else users.push(user);
    localStorage.setItem("bravewood_users", JSON.stringify(users));
  },

  async dbDeleteUser(staffId) {
    if (!this.supabase) {
      const users = await this.getUsers();
      const filtered = users.filter(u => u.staffId !== staffId);
      return this.setUsers(filtered);
    }
    const { error } = await this.supabase.from("profiles").delete().eq("staffId", staffId);
    if (error) throw error;
    const users = await this.getUsers();
    localStorage.setItem("bravewood_users", JSON.stringify(users.filter(u => u.staffId !== staffId)));
  },

  async dbUpsertAttendance(record) {
    if (!this.supabase) {
      const attendance = await this.getAttendance();
      attendance.push(record);
      return this.setAttendance(attendance);
    }
    const { error } = await this.supabase.from("attendance").upsert(record);
    if (error) throw error;
    const attendance = await this.getAttendance();
    attendance.push(record);
    localStorage.setItem("bravewood_attendance", JSON.stringify(attendance));
  },

  async storageRemove(key) {
    localStorage.removeItem(`bravewood_${key}`);
    
    if (this.supabase) {
      try {
        await this.supabase.from("system_rules").delete().eq("key", key);
      } catch (e) {
        console.warn(`Supabase delete failed for ${key}:`, e.message);
      }
    }

    if (AppConfig.api.enabled) {
      try {
        await fetch(`${AppConfig.api.baseUrl}/storage/${key}`, {
          method: "DELETE",
          signal: AbortSignal.timeout(AppConfig.api.timeout),
        });
      } catch (e) {
        console.warn("API delete failed:", e.message);
      }
    }
  },

  // Direct accessor helpers (Now Async)
  async getUsers() {
    try {
      if (this.supabase) return await this.dbGetUsers();
    } catch (e) {
      console.warn("dbGetUsers failed, falling back to local:", e.message);
    }
    return (await this.storageGet("users")) || [];
  },
  async setUsers(users) {
    // Deprecated for direct use, but kept for legacy/compatibility
    await this.storageSet("users", users);
  },
  async getAttendance() {
    try {
      if (this.supabase) {
        const { data, error } = await this.supabase.from("attendance").select("*");
        if (!error) return data;
      }
    } catch (e) {}
    return (await this.storageGet("attendance")) || [];
  },
  async setAttendance(attendance) {
    await this.storageSet("attendance", attendance);
  },
  async getRules() {
    return (await this.storageGet("rules")) || {};
  },
  async setRules(rules) {
    await this.storageSet("rules", rules);
  },
  async getAudit() {
    return (await this.storageGet("audit")) || [];
  },
  async setAudit(audit) {
    await this.storageSet("audit", audit);
  },
  async logAudit(action, details) {
    const logEntry = {
      actor_id: this.currentUser ? this.currentUser.staffId : "SYSTEM",
      action,
      details,
      timestamp: new Date().toISOString()
    };

    if (this.supabase) {
      try {
        await this.supabase.from("audit_logs").insert(logEntry);
        return;
      } catch (e) {
        console.warn("Supabase audit log failed:", e.message);
      }
    }

    // Fallback to local
    const logs = (await this.storageGet("audit")) || [];
    logs.push({ ...logEntry, id: Date.now().toString() });
    await this.storageSet("audit", logs);
  },
  async getDepartments() {
    try {
      if (this.supabase) {
        const { data, error } = await this.supabase.from("departments").select("name");
        if (!error && data.length > 0) return data.map(d => d.name);
      }
    } catch (e) {}
    return (await this.storageGet("departments")) || [];
  },
  async dbGetRoles() {
    try {
      if (this.supabase) {
        const { data, error } = await this.supabase.from("roles").select("name");
        if (!error && data.length > 0) return data.map(r => r.name);
      }
    } catch (e) {}
    return (await this.storageGet("roles")) || [];
  },
  async getWorkDays() {
    const rules = await this.getRules();
    return rules.workDays || ["Mon", "Tue", "Wed", "Thu", "Fri"];
  },

  // Data migration for legacy field names
  async migrateData() {
    const users = await this.getUsers();
    if (users.length === 0) return;

    let migrated = false;
    const newUsers = users.map((u) => {
      if (u.username && !u.staffId) {
        migrated = true;
        return {
          ...u,
          staffId: u.username,
          systemRole: u.role || "STAFF",
          departmentRole: u.departmentRole || "Staff",
          passwordCreated: u.passwordCreated !== false,
          email: u.email || "",
          phone: u.phone || "",
        };
      }
      return u;
    });

    if (migrated) {
      await this.setUsers(newUsers);
    }
  },

  // Seed initial demo data on first run
  async seedData() {
    if (localStorage.getItem("bravewood_initialized") === "true") return;

    const users = [
      {
        staffId: "superadmin",
        password: "admin123",
        name: "Super Admin",
        systemRole: "SUPER_ADMIN",
        department: "IT",
        departmentRole: "C-Level",
        workStartTime: "09:00",
        fingerprint_registered: false,
        profileImage: null,
        passwordCreated: true,
        securityQuestion: "What city were you born in?",
        securityAnswer: "lagos",
        email: "superadmin@bravewood.com",
        phone: "",
      },
      {
        staffId: "admin001",
        password: "admin001",
        name: "John Admin",
        systemRole: "ADMIN",
        department: "HR",
        departmentRole: "Manager",
        workStartTime: "09:00",
        fingerprint_registered: true,
        profileImage: null,
        passwordCreated: true,
        securityQuestion: "What is your mother's maiden name?",
        securityAnswer: "smith",
        email: "john@bravewood.com",
        phone: "",
      },
      {
        staffId: "staff001",
        password: "staff001",
        name: "Mike Johnson",
        systemRole: "STAFF",
        department: "IT",
        departmentRole: "Senior Staff",
        workStartTime: "09:00",
        fingerprint_registered: true,
        profileImage: null,
        passwordCreated: true,
        securityQuestion: "What city were you born in?",
        securityAnswer: "lagos",
        email: "mike@bravewood.com",
        phone: "",
      },
      {
        staffId: "staff002",
        password: "staff002",
        name: "Emily Davis",
        systemRole: "STAFF",
        department: "HR",
        departmentRole: "Staff",
        workStartTime: "09:00",
        fingerprint_registered: true,
        profileImage: null,
        passwordCreated: true,
        securityQuestion: "What is your favorite color?",
        securityAnswer: "blue",
        email: "emily@bravewood.com",
        phone: "",
      },
    ];

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split("T")[0];

    const attendance = [
      {
        staffId: "staff001",
        date: today,
        time: "08:45",
        status: "ON_TIME",
      },
      {
        staffId: "staff002",
        date: today,
        time: "09:15",
        status: "LATE",
      },
      {
        staffId: "staff001",
        date: yesterday,
        time: "08:50",
        status: "ON_TIME",
      },
      {
        staffId: "staff002",
        date: yesterday,
        time: "08:55",
        status: "ON_TIME",
      },
    ];

    const rules = {
      workStartTime: "09:00",
      gracePeriod: 15,
      workDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      officeLat: 40.7128,
      officeLng: -74.006,
      allowedRadius: 100,
      gpsEnabled: false,
    };

    const auditLog = [
      {
        id: "1",
        timestamp: new Date().toISOString(),
        user: "superadmin",
        action: "SYSTEM_INIT",
        details: "System initialized with seed data",
      },
    ];

    const departments = [...AppConfig.defaultDepartments];
    const roles = [...AppConfig.defaultRoles];

    await this.setUsers(users);
    await this.setAttendance(attendance);
    await this.setRules(rules);
    await this.setAudit(auditLog);
    await this.storageSet("departments", departments);
    await this.storageSet("roles", roles);
    localStorage.setItem("bravewood_initialized", "true");
  },

  // Initialize departments and roles from defaults if empty
  async loadDepartmentsAndRoles() {
    let departments = await this.getDepartments();
    let roles = await this.dbGetRoles();

    if (departments.length === 0) {
      departments = [...AppConfig.defaultDepartments];
      // Seed to Supabase if possible
      if (this.supabase) {
         for (const name of departments) {
            await this.supabase.from("departments").upsert({ name }, { onConflict: 'name' });
         }
      }
      await this.storageSet("departments", departments);
    }
    if (roles.length === 0) {
      roles = [...AppConfig.defaultRoles];
      if (this.supabase) {
         for (const name of roles) {
            await this.supabase.from("roles").upsert({ name }, { onConflict: 'name' });
         }
      }
      await this.storageSet("roles", roles);
    }
  },

  // Populate department and role <select> elements across forms
  async populateDeptRoleSelects() {
    const departments = await this.getDepartments();
    const roles = await this.dbGetRoles();

    const deptSelects = [
      "staffDepartment",
      "editStaffDepartment",
      "profileEditDepartment",
    ];
    const roleSelects = ["staffRole", "editStaffRole", "profileEditRole"];

    deptSelects.forEach((id) => {
      const select = document.getElementById(id);
      if (select) {
        select.innerHTML =
          '<option value="">Select Department</option>' +
          departments.map((d) => `<option value="${d}">${d}</option>`).join("");
      }
    });

    roleSelects.forEach((id) => {
      const select = document.getElementById(id);
      if (select) {
        select.innerHTML =
          '<option value="">Select Role</option>' +
          roles.map((r) => `<option value="${r}">${r}</option>`).join("");
      }
    });
  },

  // Wipe all data and reload
  async resetSystem() {
    if (
      !confirm(
        "WARNING: This will DELETE ALL DATA and reset to factory defaults.\n\nAre you sure?",
      )
    )
      return;
    if (
      !confirm("Really sure? All staff, attendance, and settings will be lost.")
    )
      return;

    await this.storageRemove("users");
    await this.storageRemove("attendance");
    await this.storageRemove("rules");
    await this.storageRemove("audit");
    await this.storageRemove("departments");
    await this.storageRemove("roles");
    
    localStorage.removeItem("bravewood_initialized");
    localStorage.removeItem("bravewood_session");
    localStorage.removeItem("bravewood_theme");

    this.showToast("System reset! Reloading...", "success");
    setTimeout(() => location.reload(), 1500);
  },
};
