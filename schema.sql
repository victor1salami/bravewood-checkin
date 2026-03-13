-- Bravewood Check-in Supabase Schema

-- 1. Lookups (Departments and Roles)
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT auth.uid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT auth.uid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Profiles (Users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT auth.uid(),
    staff_id TEXT UNIQUE NOT NULL,
    password_hash TEXT, -- Currently stores plain text if migrating directly, but labeled for future security
    name TEXT NOT NULL,
    system_role TEXT DEFAULT 'STAFF' CHECK (system_role IN ('SUPER_ADMIN', 'ADMIN', 'STAFF')),
    department TEXT REFERENCES departments(name),
    department_role TEXT REFERENCES roles(name),
    work_start_time TIME DEFAULT '09:00',
    fingerprint_registered BOOLEAN DEFAULT FALSE,
    profile_image TEXT, -- URL or Base64
    password_created BOOLEAN DEFAULT FALSE,
    security_question TEXT,
    security_answer TEXT, -- Stored as lowercase in app
    email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Attendance
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id TEXT REFERENCES profiles(staff_id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time TIME NOT NULL DEFAULT CURRENT_TIME,
    status TEXT CHECK (status IN ('ON_TIME', 'LATE', 'ABSENT', 'EXCUSED')),
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. System Rules (Settings)
CREATE TABLE IF NOT EXISTS system_rules (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    actor_id TEXT, -- staffId of the person performing the action
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS logic (Placeholder for user to run in Supabase SQL Editor)
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
-- ... etc
