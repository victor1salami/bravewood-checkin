/* ============================================
   config.js
   Application configuration, constants, and
   Supabase/API settings
   ============================================ */

export const AppConfig = {
  // Security questions for password recovery
  securityQuestions: [
    "What is your mother's maiden name?",
    "What was the name of your first pet?",
    "What city were you born in?",
    "What is your favorite color?",
    "What was your childhood nickname?",
    "What is the name of your favorite teacher?",
    "What was your first car?",
  ],

  // Default organizational structure
  defaultDepartments: [
    "HR",
    "IT",
    "Finance",
    "Operations",
    "Sales",
    "Marketing",
  ],
  defaultRoles: [
    "Intern",
    "Junior Staff",
    "Staff",
    "Senior Staff",
    "Team Lead",
    "Supervisor",
    "Assistant Manager",
    "Manager",
    "Senior Manager",
    "Director",
    "VP",
    "C-Level",
  ],

  // API configuration for cross-device synchronization
  // Falls back to localStorage if API is unavailable
  api: {
    baseUrl: "https://api.bravewood.app/v1",
    enabled: false,
    timeout: 5000,
  },

  // Supabase configuration for cross-device sync
  supabase: {
    enabled: false, // Set to true once credentials are updated
    url: "https://jxjrvvxvxhvbtkwamnrf.supabase.co",
    anonKey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4anJ2dnh2eGh2YnRrd2FtbnJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDg4MzQsImV4cCI6MjA4ODYyNDgzNH0.2XiHrYVD-1RIU3xIugJJ39iEtS-7xlNzcGs10eSIrbE",
  },
};
