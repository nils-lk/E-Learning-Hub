-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.smtp_settings (
  id INT PRIMARY KEY DEFAULT 1,
  host TEXT,
  port TEXT,
  sender_name TEXT,
  username TEXT,
  password TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Enable RLS
ALTER TABLE public.smtp_settings ENABLE ROW LEVEL SECURITY;

-- 3. Drop any existing policy with this name to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated full access to smtp_settings" ON public.smtp_settings;

-- 4. Create the fully permissive policy for logged in users
CREATE POLICY "Allow authenticated full access to smtp_settings" 
ON public.smtp_settings 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);
