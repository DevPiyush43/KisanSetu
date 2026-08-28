-- Migration: Add payment milestone fields
-- Run this in Supabase SQL Editor

ALTER TABLE payments ADD COLUMN IF NOT EXISTS milestone text DEFAULT 'advance_paid';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS transaction_id text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS advance_amount numeric DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS advance_paid_at timestamptz;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS full_payment_at timestamptz;

CREATE TABLE IF NOT EXISTS payment_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  payment_id uuid REFERENCES payments(id),
  event_type text NOT NULL,
  actor_id uuid REFERENCES profiles(id),
  amount numeric,
  note text,
  created_at timestamptz DEFAULT now()
);

-- RLS for payment_events
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_events_select" ON payment_events
  FOR SELECT USING (true);

CREATE POLICY "payment_events_insert" ON payment_events
  FOR INSERT WITH CHECK (true);
