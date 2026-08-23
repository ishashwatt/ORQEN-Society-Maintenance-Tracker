INSERT INTO users (id, name, email, password_hash, role, flat_number) VALUES
('11111111-1111-1111-1111-111111111111', 'Admin User', 'admin@orqen.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW', 'ADMIN', 'ADMIN-OFFICE'),
('22222222-2222-2222-2222-222222222222', 'Rahul Sharma', 'rahul@resident.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW', 'RESIDENT', 'A-203'),
('33333333-3333-3333-3333-333333333333', 'Priya Patel', 'priya@resident.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW', 'RESIDENT', 'B-104'),
('44444444-4444-4444-4444-444444444444', 'Amit Verma', 'amit@resident.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW', 'RESIDENT', 'A-203');

INSERT INTO categories (id, name, default_sla_hours, is_active) VALUES
('c1111111-1111-1111-1111-111111111111', 'Plumbing', 24, true),
('c2222222-2222-2222-2222-222222222222', 'Electrical', 12, true),
('c3333333-3333-3333-3333-333333333333', 'Cleaning', 48, true),
('c4444444-4444-4444-4444-444444444444', 'Painting', 168, true),
('c5555555-5555-5555-5555-555555555555', 'Security', 6, true);

INSERT INTO complaints (id, resident_id, category_id, description, flat_number, priority, current_status, due_at, created_at, resolved_at) VALUES
('a0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'c1111111-1111-1111-1111-111111111111', 'Main bathroom sink pipeline leaking continuously since morning.', 'A-203', 'HIGH', 'IN_PROGRESS', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '26 hours', NULL),
('a0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'c1111111-1111-1111-1111-111111111111', 'Flush tank leaking water onto bathroom tiles.', 'A-203', 'MEDIUM', 'OPEN', NOW() + INTERVAL '18 hours', NOW() - INTERVAL '6 hours', NULL),
('a0000000-0000-0000-0000-000000000003', '44444444-4444-4444-4444-444444444444', 'c1111111-1111-1111-1111-111111111111', 'Kitchen drain clogged causing water backflow.', 'A-203', 'HIGH', 'RESOLVED', NOW() - INTERVAL '48 hours', NOW() - INTERVAL '72 hours', NOW() - INTERVAL '50 hours'),
('a0000000-0000-0000-0000-000000000004', '33333333-3333-3333-3333-333333333333', 'c2222222-2222-2222-2222-222222222222', 'Power outlet in bedroom sparking when plugging in appliances.', 'B-104', 'HIGH', 'OPEN', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '17 hours', NULL),
('a0000000-0000-0000-0000-000000000005', '33333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333', 'Garbage collection missed for 2 consecutive days on 2nd floor.', 'B-104', 'LOW', 'RESOLVED', NOW() - INTERVAL '10 hours', NOW() - INTERVAL '58 hours', NOW() - INTERVAL '20 hours');

INSERT INTO complaint_status_history (id, complaint_id, from_status, to_status, actor_id, note, created_at) VALUES
('h0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', NULL, 'OPEN', '22222222-2222-2222-2222-222222222222', 'Complaint registered by resident.', NOW() - INTERVAL '26 hours'),
('h0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'OPEN', 'IN_PROGRESS', '11111111-1111-1111-1111-111111111111', 'Technician assigned to inspect sink line.', NOW() - INTERVAL '20 hours'),
('h0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', NULL, 'OPEN', '22222222-2222-2222-2222-222222222222', 'Complaint registered by resident.', NOW() - INTERVAL '6 hours'),
('h0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', NULL, 'OPEN', '44444444-4444-4444-4444-444444444444', 'Complaint registered by resident.', NOW() - INTERVAL '72 hours'),
('h0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003', 'OPEN', 'RESOLVED', '11111111-1111-1111-1111-111111111111', 'Drain unblocked and verified clean flow.', NOW() - INTERVAL '50 hours');

INSERT INTO notices (id, title, content, is_important, created_by, created_at) VALUES
('n0000000-0000-0000-0000-000000000001', 'Scheduled Water Supply Maintenance', 'Water supply will be suspended tomorrow from 10:00 AM to 2:00 PM for tank cleaning.', true, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '1 day'),
('n0000000-0000-0000-0000-000000000002', 'Annual General Society Meeting', 'AGM is scheduled for Sunday at 11:00 AM in the Clubhouse Hall.', false, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '3 days');
