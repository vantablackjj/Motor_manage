DO $$
BEGIN
    -- This is a diagnostic and fix migration
    RAISE NOTICE 'Starting 024: fix admin auth';
    
    -- 1. Check if sys_role table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sys_role') THEN
        RAISE NOTICE 'sys_role table missing! Creating it...';
        CREATE TABLE sys_role (
            id SERIAL PRIMARY KEY,
            ma_quyen VARCHAR(50) UNIQUE,
            ten_quyen VARCHAR(50) UNIQUE,
            mo_ta TEXT,
            status BOOLEAN DEFAULT TRUE,
            permissions JSONB DEFAULT '{}'
        );
    END IF;

    -- 2. Ensure columns exist in sys_role
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sys_role' AND column_name = 'ten_quyen') THEN
        ALTER TABLE sys_role ADD COLUMN ten_quyen VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sys_role' AND column_name = 'ma_quyen') THEN
        ALTER TABLE sys_role ADD COLUMN ma_quyen VARCHAR(50);
    END IF;

    -- 3. Seed ADMIN role if missing
    IF NOT EXISTS (SELECT 1 FROM sys_role WHERE ten_quyen = 'ADMIN' OR ma_quyen = 'ADMIN') THEN
        INSERT INTO sys_role (ma_quyen, ten_quyen, mo_ta) VALUES ('ADMIN', 'ADMIN', 'Administrator');
    END IF;

    -- 4. Update admin user password
    IF EXISTS (SELECT 1 FROM sys_user WHERE username = 'admin') THEN
        UPDATE sys_user 
        SET password_hash = '$2a$10$45.HQyMbisCoumk2ROITT.mZk9QFVpAqyTMVrX07PjqiwbMPoxPdS',
            status = TRUE
        WHERE username = 'admin';
    ELSE
        INSERT INTO sys_user (username, password_hash, ho_ten, status)
        VALUES ('admin', '$2a$10$45.HQyMbisCoumk2ROITT.mZk9QFVpAqyTMVrX07PjqiwbMPoxPdS', 'Administrator', TRUE);
    END IF;

    -- 5. Link admin user to role
    UPDATE sys_user
    SET role_id = (SELECT id FROM sys_role WHERE ten_quyen = 'ADMIN' OR ma_quyen = 'ADMIN' LIMIT 1)
    WHERE username = 'admin';

END $$;
