#!/bin/bash
# 地震情報監視サービスを起動するスクリプト

cd "$(dirname "$0")"

echo "🌍 地震情報監視サービスを起動します..."

# .envファイルの存在確認
if [ ! -f ".env" ]; then
    echo "❌ エラー: .env ファイルが見つかりません"
    exit 1
fi

# 環境変数を読み込む
export $(grep -v '^#' .env | xargs)

# 環境変数のチェック
if [ -z "$EXPO_PUBLIC_SUPABASE_URL" ] || [ -z "$EXPO_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "❌ エラー: Supabase環境変数が設定されていません"
    echo "   .env ファイルに以下を設定してください:"
    echo "   EXPO_PUBLIC_SUPABASE_URL=your-supabase-url"
    echo "   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key"
    exit 1
fi

# Node.jsのチェック
if ! command -v node &> /dev/null; then
    echo "❌ エラー: Node.jsがインストールされていません"
    exit 1
fi

# サービス起動
echo "✅ サービスを起動中..."
npm run earthquake-monitor
