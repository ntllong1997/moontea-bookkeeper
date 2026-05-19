-- Moon Tea Bookkeeper — Supabase Schema
-- Run these statements in order in the Supabase SQL Editor

-- 1. Bank account connections (Plaid)
CREATE TABLE plaid_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   text,
  institution_name text,
  access_token     text NOT NULL,
  item_id          text UNIQUE NOT NULL,
  cursor           text,
  created_at       timestamptz DEFAULT now()
);

-- 2. Receipts (expense receipts uploaded by staff)
CREATE TABLE receipts (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url              text,
  location               text,
  total_amount           decimal(10,2),
  receipt_datetime       timestamptz,
  payment_method_type    text,
  payment_method_last4   text,
  ai_status              text DEFAULT 'pending',
  ai_confidence          decimal(3,2),
  raw_ocr_text           text,
  match_status           text DEFAULT 'unmatched',
  match_confidence       decimal(3,2),
  matched_transaction_id uuid,
  created_at             timestamptz DEFAULT now()
);

-- 3. Receipt line items
CREATE TABLE receipt_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id  uuid REFERENCES receipts(id) ON DELETE CASCADE,
  item_name   text,
  quantity    decimal(10,3),
  unit_price  decimal(10,2),
  line_total  decimal(10,2)
);

-- 4. Bank transactions from Plaid
CREATE TABLE bank_transactions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plaid_transaction_id  text UNIQUE NOT NULL,
  plaid_item_id         uuid REFERENCES plaid_items(id) ON DELETE CASCADE,
  account_id            text,
  amount                decimal(10,2),
  date                  date,
  raw_name              text,
  merchant_name         text,
  category              text[],
  pending               boolean DEFAULT false,
  matched_receipt_id    uuid REFERENCES receipts(id) ON DELETE SET NULL,
  custom_category       text,
  notes                 text,
  is_recurring          boolean DEFAULT false,
  created_at            timestamptz DEFAULT now()
);

-- 5. Add FK back from receipts to bank_transactions
ALTER TABLE receipts
  ADD CONSTRAINT receipts_matched_transaction_id_fkey
  FOREIGN KEY (matched_transaction_id)
  REFERENCES bank_transactions(id) ON DELETE SET NULL;

-- 6. Revenue entries (manual income logging)
CREATE TABLE revenue_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount      decimal(10,2) NOT NULL,
  date        date NOT NULL,
  description text,
  source      text,
  created_at  timestamptz DEFAULT now()
);

-- 7. Plaid account details (populated during sync)
CREATE TABLE plaid_accounts (
  account_id    text PRIMARY KEY,
  plaid_item_id uuid REFERENCES plaid_items(id) ON DELETE CASCADE,
  name          text,
  mask          text,
  type          text,
  subtype       text
);

-- 9. Indexes for common queries
CREATE INDEX idx_bank_transactions_date       ON bank_transactions(date);
CREATE INDEX idx_bank_transactions_plaid_item ON bank_transactions(plaid_item_id);
CREATE INDEX idx_receipts_match_status        ON receipts(match_status);
CREATE INDEX idx_revenue_entries_date         ON revenue_entries(date);

-- 8. Supabase Storage: create a bucket named "receipts"
-- Do this in the Supabase Dashboard > Storage > New Bucket
-- Name: receipts
-- Public: true (so Claude vision API can fetch the image URL)
