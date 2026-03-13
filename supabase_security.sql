-- Enable Row Level Security (RLS) on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all attendance" ON attendance;
DROP POLICY IF EXISTS "Users can view own attendance" ON attendance;
DROP POLICY IF EXISTS "Admins can manage rules" ON system_rules;
DROP POLICY IF EXISTS "Everyone can select rules" ON system_rules;
DROP POLICY IF EXISTS "Allow public read access to system_rules" ON system_rules;
DROP POLICY IF EXISTS "Allow public read access to departments" ON departments;
DROP POLICY IF EXISTS "Allow public read access to roles" ON roles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own attendance" ON attendance;
DROP POLICY IF EXISTS "Users can insert attendance" ON attendance;

-- Unified Development Policies (Public Read/Write)
-- These allow the app to function with custom auth until Supabase Auth is integrated.

-- Profiles
CREATE POLICY "Public profiles are fully manageable" 
ON profiles FOR ALL USING (true) WITH CHECK (true);

-- Attendance
CREATE POLICY "Attendance is fully manageable" 
ON attendance FOR ALL USING (true) WITH CHECK (true);

-- Audit Logs
CREATE POLICY "Audit logs are fully manageable" 
ON audit_logs FOR ALL USING (true) WITH CHECK (true);

-- Lookup Tables
CREATE POLICY "Lookup tables are readable by everyone" 
ON departments FOR SELECT USING (true);

CREATE POLICY "Roles are readable by everyone" 
ON roles FOR SELECT USING (true);

-- System Rules
CREATE POLICY "System rules are readable by everyone" 
ON system_rules FOR SELECT USING (true);
