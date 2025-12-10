-- Debts Table Schema (Utang/Piutang)
CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('debt', 'credit')), -- debt = utang, credit = piutang
  name TEXT NOT NULL, -- Nama pemberi/penerima utang
  total_amount DECIMAL(15, 2) NOT NULL, -- Jumlah total utang/piutang
  paid_amount DECIMAL(15, 2) DEFAULT 0, -- Jumlah yang sudah dibayar
  remaining_amount DECIMAL(15, 2) NOT NULL, -- Sisa utang (calculated)
  start_date DATE NOT NULL, -- Tanggal mulai utang
  due_date DATE, -- Tanggal jatuh tempo (optional)
  interest_rate DECIMAL(5, 2) DEFAULT 0, -- Bunga per tahun (optional, in percentage)
  payment_frequency TEXT CHECK (payment_frequency IN ('daily', 'weekly', 'monthly', 'yearly', 'one_time')), -- Frekuensi pembayaran
  next_payment_date DATE, -- Tanggal pembayaran berikutnya
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid', 'overdue', 'cancelled')),
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL, -- Akun yang digunakan untuk pembayaran
  notes TEXT, -- Catatan tambahan
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Debt Payments Table Schema (History pembayaran)
CREATE TABLE IF NOT EXISTS debt_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  debt_id UUID REFERENCES debts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL, -- Jumlah pembayaran
  payment_date DATE NOT NULL, -- Tanggal pembayaran
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL, -- Akun yang digunakan
  transaction_id UUID, -- Link ke transaction jika dibuat otomatis
  notes TEXT, -- Catatan pembayaran
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;

-- Policies for debts
CREATE POLICY "Users can view own debts" ON debts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own debts" ON debts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own debts" ON debts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own debts" ON debts
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for debt_payments
CREATE POLICY "Users can view own debt payments" ON debt_payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own debt payments" ON debt_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own debt payments" ON debt_payments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own debt payments" ON debt_payments
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_debts_user_status ON debts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_debts_user_type ON debts(user_id, type);
CREATE INDEX IF NOT EXISTS idx_debts_due_date ON debts(due_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON debt_payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_user_id ON debt_payments(user_id);

-- Function to update remaining_amount and status
CREATE OR REPLACE FUNCTION update_debt_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update remaining amount
  UPDATE debts
  SET remaining_amount = total_amount - paid_amount,
      updated_at = NOW()
  WHERE id = NEW.debt_id;
  
  -- Update status based on remaining amount
  UPDATE debts
  SET status = CASE
    WHEN remaining_amount <= 0 THEN 'paid'
    WHEN due_date IS NOT NULL AND due_date < CURRENT_DATE AND remaining_amount > 0 THEN 'overdue'
    ELSE 'active'
  END,
  updated_at = NOW()
  WHERE id = NEW.debt_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update debt status after payment
CREATE TRIGGER update_debt_after_payment
AFTER INSERT OR UPDATE OR DELETE ON debt_payments
FOR EACH ROW
EXECUTE FUNCTION update_debt_status();

-- Function to recalculate paid_amount from payments
CREATE OR REPLACE FUNCTION recalculate_debt_paid_amount(debt_uuid UUID)
RETURNS DECIMAL(15, 2) AS $$
DECLARE
  total_paid DECIMAL(15, 2);
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO total_paid
  FROM debt_payments
  WHERE debt_id = debt_uuid;
  
  UPDATE debts
  SET paid_amount = total_paid,
      remaining_amount = total_amount - total_paid,
      status = CASE
        WHEN total_amount - total_paid <= 0 THEN 'paid'
        WHEN due_date IS NOT NULL AND due_date < CURRENT_DATE AND total_amount - total_paid > 0 THEN 'overdue'
        ELSE 'active'
      END,
      updated_at = NOW()
  WHERE id = debt_uuid;
  
  RETURN total_paid;
END;
$$ LANGUAGE plpgsql;

