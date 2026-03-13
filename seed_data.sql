-- Seed Data for Bravewood Check-in

-- 
-- 1. Departments Seed
-- 
INSERT INTO departments (name) VALUES 
('Engineering'),
('Design'),
('Marketing'),
('Operations'),
('Human Resources'),
('Finance'),
('IT')
ON CONFLICT (name) DO NOTHING;

-- 
-- 2. Roles Seed
-- 
INSERT INTO roles (name) VALUES 
('Senior Developer'),
('Junior Developer'),
('Product Manager'),
('UI/UX Designer'),
('Marketing Specialist'),
('Operations Manager'),
('HR Specialist'),
('Accountant'),
('Staff'),
('Manager'),
('C-Level')
ON CONFLICT (name) DO NOTHING;

-- 
-- 3. Initial Admins and Demo Staff
-- 
INSERT INTO profiles 
("staffId", "password", "name", "systemRole", "department", "departmentRole", "passwordCreated", "securityQuestion", "securityAnswer", "email")
VALUES 
('superadmin', 'admin123', 'Super Admin', 'SUPER_ADMIN', 'IT', 'C-Level', true, 'What city were you born in?', 'lagos', 'superadmin@bravewood.com'),
('admin001', 'admin001', 'John Admin', 'ADMIN', 'Human Resources', 'Manager', true, 'What is your mother''s maiden name?', 'smith', 'john@bravewood.com'),
('staff001', 'staff001', 'Mike Johnson', 'STAFF', 'IT', 'Senior Staff', true, 'What city were you born in?', 'lagos', 'mike@bravewood.com'),
('staff002', 'staff002', 'Emily Davis', 'STAFF', 'Human Resources', 'Staff', true, 'What is your favorite color?', 'blue', 'emily@bravewood.com')
ON CONFLICT ("staffId") DO UPDATE SET
    "systemRole" = EXCLUDED."systemRole",
    "department" = EXCLUDED."department",
    "departmentRole" = EXCLUDED."departmentRole";

-- 
-- 4. Initial System Rules
-- 
INSERT INTO system_rules (key, value) VALUES 
('rules', '{
    "workStartTime": "09:00",
    "gracePeriod": 15,
    "workDays": ["Mon", "Tue", "Wed", "Thu", "Fri"],
    "officeLat": 40.7128,
    "officeLng": -74.006,
    "allowedRadius": 100,
    "gpsEnabled": false
}'::jsonb),
('departments', '["Engineering", "Design", "Marketing", "Operations", "Human Resources", "Finance", "IT"]'::jsonb),
('roles', '["Senior Developer", "Junior Developer", "Product Manager", "UI/UX Designer", "Marketing Specialist", "Operations Manager", "HR Specialist", "Accountant", "Staff", "Manager", "C-Level"]'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
