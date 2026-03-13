# Bravewood Staff Check-in System

## Description
The Bravewood Staff Check-in System is a professional attendance and organizational management platform. It solves the challenge of distributed staff tracking by providing a real-time, cloud-synchronized dashboard. Originally a local-first application, it has been architected to primary Supabase integration to ensure data integrity across multiple devices and production reliability.

---

## Table of Contents
1. [Features](#features)
2. [Project Structure](#project-structure)
3. [Installation and Setup](#installation-and-setup)
4. [Usage Examples](#usage-examples)
5. [Configuration](#configuration)
6. [API Reference](#api-reference)
7. [Contributing Guidelines](#contributing-guidelines)
8. [Troubleshooting and FAQ](#troubleshooting-and-faq)
9. [License](#license)

---

## Features
- Real-time attendance tracking with status classification (On-time, Late, Absent).
- Geolocation-aware check-ins with radius validation.
- Comprehensive department and role management infrastructure.
- Interactive analytics dashboard for attendance trends.
- Automated audit logging for all critical system actions.
- Multi-tier storage hierarchy (Supabase -> Legacy API -> LocalStorage).

---

## Project Structure
```yaml
project_root:
  assets/: "Static media and images"
  css/:
    variables.css: "Predefined design tokens and CSS variables"
  js/:
    app.js: "Main application entry point using Object Mixin pattern"
    storage.js: "Asynchronous data layer and Supabase integration"
    auth.js: "Security, session management and authentication logic"
    staff.js: "Staff profile and lifecycle management"
    attendance.js: "Core check-in and check-out logic"
    admin.js: "Administrative controls for departments and roles"
    config.js: "Global configuration constants and API keys"
    ui.js: "DOM manipulation and navigation logic"
    dashboard.js: "Chart rendering and statistics calculation"
    reports.js: "Data export and reporting logic"
  index.html: "Single Page Application (SPA) structure"
  schema.sql: "PostgreSQL database schema for Supabase"
  seed_data.sql: "Initialization script for roles, departments and admins"
  supabase_security.sql: "Template logic for Row Level Security (RLS)"
```

---

## Installation and Setup

### Prerequisites
- Modern web browser.
- Local development server (e.g., Live Server, Nginx, or Apache).
- Supabase Project and credentials.

### Step-by-Step Installation
1. Clone the repository to your local development environment.
2. Initialize the Database:
   - Navigate to the Supabase SQL Editor.
   - Execute the contents of `schema.sql` to establish the table hierarchy.
   - Execute the contents of `seed_data.sql` to populate default roles and the master administrator account.
3. Configure Connectivity:
   - Open `js/config.js`.
   - Update the `supabase` object with your Project URL and Anon Key.
   - Set `enabled: true` within the same object.
4. Launch:
   - Serve the project folder using your local server.
   - Navigate to the local URL (e.g., `http://127.0.0.1:5500`).

---

## Usage Examples

### Staff Onboarding
Administrators can navigate to the Staff Management section to create new profiles. These profiles are automatically synced to the Supabase `profiles` table.

### Daily Check-in
Staff members enter their Staff ID on the check-in screen. The system validates their location against the `system_rules` table and records the entry in the `attendance` table.

---

## Configuration
The system centralizes settings in `js/config.js`.

| Category | Parameter | Description |
| :--- | :--- | :--- |
| Supabase | `url` | Your Supabase project endpoint. |
| Supabase | `anonKey` | Public API key for client-side queries. |
| Supabase | `enabled` | Master toggle for cloud synchronization. |
| Rules | `workStartTime` | Standard company start time (default 09:00). |
| Rules | `gracePeriod` | Minutes allowed after start time before being marked late. |

---

## API Reference

### Storage Layer (`storage.js`)
- `storageGet(key)`: Returns a promise resolving to data from Supabase or fallback sources.
- `storageSet(key, value)`: Asynchronously persists data to the relational backend.
- `getUsers()` / `setUsers(users)`: Helper methods specifically for profile management.

### Authentication (`auth.js`)
- `login(staffId, password)`: Validates credentials and establishes a session.
- `checkSession()`: Restores login state from persistent storage on reload.

---

## Contributing Guidelines
1. Maintain the Object Mixin pattern when adding new features.
2. Ensure all data-related operations are `async/await` compliant.
3. Use the `js/config.js` file for all hardcoded constants or default values.
4. Test cross-device synchronization before submitting changes.
5. Adhere to the imperative commit style (e.g., "Add attendance validation").

---

## Troubleshooting and FAQ

**Issue: 404 Error on 'profiles' request**
*Solution*: Ensure the `schema.sql` has been executed in the Supabase SQL Editor. The table must exist before the app can fetch data.

**Issue: Check-in fails on 'Invalid Location'**
*Solution*: Check the `system_rules` table via the Admin Settings. Ensure your current coordinates are within the `allowedRadius` of the `officeLat`/`officeLng`.

---

