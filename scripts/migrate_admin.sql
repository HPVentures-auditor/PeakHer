-- PeakHer Admin Migration
-- Run this against your Neon database to add admin support

-- 1. Add is_admin column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. Add last_email_sent column (for tracking reminder emails)
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_email_sent TIMESTAMPTZ;

-- 3. Add email_opt_out column (for users who unsubscribe from reminders)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_opt_out BOOLEAN DEFAULT false;

-- 4. Set your admin user (replace with your actual email)
UPDATE users SET is_admin = true WHERE email = 'jairek@jairekrobbins.com';

-- 5. Index for admin queries
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users (is_admin) WHERE is_admin = true;
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkins_date ON checkins (date DESC);
CREATE INDEX IF NOT EXISTS idx_streaks_current ON streaks (current_streak DESC);
