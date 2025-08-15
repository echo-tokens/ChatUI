# Database Schema Changes for R2 Trust & Engagement System

## Overview
This document outlines the database schema changes needed to implement the R2 trust and engagement features in the Echo earnings system.

## New Tables

### 1. `pop_metrics_14d` (Materialized View)
Rolling 14-day population metrics for conversion density calculations.

```sql
CREATE MATERIALIZED VIEW pop_metrics_14d AS
SELECT
  current_date AS as_of,
  sum(chat_msgs) AS c_pop,
  sum(conversions) AS v_pop,
  v_pop::numeric / nullif(c_pop,0) AS rho_pop
FROM user_daily_metrics
WHERE day >= current_date - interval '14 day';

-- Refresh schedule: */15 * * * * (every 15 minutes)
```

### 2. `user_daily_metrics` (New Table)
Daily user activity metrics for trust calculations.

```sql
CREATE TABLE user_daily_metrics (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  day DATE NOT NULL,
  chat_msgs INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  conversion_value_usd DECIMAL(10,2) DEFAULT 0,
  refunds INTEGER DEFAULT 0,
  refund_value_usd DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, day),
  INDEX idx_user_daily_metrics_user_day (user_id, day),
  INDEX idx_user_daily_metrics_day (day)
);
```

### 3. `user_trust_metrics` (Enhanced)
Extended user trust metrics table with R2 features.

```sql
-- Add new columns to existing table
ALTER TABLE user_trust_metrics
  ADD COLUMN streak_days SMALLINT DEFAULT 0,
  ADD COLUMN density_coeff NUMERIC(10,6),
  ADD COLUMN warnings JSONB DEFAULT '[]',
  ADD COLUMN hard_cut BOOLEAN DEFAULT false,
  ADD COLUMN last_chat_date DATE,
  ADD COLUMN qualified_referrals_month SMALLINT DEFAULT 0,
  ADD COLUMN referral_month_start DATE DEFAULT date_trunc('month', CURRENT_DATE);

-- Existing columns:
-- user_id, trust_level, trust_score, revenue_multiplier, 
-- base_activity_score, conversion_rate_score, account_age_score, 
-- verification_status_score, created_at, updated_at
```

### 4. `referral_codes` (New Table)
User referral codes and tracking.

```sql
CREATE TABLE referral_codes (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  short_link VARCHAR(255),
  max_uses INTEGER DEFAULT 50,
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_referral_codes_user (user_id),
  INDEX idx_referral_codes_code (code)
);
```

### 5. `referral_progress` (New Table)
Track referral progress and qualification.

```sql
CREATE TABLE referral_progress (
  id SERIAL PRIMARY KEY,
  referrer_id VARCHAR(255) NOT NULL,
  referred_id VARCHAR(255) NOT NULL,
  referral_code VARCHAR(50),
  registration_date TIMESTAMP DEFAULT NOW(),
  days_active INTEGER DEFAULT 0,
  last_active_date DATE,
  qualified BOOLEAN DEFAULT false,
  qualified_date TIMESTAMP,
  credited BOOLEAN DEFAULT false,
  credited_date TIMESTAMP,
  
  UNIQUE(referrer_id, referred_id),
  INDEX idx_referral_progress_referrer (referrer_id),
  INDEX idx_referral_progress_referred (referred_id),
  INDEX idx_referral_progress_code (referral_code)
);
```

## Modified Tables

### Enhanced `ledger` table
Add referral transaction types and new fields.

```sql
-- Add new ref_type values: 'referral'
-- No schema changes needed, just enum expansion

-- Add description field if not exists
ALTER TABLE ledger ADD COLUMN description TEXT;
```

## New Stored Procedures

### 1. Chat Streak Calculator
```sql
CREATE OR REPLACE FUNCTION update_chat_streak(user_id VARCHAR(255))
RETURNS INTEGER AS $$
DECLARE
  current_streak INTEGER := 0;
  last_chat DATE;
BEGIN
  -- Get last chat date
  SELECT last_chat_date INTO last_chat 
  FROM user_trust_metrics 
  WHERE user_id = user_id;
  
  -- Calculate streak
  IF last_chat = CURRENT_DATE - INTERVAL '1 day' THEN
    SELECT streak_days + 1 INTO current_streak
    FROM user_trust_metrics 
    WHERE user_id = user_id;
  ELSIF last_chat = CURRENT_DATE THEN
    SELECT streak_days INTO current_streak
    FROM user_trust_metrics 
    WHERE user_id = user_id;
  ELSE
    current_streak := 1;
  END IF;
  
  -- Update metrics
  UPDATE user_trust_metrics 
  SET 
    streak_days = current_streak,
    last_chat_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE user_id = user_id;
  
  RETURN current_streak;
END;
$$ LANGUAGE plpgsql;
```

### 2. Referral Qualification Checker
```sql
CREATE OR REPLACE FUNCTION check_referral_qualification(referred_user_id VARCHAR(255))
RETURNS BOOLEAN AS $$
DECLARE
  consecutive_days INTEGER := 0;
  qualified BOOLEAN := false;
BEGIN
  -- Check if user has 7 consecutive days of activity
  SELECT COUNT(*) INTO consecutive_days
  FROM user_daily_metrics
  WHERE user_id = referred_user_id
    AND day >= CURRENT_DATE - INTERVAL '7 days'
    AND chat_msgs > 0;
  
  IF consecutive_days >= 7 THEN
    qualified := true;
    
    -- Update referral progress
    UPDATE referral_progress 
    SET 
      qualified = true,
      qualified_date = NOW()
    WHERE referred_id = referred_user_id
      AND qualified = false;
  END IF;
  
  RETURN qualified;
END;
$$ LANGUAGE plpgsql;
```

### 3. Density Spike Detector
```sql
CREATE OR REPLACE FUNCTION check_density_spike(user_id VARCHAR(255))
RETURNS BOOLEAN AS $$
DECLARE
  user_rho NUMERIC;
  pop_rho NUMERIC;
  kappa NUMERIC;
  spike_detected BOOLEAN := false;
BEGIN
  -- Get population conversion rate
  SELECT rho_pop INTO pop_rho FROM pop_metrics_14d ORDER BY as_of DESC LIMIT 1;
  
  -- Get user 24h conversion rate
  SELECT 
    COALESCE(conversions::numeric / NULLIF(chat_msgs, 0), 0)
  INTO user_rho
  FROM user_daily_metrics
  WHERE user_id = user_id AND day = CURRENT_DATE;
  
  -- Calculate kappa
  kappa := user_rho / NULLIF(pop_rho, 0);
  
  -- Check for spike (κ ≥ 10)
  IF kappa >= 10 THEN
    spike_detected := true;
    
    -- Update trust metrics with hard cut
    UPDATE user_trust_metrics 
    SET 
      hard_cut = true,
      warnings = warnings || '[{"code": "DENSITY_SPIKE", "severity": "critical", "message": "Conversion rate spike detected"}]'::jsonb,
      updated_at = NOW()
    WHERE user_id = user_id;
  END IF;
  
  RETURN spike_detected;
END;
$$ LANGUAGE plpgsql;
```

## Scheduled Jobs (Cron)

### 1. Population Metrics Refresh
```bash
# Every 15 minutes
*/15 * * * * psql -d echo_db -c "REFRESH MATERIALIZED VIEW pop_metrics_14d;"
```

### 2. Daily Referral Check
```bash
# Daily at 3 AM
0 3 * * * psql -d echo_db -c "
  -- Process qualified referrals
  WITH qualified_refs AS (
    SELECT DISTINCT referrer_id, referred_id
    FROM referral_progress
    WHERE qualified = true AND credited = false
  )
  INSERT INTO ledger (user_id, amount_usd, direction, state, ref_type, description)
  SELECT 
    q.referrer_id,
    10.00,
    'credit',
    'confirmed',
    'referral',
    'Referral bonus - Friend qualified'
  FROM qualified_refs q;
  
  -- Mark as credited
  UPDATE referral_progress 
  SET credited = true, credited_date = NOW()
  WHERE qualified = true AND credited = false;
"
```

### 3. Trust Score Recalculation
```bash
# Every hour
0 * * * * psql -d echo_db -c "
  -- Recalculate trust scores for active users
  UPDATE user_trust_metrics SET
    density_coeff = (
      SELECT user_rho / NULLIF(pop_rho, 0.01)
      FROM (
        SELECT AVG(conversions::numeric / NULLIF(chat_msgs, 0)) as user_rho
        FROM user_daily_metrics
        WHERE user_id = user_trust_metrics.user_id
          AND day >= CURRENT_DATE - INTERVAL '14 days'
      ) u
      CROSS JOIN (
        SELECT rho_pop as pop_rho FROM pop_metrics_14d ORDER BY as_of DESC LIMIT 1
      ) p
    ),
    updated_at = NOW()
  WHERE updated_at < NOW() - INTERVAL '1 hour';
"
```

## Indexes for Performance

```sql
-- User activity lookups
CREATE INDEX idx_user_daily_metrics_user_recent 
ON user_daily_metrics (user_id, day DESC);

-- Trust metrics lookups
CREATE INDEX idx_user_trust_metrics_updated 
ON user_trust_metrics (updated_at);

-- Referral tracking
CREATE INDEX idx_referral_progress_qualified 
ON referral_progress (qualified, credited, qualified_date);

-- Ledger referral transactions
CREATE INDEX idx_ledger_referral 
ON ledger (ref_type, created_at) 
WHERE ref_type = 'referral';
```

## Real-time Updates (Supabase)

### Row Level Security (RLS) Policies
```sql
-- Enable RLS on new tables
ALTER TABLE user_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_trust_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_progress ENABLE ROW LEVEL SECURITY;

-- User can only see their own data
CREATE POLICY "Users can view own trust metrics" ON user_trust_metrics
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view own referral data" ON referral_codes
  FOR SELECT USING (auth.uid()::text = user_id);
```

### Real-time Subscriptions
```sql
-- Enable real-time for trust updates
ALTER PUBLICATION supabase_realtime ADD TABLE user_trust_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE referral_progress;
```

## Migration Script
```sql
-- Run this to implement all changes
BEGIN;

-- Create new tables
-- ... (all CREATE TABLE statements above)

-- Add new columns to existing tables  
-- ... (all ALTER TABLE statements above)

-- Create stored procedures
-- ... (all function definitions above)

-- Add indexes
-- ... (all index creation statements above)

-- Enable RLS and create policies
-- ... (all RLS statements above)

COMMIT;
```

## API Endpoints

The following new endpoints need to be implemented:

- `GET /v1/trust/diagnostics` - Get user trust diagnostics
- `POST /v1/referral/code` - Generate referral code
- `DELETE /v1/trust/warnings/:warningCode` - Dismiss warning
- `POST /v1/trust/refresh` - Refresh trust metrics
- `GET /v1/trust/kyc-check` - Check KYC requirements
- `WebSocket /ws/trust/updates/:userId` - Real-time trust updates

## Notes

1. All monetary amounts are stored in USD with 2 decimal precision
2. Trust scores are calculated nightly and cached for performance
3. Conversion density (κ) is recalculated every 15 minutes
4. Referral qualification checks run daily at 3 AM
5. Hard cuts (fraud protection) are applied immediately when density spikes are detected
6. All timestamps are stored in UTC
7. Indexes are optimized for the most common query patterns
8. RLS policies ensure users can only access their own data
9. Real-time subscriptions allow for live dashboard updates 