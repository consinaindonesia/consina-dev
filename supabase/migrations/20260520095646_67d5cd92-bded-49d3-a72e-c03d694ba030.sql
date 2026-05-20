
-- =========================================
-- 1. Role lookup helper (SECURITY DEFINER avoids RLS recursion)
-- =========================================
CREATE OR REPLACE FUNCTION public.current_admin_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.role
  FROM public.admin_users au
  WHERE au.email = (SELECT (auth.jwt() ->> 'email'))
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.current_admin_role() = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_editor()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.current_admin_role() IN ('admin','editor');
$$;

-- =========================================
-- 2. admin_users policies
-- =========================================
CREATE POLICY "admins manage admin_users"
  ON public.admin_users FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "editors read own admin row"
  ON public.admin_users FOR SELECT TO authenticated
  USING (email = (SELECT (auth.jwt() ->> 'email')));

-- =========================================
-- 3. categories / products / product_images / stores
--    Public reads active rows; admins+editors full access
-- =========================================
CREATE POLICY "public read active categories"
  ON public.categories FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "staff manage categories"
  ON public.categories FOR ALL TO authenticated
  USING (public.is_admin_or_editor()) WITH CHECK (public.is_admin_or_editor());

CREATE POLICY "public read active products"
  ON public.products FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "staff manage products"
  ON public.products FOR ALL TO authenticated
  USING (public.is_admin_or_editor()) WITH CHECK (public.is_admin_or_editor());

CREATE POLICY "public read product_images of active products"
  ON public.product_images FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.is_active = true));
CREATE POLICY "staff manage product_images"
  ON public.product_images FOR ALL TO authenticated
  USING (public.is_admin_or_editor()) WITH CHECK (public.is_admin_or_editor());

CREATE POLICY "public read active stores"
  ON public.stores FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "staff manage stores"
  ON public.stores FOR ALL TO authenticated
  USING (public.is_admin_or_editor()) WITH CHECK (public.is_admin_or_editor());

-- =========================================
-- 4. inquiries / inquiry_items
--    Public can INSERT; staff can read/manage; only admins can DELETE
-- =========================================
CREATE POLICY "public submit inquiries"
  ON public.inquiries FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "staff read inquiries"
  ON public.inquiries FOR SELECT TO authenticated USING (public.is_admin_or_editor());
CREATE POLICY "staff update inquiries"
  ON public.inquiries FOR UPDATE TO authenticated
  USING (public.is_admin_or_editor()) WITH CHECK (public.is_admin_or_editor());
CREATE POLICY "admins delete inquiries"
  ON public.inquiries FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "public submit inquiry_items"
  ON public.inquiry_items FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "staff read inquiry_items"
  ON public.inquiry_items FOR SELECT TO authenticated USING (public.is_admin_or_editor());
CREATE POLICY "staff update inquiry_items"
  ON public.inquiry_items FOR UPDATE TO authenticated
  USING (public.is_admin_or_editor()) WITH CHECK (public.is_admin_or_editor());
CREATE POLICY "admins delete inquiry_items"
  ON public.inquiry_items FOR DELETE TO authenticated USING (public.is_admin());

-- =========================================
-- 5. activity_log
-- =========================================
CREATE POLICY "admins read activity_log"
  ON public.activity_log FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "staff append activity_log"
  ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_editor());

-- =========================================
-- 6. Audit trigger - logs create/update/delete on key tables
-- =========================================
CREATE OR REPLACE FUNCTION public.log_entity_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin_id uuid;
  v_action text;
  v_entity_id uuid;
BEGIN
  SELECT id INTO v_admin_id FROM public.admin_users
    WHERE email = (SELECT (auth.jwt() ->> 'email')) LIMIT 1;

  IF TG_OP = 'INSERT' THEN v_action := 'created'; v_entity_id := NEW.id;
  ELSIF TG_OP = 'UPDATE' THEN v_action := 'updated'; v_entity_id := NEW.id;
  ELSE v_action := 'deleted'; v_entity_id := OLD.id;
  END IF;

  INSERT INTO public.activity_log (admin_user_id, action, entity_type, entity_id)
  VALUES (v_admin_id, v_action, TG_ARGV[0], v_entity_id);

  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE TRIGGER trg_audit_products
  AFTER INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_change('product');
CREATE TRIGGER trg_audit_categories
  AFTER INSERT OR UPDATE OR DELETE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_change('category');
CREATE TRIGGER trg_audit_stores
  AFTER INSERT OR UPDATE OR DELETE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_change('store');
CREATE TRIGGER trg_audit_admin_users
  AFTER INSERT OR UPDATE OR DELETE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_change('admin_user');
