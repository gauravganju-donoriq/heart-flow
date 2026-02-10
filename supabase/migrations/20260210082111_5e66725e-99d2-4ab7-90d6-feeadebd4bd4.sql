
-- Create user_activity_log table for tracking login/logout, donor views, data exports
CREATE TABLE public.user_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

-- Internal users can view all activity logs
CREATE POLICY "Internal users can view activity logs"
  ON public.user_activity_log
  FOR SELECT
  USING (has_internal_role(auth.uid()));

-- Authenticated users can insert their own activity logs
CREATE POLICY "Users can insert own activity logs"
  ON public.user_activity_log
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for efficient querying
CREATE INDEX idx_user_activity_log_user_id ON public.user_activity_log (user_id);
CREATE INDEX idx_user_activity_log_action ON public.user_activity_log (action);
CREATE INDEX idx_user_activity_log_created_at ON public.user_activity_log (created_at DESC);
