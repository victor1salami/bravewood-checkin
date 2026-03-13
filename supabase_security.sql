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
ON profiles FOR UPDATE USING (auth.uid() = id);

-- Attendance
CREATE POLICY "Users can view own attendance" 
ON attendance FOR SELECT USING (auth.uid()::text = staff_id);

CREATE POLICY "Admins can view all attendance" 
ON attendance FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.system_role IN ('ADMIN', 'SUPER_ADMIN')
  )
);

-- TO THE USER: 
-- To fully secure this, we need to switch from manual password management to Supabase Auth.
-- This SQL provides the foundation, but the application code needs to call `supabase.auth.signInWithPassword`.
