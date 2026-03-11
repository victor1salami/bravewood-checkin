/* ============================================
   dashboard.js
   Admin dashboard rendering: stats, recent
   check-ins, and the attendance chart.
   Depends on: storage.js (for data)
   ============================================ */

export const DashboardMethods = {
  attendanceChart: null,

  loadDashboard() {
    const attendance = JSON.parse(
      localStorage.getItem("bravewood_attendance") || "[]",
    );
    const users = JSON.parse(localStorage.getItem("bravewood_users") || "[]");
    const today = new Date().toISOString().split("T")[0];

    const staffUsers = users.filter((u) => u.systemRole === "STAFF");
    const todayAttendance = attendance.filter((a) => a.date === today);

    const present = todayAttendance.filter(
      (a) => a.status === "ON_TIME",
    ).length;
    const late = todayAttendance.filter((a) => a.status === "LATE").length;
    const absent = staffUsers.length - todayAttendance.length;

    document.getElementById("statPresent").textContent = present;
    document.getElementById("statLate").textContent = late;
    document.getElementById("statAbsent").textContent = Math.max(0, absent);
    document.getElementById("statTotal").textContent = staffUsers.length;

    this.loadAttendanceChart();

    const recentCheckins = todayAttendance
      .sort((a, b) => b.time.localeCompare(a.time))
      .slice(0, 10);
    document.getElementById("recentCheckinsTable").innerHTML =
      recentCheckins
        .map((a) => {
          const staff = users.find((u) => u.staffId === a.staffId);
          return `<tr>
                <td>${staff ? staff.name : a.staffId}</td>
                <td>${staff ? staff.department || "-" : "-"}</td>
                <td>${staff ? staff.departmentRole || "-" : "-"}</td>
                <td>${a.time}</td>
                <td><span class="badge ${a.status === "ON_TIME" ? "badge-success" : "badge-warning"}">${a.status === "ON_TIME" ? "On Time" : "Late"}</span></td>
            </tr>`;
        })
        .join("") ||
      '<tr><td colspan="5" class="text-center" style="padding: 24px; color: var(--text-secondary);">No check-ins today</td></tr>';
  },

  loadAttendanceChart() {
    const attendance = JSON.parse(
      localStorage.getItem("bravewood_attendance") || "[]",
    );
    const users = JSON.parse(localStorage.getItem("bravewood_users") || "[]");
    const staffCount = users.filter((u) => u.systemRole === "STAFF").length;
    const workDays = this.getWorkDays();

    const dayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5 };
    const dayNumbers = workDays.map((d) => dayMap[d]).filter((n) => n);

    const dates = [];
    const presentData = [];
    const lateData = [];
    const absentData = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayNum = date.getDay() || 7;

      if (!dayNumbers.includes(dayNum)) continue;

      const dateStr = date.toISOString().split("T")[0];
      const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
      dates.push(dayName);

      const dayAttendance = attendance.filter((a) => a.date === dateStr);
      const present = dayAttendance.filter(
        (a) => a.status === "ON_TIME",
      ).length;
      const late = dayAttendance.filter((a) => a.status === "LATE").length;
      const absent = staffCount - dayAttendance.length;

      presentData.push(present);
      lateData.push(late);
      absentData.push(Math.max(0, absent));
    }

    const ctx = document.getElementById("attendanceChart").getContext("2d");
    const isDark =
      document.documentElement.getAttribute("data-theme") === "dark";

    if (this.attendanceChart) {
      this.attendanceChart.destroy();
    }

    this.attendanceChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: dates,
        datasets: [
          {
            label: "Present",
            data: presentData,
            backgroundColor: "#107C10",
            borderColor: "#107C10",
            borderWidth: 0,
            borderRadius: 4,
            borderSkipped: false,
          },
          {
            label: "Late",
            data: lateData,
            backgroundColor: "#E0810C",
            borderColor: "#E0810C",
            borderWidth: 0,
            borderRadius: 4,
            borderSkipped: false,
          },
          {
            label: "Absent",
            data: absentData,
            backgroundColor: "#A4262C",
            borderColor: "#A4262C",
            borderWidth: 0,
            borderRadius: 4,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            position: "top",
            labels: {
              color: isDark ? "#ffffff" : "#030940",
              font: { size: 12, weight: "600", family: "Inter" },
              usePointStyle: true,
              padding: 16,
            },
          },
          tooltip: {
            backgroundColor: isDark ? "#030940" : "#ffffff",
            titleColor: isDark ? "#ffffff" : "#030940",
            bodyColor: isDark ? "#ffffff" : "#030940",
            borderColor: "rgba(3, 9, 64, 0.2)",
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            displayColors: true,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: Math.max(1, Math.ceil(staffCount / 5)),
              color: isDark
                ? "rgba(255, 255, 255, 0.7)"
                : "rgba(3, 9, 64, 0.7)",
              font: { weight: "500", family: "Inter" },
            },
            grid: {
              color: isDark
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(3, 9, 64, 0.05)",
              drawBorder: false,
            },
          },
          x: {
            ticks: {
              color: isDark
                ? "rgba(255, 255, 255, 0.7)"
                : "rgba(3, 9, 64, 0.7)",
              font: { weight: "500", family: "Inter" },
            },
            grid: {
              display: false,
            },
          },
        },
        animation: {
          duration: 800,
          easing: "easeOutQuart",
        },
      },
    });
  },
};
