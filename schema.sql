-- Bravewood Check-in Supabase Schema
-- Run this script first to create the tables.

-- WARNING: These will delete existing data in those tables!
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS system_rules CASCADE;
DROP TABLE IF EXISTS idk CASCADE;
DROP TABLE IF EXISTS key_value_store CASCADE;

-- 1. Lookups (Departments and Roles)
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Profiles (Users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "staffId" TEXT UNIQUE NOT NULL,
    "password" TEXT, -- Current plain text storage for local mode migration
    "name" TEXT NOT NULL,
    "systemRole" TEXT DEFAULT 'STAFF',
    "department" TEXT,
    "departmentRole" TEXT,
    "workStartTime" TEXT DEFAULT '09:00',
    "fingerprint_registered" BOOLEAN DEFAULT FALSE,
    "profileImage" TEXT,
    "passwordCreated" BOOLEAN DEFAULT FALSE,
    "securityQuestion" TEXT,
    "securityAnswer" TEXT,
    "email" TEXT,
    "phone" TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Attendance
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "staffId" TEXT REFERENCES profiles("staffId"),
    "date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "time" TEXT NOT NULL,
    "status" TEXT,
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
