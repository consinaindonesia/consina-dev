GRANT SELECT ON public.products TO authenticated;
GRANT SELECT ON public.categories TO authenticated;
GRANT SELECT ON public.product_categories TO authenticated;
GRANT SELECT ON public.product_images TO authenticated;
GRANT SELECT ON public.product_variants TO authenticated;
GRANT SELECT ON public.product_size_variants TO authenticated;
GRANT ALL ON public.products TO service_role;
GRANT ALL ON public.categories TO service_role;
GRANT ALL ON public.product_categories TO service_role;
GRANT ALL ON public.product_images TO service_role;
GRANT ALL ON public.product_variants TO service_role;
GRANT ALL ON public.product_size_variants TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'products'
      AND policyname = 'staff read all products'
  ) THEN
    CREATE POLICY "staff read all products"
      ON public.products
      FOR SELECT
      TO authenticated
      USING (public.is_admin_or_editor());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'categories'
      AND policyname = 'staff read all categories'
  ) THEN
    CREATE POLICY "staff read all categories"
      ON public.categories
      FOR SELECT
      TO authenticated
      USING (public.is_admin_or_editor());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'product_categories'
      AND policyname = 'staff read all product categories'
  ) THEN
    CREATE POLICY "staff read all product categories"
      ON public.product_categories
      FOR SELECT
      TO authenticated
      USING (public.is_admin_or_editor());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'product_images'
      AND policyname = 'staff read all product images'
  ) THEN
    CREATE POLICY "staff read all product images"
      ON public.product_images
      FOR SELECT
      TO authenticated
      USING (public.is_admin_or_editor());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'product_variants'
      AND policyname = 'staff read all product variants'
  ) THEN
    CREATE POLICY "staff read all product variants"
      ON public.product_variants
      FOR SELECT
      TO authenticated
      USING (public.is_admin_or_editor());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'product_size_variants'
      AND policyname = 'staff read all product size variants'
  ) THEN
    CREATE POLICY "staff read all product size variants"
      ON public.product_size_variants
      FOR SELECT
      TO authenticated
      USING (public.is_admin_or_editor());
  END IF;
END $$;