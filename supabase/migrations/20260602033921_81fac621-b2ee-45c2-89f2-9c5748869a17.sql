
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_provider text NOT NULL DEFAULT 'bank_transfer',
  ADD COLUMN IF NOT EXISTS midtrans_transaction_status text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  provider text NOT NULL,
  transaction_id text,
  transaction_status text,
  fraud_status text,
  signature_key text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_order ON public.payment_events(order_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_events_txn_status
  ON public.payment_events(transaction_id, transaction_status)
  WHERE transaction_id IS NOT NULL;

GRANT SELECT ON public.payment_events TO authenticated;
GRANT ALL ON public.payment_events TO service_role;

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read payment_events"
  ON public.payment_events FOR SELECT
  TO authenticated
  USING (is_admin_or_editor());
