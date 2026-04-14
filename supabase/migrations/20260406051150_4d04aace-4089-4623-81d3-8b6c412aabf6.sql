
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create ads table
CREATE TABLE public.ads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    ad_title text NOT NULL,
    description text,
    image_url text,
    placement text NOT NULL DEFAULT 'in-feed',
    duration_days integer NOT NULL DEFAULT 1,
    budget integer NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'pending',
    payment_status text NOT NULL DEFAULT 'unpaid',
    payment_id text,
    starts_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- RLS for ads
CREATE POLICY "Anyone can view active ads" ON public.ads FOR SELECT USING (status = 'active' OR auth.uid() = user_id);
CREATE POLICY "Users can create own ads" ON public.ads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ads" ON public.ads FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ads" ON public.ads FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all ads" ON public.ads FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create ad_analytics table
CREATE TABLE public.ad_analytics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id uuid REFERENCES public.ads(id) ON DELETE CASCADE NOT NULL,
    event_type text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ad owners can view analytics" ON public.ad_analytics FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.ads WHERE ads.id = ad_id AND ads.user_id = auth.uid()));
CREATE POLICY "Anyone can insert analytics" ON public.ad_analytics FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all analytics" ON public.ad_analytics FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at on ads
CREATE TRIGGER update_ads_updated_at BEFORE UPDATE ON public.ads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for ad images
INSERT INTO storage.buckets (id, name, public) VALUES ('ad-images', 'ad-images', true);

-- Storage RLS for ad-images
CREATE POLICY "Anyone can view ad images" ON storage.objects FOR SELECT USING (bucket_id = 'ad-images');
CREATE POLICY "Authenticated users can upload ad images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ad-images');
CREATE POLICY "Users can delete own ad images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'ad-images' AND (storage.foldername(name))[1] = auth.uid()::text);
