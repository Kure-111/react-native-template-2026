-- 通知関連テーブルのRLSを無効化

DROP POLICY IF EXISTS push_subscriptions_select_own ON public.push_subscriptions;
DROP POLICY IF EXISTS push_subscriptions_insert_own ON public.push_subscriptions;
DROP POLICY IF EXISTS push_subscriptions_update_own ON public.push_subscriptions;
DROP POLICY IF EXISTS push_subscriptions_delete_own ON public.push_subscriptions;

DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
DROP POLICY IF EXISTS notifications_insert_admin ON public.notifications;

DROP POLICY IF EXISTS notification_recipients_select_own ON public.notification_recipients;
DROP POLICY IF EXISTS notification_recipients_insert_admin ON public.notification_recipients;
DROP POLICY IF EXISTS notification_recipients_update_own ON public.notification_recipients;

ALTER TABLE IF EXISTS public.push_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notification_recipients DISABLE ROW LEVEL SECURITY;
