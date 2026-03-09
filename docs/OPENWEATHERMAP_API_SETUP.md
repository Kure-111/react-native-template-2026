# OpenWeatherMap API セットアップガイド

Item10実長システムでは、OpenWeatherMap APIを使用して天気情報を取得しています。

## OpenWeatherMap API とは

世界中で広く使われている天気情報APIサービスです。
無料プランで1日1,000回までのリクエストが可能で、詳細な天気情報（降水量含む）を取得できます。

## セットアップ手順

### 1. OpenWeatherMapアカウントの作成

1. [OpenWeatherMap](https://openweathermap.org/)にアクセス
2. 画面右上の「Sign In」をクリック
3. 「Create an Account」をクリック
4. 以下の情報を入力：
   - **Username**: 任意のユーザー名
   - **Email**: メールアドレス
   - **Password**: パスワード（8文字以上）
5. 利用規約に同意して「Create Account」をクリック
6. 登録したメールアドレスに確認メールが届くので、リンクをクリックして認証

### 2. API キーの取得

1. [OpenWeatherMap](https://openweathermap.org/)にログイン
2. 画面右上のユーザー名をクリック → 「My API keys」を選択
3. 「Key」欄にデフォルトのAPIキーが表示されています
4. このAPIキーをコピー

**注意**: APIキーは作成直後は有効化されていません。通常、10分〜2時間程度で有効化されます。

### 3. 環境変数の設定

プロジェクトルートの `.env` ファイルに以下を追加：

```env
OPENWEATHERMAP_API_KEY=your_api_key_here
```

**例:**
```env
OPENWEATHERMAP_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

## API仕様

### エンドポイント

#### 現在の天気情報
```
https://api.openweathermap.org/data/2.5/weather
```

#### 5日間の天気予報（3時間ごと）
```
https://api.openweathermap.org/data/2.5/forecast
```

### リクエストパラメータ

| パラメータ | 必須 | 説明 |
|----------|------|------|
| lat | ○ | 緯度（例: 34.6913） |
| lon | ○ | 経度（例: 135.7005） |
| appid | ○ | APIキー |
| units | - | 単位（metric=摂氏、imperial=華氏、デフォルト=ケルビン） |
| lang | - | 言語（ja=日本語、en=英語など） |

### レスポンス例（現在の天気）

```json
{
  "weather": [
    {
      "id": 501,
      "main": "Rain",
      "description": "適度な雨",
      "icon": "10d"
    }
  ],
  "main": {
    "temp": 15.5,
    "feels_like": 14.8,
    "temp_min": 14.2,
    "temp_max": 16.8,
    "pressure": 1013,
    "humidity": 82
  },
  "rain": {
    "1h": 2.5
  },
  "wind": {
    "speed": 3.5,
    "deg": 180
  },
  "clouds": {
    "all": 75
  }
}
```

### レスポンス例（予報）

```json
{
  "list": [
    {
      "dt": 1707213600,
      "main": {
        "temp": 15.3,
        "humidity": 78
      },
      "weather": [
        {
          "main": "Rain",
          "description": "小雨"
        }
      ],
      "pop": 0.8,
      "rain": {
        "3h": 1.5
      }
    }
  ]
}
```

### 天気の種類（main）

- `Clear`: 晴れ
- `Clouds`: 曇り
- `Rain`: 雨
- `Drizzle`: 霧雨
- `Snow`: 雪
- `Thunderstorm`: 雷雨
- `Mist`: 霧
- `Smoke`: 煙霧
- `Haze`: もや
- `Fog`: 濃霧

## 利用制限

### 無料プラン（Free Plan）

- **1分あたり**: 60回のリクエスト
- **1日あたり**: 1,000回のリクエスト
- **リアルタイムデータ**: 利用可能
- **5日間予報**: 利用可能
- **歴史データ**: 利用不可

### 有料プラン

より多くのリクエストが必要な場合は、有料プランへのアップグレードも可能です。
詳細は [Pricing](https://openweathermap.org/price) を参照してください。

## トラブルシューティング

### エラー: "Invalid API key"

**原因:**
- APIキーが間違っている
- APIキーがまだ有効化されていない

**解決方法:**
1. APIキーが正しくコピーされているか確認
2. APIキー作成後、10分〜2時間待ってから再試行
3. [My API keys](https://home.openweathermap.org/api_keys)で有効化状態を確認

### エラー: "401 Unauthorized"

**原因:**
- `.env` ファイルが正しく読み込まれていない
- APIキーが設定されていない

**解決方法:**
1. `.env` ファイルが存在するか確認
2. `OPENWEATHERMAP_API_KEY` が正しく設定されているか確認
3. アプリを再起動

### エラー: "429 Too Many Requests"

**原因:**
- リクエスト制限（1分60回または1日1,000回）を超えた

**解決方法:**
1. リクエスト頻度を減らす
2. キャッシュを実装する
3. 有料プランへのアップグレードを検討

### 天気情報が取得できない

**確認項目:**

1. **APIキーの確認**
   ```bash
   # .envファイルを確認
   cat .env | grep OPENWEATHERMAP_API_KEY
   ```

2. **ブラウザでテスト**
   ```
   https://api.openweathermap.org/data/2.5/weather?lat=34.6913&lon=135.7005&appid=YOUR_API_KEY&units=metric&lang=ja
   ```

3. **エラーメッセージを確認**
   - コンソールログを確認
   - レスポンスのエラーコードを確認

### APIキーが有効化されない

**通常の有効化時間:**
- 通常: 10分〜2時間
- 最大: 24時間

**確認方法:**
1. [My API keys](https://home.openweathermap.org/api_keys)にアクセス
2. APIキーのステータスを確認
3. 「Status」が「Active」になっていれば有効化完了

## 使用例

### JavaScript での実装例

```javascript
const API_KEY = process.env.OPENWEATHERMAP_API_KEY;
const lat = 34.6913;  // 生駒市の緯度
const lon = 135.7005; // 生駒市の経度

// 現在の天気を取得
async function getCurrentWeather() {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=ja`
    );
    const data = await response.json();
    
    console.log('天気:', data.weather[0].description);
    console.log('気温:', data.main.temp, '℃');
    console.log('湿度:', data.main.humidity, '%');
    console.log('降水量:', data.rain?.['1h'] || 0, 'mm/h');
  } catch (error) {
    console.error('エラー:', error);
  }
}

getCurrentWeather();
```

## 参考リンク

- [OpenWeatherMap 公式サイト](https://openweathermap.org/)
- [API ドキュメント](https://openweathermap.org/api)
- [Current Weather API](https://openweathermap.org/current)
- [5 Day Forecast API](https://openweathermap.org/forecast5)
- [FAQ](https://openweathermap.org/faq)
- [利用規約](https://openweathermap.org/terms)

## セキュリティ注意事項

- **APIキーは公開しないでください**
  - `.env` ファイルは `.gitignore` に含める
  - GitHubなどに誤ってプッシュしない
  
- **APIキーが漏洩した場合**
  1. すぐに [My API keys](https://home.openweathermap.org/api_keys) にアクセス
  2. 漏洩したキーを削除
  3. 新しいAPIキーを作成

- **フロントエンドでの使用**
  - 可能であればバックエンド経由で取得
  - リクエスト制限を実装
  - APIキーを環境変数で管理

## まとめ

OpenWeatherMap APIは以下の特徴があります：

✅ **簡単セットアップ**: メールアドレスだけで登録可能
✅ **無料プラン**: 1日1,000回のリクエストが無料
✅ **日本語対応**: 完全日本語対応
✅ **詳細情報**: 降水量、気温、湿度など豊富な情報
✅ **世界標準**: 世界中で広く使われている信頼性の高いAPI

無料プランで十分な機能が利用できるため、個人開発やプロトタイプに最適です。
