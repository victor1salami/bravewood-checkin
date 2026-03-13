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

-- Everyone can select rules (Essential for app configuration)
CREATE POLICY "Allow public read access to system_rules" 
ON system_rules FOR SELECT USING (true);

-- Everyone can view lookup tables
CREATE POLICY "Allow public read access to departments" 
ON departments FOR SELECT USING (true);

CREATE POLICY "Allow public read access to roles" 
ON roles FOR SELECT USING (true);

-- NOTE: These policies assume a custom claim or a specific field in the profiles table 
-- Since we are currently using the Anon key and our own password logic, RLS is limited
-- without proper Supabase Auth. 
-- For now, we will use a "Secret Header" or "Staff ID" comparison if possible, 
-- but TRUE production readiness requires Supabase Auth.

-- Example policies for when Supabase Auth is integrated:

-- Profiles
CREATE POLICY "Public profiles are viewable by everyone" 
ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE USING (true); -- Temporary until Supabase Auth is active

-- Attendance
CREATE POLICY "Users can view own attendance" 
ON attendance FOR SELECT USING (true); -- Temporary until Supabase Auth is active

CREATE POLICY "Users can insert attendance" 
ON attendance FOR INSERT WITH CHECK (true); -- Temporary until Supabase Auth is active

-- TO THE USER: 
-- These policies are currently set to "true" (Public Read/Write) because 
-- you are using custom password logic instead of Supabase Auth.
-- Once you switch to Supabase Auth (Phase 7), we will tighten these 
-- using (auth.uid() = id).
