ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_stock_status_check;
UPDATE public.products SET stock_status = 'low_stock' WHERE stock_status = 'low';
UPDATE public.products SET stock_status = 'out_of_stock' WHERE stock_status = 'out';
ALTER TABLE public.products ADD CONSTRAINT products_stock_status_check CHECK (stock_status = ANY (ARRAY['in_stock'::text, 'low_stock'::text, 'out_of_stock'::text]));