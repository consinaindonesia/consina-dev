
CREATE TABLE public.contact_inquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL CHECK (subject IN ('Product Question','Wholesale Inquiry','Press & Media','Career','Other')),
  message TEXT NOT NULL
);

ALTER TABLE public.contact_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public submit contact_inquiries"
ON public.contact_inquiries
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "staff read contact_inquiries"
ON public.contact_inquiries
FOR SELECT
TO authenticated
USING (is_admin_or_editor());

CREATE POLICY "staff update contact_inquiries"
ON public.contact_inquiries
FOR UPDATE
TO authenticated
USING (is_admin_or_editor())
WITH CHECK (is_admin_or_editor());

CREATE POLICY "admins delete contact_inquiries"
ON public.contact_inquiries
FOR DELETE
TO authenticated
USING (is_admin());
