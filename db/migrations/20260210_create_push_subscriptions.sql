-- Web Push購読と通知テーブルRLSの整備

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.push_subscriptions
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE IF EXISTS public.push_subscriptions
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON public.push_subscriptions (user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'push_subscriptions_user_id_fkey'
      AND conrelid = 'public.push_subscriptions'::regclass
  ) THEN
    ALTER TABLE public.push_subscriptions
      ADD CONSTRAINT push_subscriptions_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.tg_set_push_subscriptions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_push_subscriptions_updated_at ON public.push_subscriptions;

CREATE TRIGGER trg_set_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.tg_set_push_subscriptions_updated_at();

ALTER TABLE IF EXISTS public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notification_recipients ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_notification_admin(target_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    INNER JOIN public.roles r
      ON r.id = ur.role_id
    WHERE ur.user_id = target_user_id
      AND r.name = '管理者'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_notification_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_notification_admin(uuid) TO service_role;

DROP POLICY IF EXISTS push_subscriptions_select_own ON public.push_subscriptions;
DROP POLICY IF EXISTS push_subscriptions_insert_own ON public.push_subscriptions;
DROP POLICY IF EXISTS push_subscriptions_update_own ON public.push_subscriptions;
DROP POLICY IF EXISTS push_subscriptions_delete_own ON public.push_subscriptions;

CREATE POLICY push_subscriptions_select_own
ON public.push_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY push_subscriptions_insert_own
ON public.push_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY push_subscriptions_update_own
ON public.push_subscriptions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY push_subscriptions_delete_own
ON public.push_subscriptions
FOR DELETE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
DROP POLICY IF EXISTS notifications_insert_admin ON public.notifications;

CREATE POLICY notifications_select_own
ON public.notifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.notification_recipients nr
    WHERE nr.notification_id = public.notifications.id
      AND nr.user_id = auth.uid()
  )
);

CREATE POLICY notifications_insert_admin
ON public.notifications
FOR INSERT
WITH CHECK (public.is_notification_admin());

DROP POLICY IF EXISTS notification_recipients_select_own ON public.notification_recipients;
DROP POLICY IF EXISTS notification_recipients_insert_admin ON public.notification_recipients;
DROP POLICY IF EXISTS notification_recipients_update_own ON public.notification_recipients;

CREATE POLICY notification_recipients_select_own
ON public.notification_recipients
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY notification_recipients_insert_admin
ON public.notification_recipients
FOR INSERT
WITH CHECK (public.is_notification_admin());

CREATE POLICY notification_recipients_update_own
ON public.notification_recipients
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
