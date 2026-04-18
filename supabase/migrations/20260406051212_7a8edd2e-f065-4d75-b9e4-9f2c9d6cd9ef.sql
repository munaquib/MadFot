
DROP POLICY "Anyone can insert analytics" ON public.ad_analytics;
CREATE POLICY "Authenticated can insert analytics" ON public.ad_analytics FOR INSERT TO authenticated WITH CHECK (true);
