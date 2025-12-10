CREATE TABLE IF NOT EXISTS user_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB DEFAULT '{}',
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pwa_installations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_agent TEXT,
    platform VARCHAR(50),
    is_standalone BOOLEAN DEFAULT false
);

-- 2. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON user_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_event_type ON user_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_user_analytics_created_at ON user_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pwa_installations_user_id ON pwa_installations(user_id);

-- 3. ENABLE RLS
ALTER TABLE user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE pwa_installations ENABLE ROW LEVEL SECURITY;

-- 4. CREATE POLICIES
DROP POLICY IF EXISTS "Users can insert own analytics" ON user_analytics;
DROP POLICY IF EXISTS "Admin can read all analytics" ON user_analytics;
DROP POLICY IF EXISTS "Users can insert own PWA installation" ON pwa_installations;
DROP POLICY IF EXISTS "Admin can read all PWA installations" ON pwa_installations;

CREATE POLICY "Users can insert own analytics" ON user_analytics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own PWA installation" ON pwa_installations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can read all analytics" ON user_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (auth.users.raw_user_meta_data->>'is_admin')::boolean = true
        )
    );

CREATE POLICY "Admin can read all PWA installations" ON pwa_installations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (auth.users.raw_user_meta_data->>'is_admin')::boolean = true
        )
    );

-- 5. CREATE FUNCTIONS
CREATE OR REPLACE FUNCTION get_active_users_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    active_count INTEGER;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND (raw_user_meta_data->>'is_admin')::boolean = true
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin only';
    END IF;

    SELECT COUNT(DISTINCT user_id) INTO active_count
    FROM user_analytics
    WHERE event_type = 'login'
    AND created_at >= NOW() - INTERVAL '24 hours';

    RETURN active_count;
END;
$$;

CREATE OR REPLACE FUNCTION get_total_users_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_count INTEGER;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND (raw_user_meta_data->>'is_admin')::boolean = true
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin only';
    END IF;

    SELECT COUNT(*) INTO total_count
    FROM auth.users;

    RETURN total_count;
END;
$$;

CREATE OR REPLACE FUNCTION get_pwa_installations_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    pwa_count INTEGER;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND (raw_user_meta_data->>'is_admin')::boolean = true
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin only';
    END IF;

    SELECT COUNT(DISTINCT user_id) INTO pwa_count
    FROM pwa_installations;

    RETURN pwa_count;
END;
$$;

-- 6. GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION get_active_users_count() TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_users_count() TO authenticated;
GRANT EXECUTE ON FUNCTION get_pwa_installations_count() TO authenticated;

-- DONE! Now refresh your admin dashboard page.
