-- Savings Goals Table Schema
CREATE TABLE IF NOT EXISTS savings_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- Format: YYYY-MM
  target_type TEXT NOT NULL CHECK (target_type IN ('percentage', 'fixed')),
  target_value DECIMAL(15, 2) NOT NULL, -- Percentage (0-100) or fixed amount
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, month)
);

-- Enable RLS
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own savings goals" ON savings_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own savings goals" ON savings_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own savings goals" ON savings_goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own savings goals" ON savings_goals
  FOR DELETE USING (auth.uid() = user_id);
