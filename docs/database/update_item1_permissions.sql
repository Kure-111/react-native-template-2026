-- 権限設定（roles.permissions）の名前更新スクリプト
-- item1 を 企画・屋台一覧 に一括置換します。

UPDATE roles
SET permissions = (
  REPLACE(
    permissions::text,
    '"item1"',
    '"企画・屋台一覧"'
  )
)::jsonb
WHERE permissions::text LIKE '%"item1"%';
