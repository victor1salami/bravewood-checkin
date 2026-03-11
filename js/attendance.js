/* ============================================
   attendance.js
   Check-in logic, fingerprint simulation, and
   GPS validation logic.
   Depends on: storage.js (for data)
   ============================================ */

export const AttendanceMethods = {
  quickCheckin() {
    const btn = document.getElementById("quickFingerprintBtn");
    const result = document.getElementById("quickCheckinResult");

    btn.classList.add("scanning");
    result.textContent = "Scanning...";
    result.style.color = "";

    setTimeout(() => {
      btn.classList.remove("scanning");
      this.processQuickCheckin();
    }, 1500);
  },

  processQuickCheckin() {
    const users = JSON.parse(localStorage.getItem("bravewood_users") || "[]");
    const attendance = JSON.parse(
      localStorage.getItem("bravewood_attendance") || "[]",
    );
    const rules = JSON.parse(localStorage.getItem("bravewood_rules") || "{}");

    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);

    const eligibleStaff = users.filter(
      (u) => u.systemRole === "STAFF" && u.fingerprint_registered,
    );
    if (eligibleStaff.length === 0) {
      document.getElementById("quickCheckinResult").textContent =
        "No staff with fingerprint registered";
      document.getElementById("quickCheckinResult").style.color =
        "var(--danger)";
      return;
    }

    const staff =
      eligibleStaff[Math.floor(Math.random() * eligibleStaff.length)];
    const alreadyCheckedIn = attendance.some(
      (a) => a.staffId === staff.staffId && a.date === today,
    );

    if (alreadyCheckedIn) {
      document.getElementById("quickCheckinResult").textContent =
        `${staff.name} already checked in today`;
      document.getElementById("quickCheckinResult").style.color =
        "var(--warning)";
      return;
    }

    const workStart = rules.workStartTime || "09:00";
    const gracePeriod = rules.gracePeriod || 15;
    const workStartMinutes = this.timeToMinutes(workStart);
    const currentMinutes = this.timeToMinutes(currentTime);
    const status =
      currentMinutes <= workStartMinutes + gracePeriod ? "ON_TIME" : "LATE";

    attendance.push({
      id: Date.now().toString(),
      staffId: staff.staffId,
      date: today,
      time: currentTime,
      status,
    });
    localStorage.setItem("bravewood_attendance", JSON.stringify(attendance));

    document.getElementById("quickCheckinResult").textContent =
      `${staff.name} - ${status === "ON_TIME" ? "On Time" : "Late"}`;
    document.getElementById("quickCheckinResult").style.color =
      status === "ON_TIME" ? "var(--success)" : "var(--warning)";
    this.logAudit(
      "CHECKIN",
      `${staff.name} checked in at ${currentTime} - ${status}`,
    );
    this.loadDashboard();
  },

  async simulateFingerprintScan() {
    const btn = document.getElementById("fingerprintBtn");
    const status = document.getElementById("checkinStatus");
    const nameEl = document.getElementById("checkinName");
    const gpsStatus = document.getElementById("gpsStatus");

    btn.classList.add("scanning");
    status.textContent = "Scanning...";
    status.style.color = "";
    nameEl.textContent = "";

    const rules = JSON.parse(localStorage.getItem("bravewood_rules") || "{}");

    if (rules.gpsEnabled) {
      gpsStatus.textContent = "Checking location...";
      try {
        const position = await this.getCurrentPosition();
        const distance = this.calculateDistance(
          position.coords.latitude,
          position.coords.longitude,
          rules.officeLat,
          rules.officeLng,
        );
        if (distance > rules.allowedRadius) {
          btn.classList.remove("scanning");
          status.textContent = "Outside office radius";
          status.style.color = "var(--danger)";
          gpsStatus.textContent = `Distance: ${Math.round(distance)}m (max: ${rules.allowedRadius}m)`;
          gpsStatus.style.color = "var(--danger)";
          return;
        }
        gpsStatus.textContent = `Location verified (${Math.round(distance)}m)`;
        gpsStatus.style.color = "var(--success)";
      } catch (error) {
        btn.classList.remove("scanning");
        status.textContent = "GPS required";
        status.style.color = "var(--danger)";
        gpsStatus.textContent = "Unable to get location";
        gpsStatus.style.color = "var(--danger)";
        return;
      }
    }

    setTimeout(() => {
      btn.classList.remove("scanning");
      this.processCheckIn();
    }, 2000);
  },

  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
  },

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const phi1 = (lat1 * Math.PI) / 180,
      phi2 = (lat2 * Math.PI) / 180;
    const dphi = ((lat2 - lat1) * Math.PI) / 180,
      dlambda = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dphi / 2) * Math.sin(dphi / 2) +
      Math.cos(phi1) *
        Math.cos(phi2) *
        Math.sin(dlambda / 2) *
        Math.sin(dlambda / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },

  processCheckIn() {
    const users = JSON.parse(localStorage.getItem("bravewood_users") || "[]");
    const attendance = JSON.parse(
      localStorage.getItem("bravewood_attendance") || "[]",
    );
    const rules = JSON.parse(localStorage.getItem("bravewood_rules") || "{}");

    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);

    const eligibleStaff = users.filter(
      (u) => u.systemRole === "STAFF" && u.fingerprint_registered,
    );
    if (eligibleStaff.length === 0) {
      document.getElementById("checkinStatus").textContent =
        "No staff with fingerprint";
      document.getElementById("checkinStatus").style.color = "var(--danger)";
      return;
    }

    const staff =
      eligibleStaff[Math.floor(Math.random() * eligibleStaff.length)];
    const alreadyCheckedIn = attendance.some(
      (a) => a.staffId === staff.staffId && a.date === today,
    );

    if (alreadyCheckedIn) {
      document.getElementById("checkinStatus").textContent =
        `${staff.name} already checked in`;
      document.getElementById("checkinStatus").style.color = "var(--warning)";
      return;
    }

    const workStart = rules.workStartTime || "09:00";
    const gracePeriod = rules.gracePeriod || 15;
    const workStartMinutes = this.timeToMinutes(workStart);
    const currentMinutes = this.timeToMinutes(currentTime);
    const status =
      currentMinutes <= workStartMinutes + gracePeriod ? "ON_TIME" : "LATE";

    attendance.push({
      id: Date.now().toString(),
      staffId: staff.staffId,
      date: today,
      time: currentTime,
      status,
    });
    localStorage.setItem("bravewood_attendance", JSON.stringify(attendance));

    document.getElementById("checkinName").textContent =
      staff.name.toUpperCase();
    document.getElementById("checkinStatus").textContent =
      status === "ON_TIME" ? "On Time" : "Late";
    document.getElementById("checkinStatus").style.color =
      status === "ON_TIME" ? "var(--success)" : "var(--warning)";
    this.logAudit(
      "CHECKIN",
      `${staff.name} checked in at ${currentTime} - ${status}`,
    );
  },

  timeToMinutes(time) {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  },
};
