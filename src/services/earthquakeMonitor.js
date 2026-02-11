/**
 * P2PQuake 地震情報監視サービス
 * P2PQuake JSON API v2から地震情報を取得し、Supabaseに保存
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// 設定
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const P2P_QUAKE_API = 'https://api.p2pquake.net/v2/history';
const CHECK_INTERVAL = 10000; // 10秒ごとにチェック

// Supabaseクライアント
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 最後にチェックしたタイムスタンプ
let lastCheckedTime = new Date();

/**
 * 震度を文字列に変換
 */
const convertScale = (scale) => {
  const scaleMap = {
    10: '1',
    20: '2',
    30: '3',
    40: '4',
    45: '5弱',
    50: '5強',
    55: '6弱',
    60: '6強',
    70: '7'
  };
  return scaleMap[scale] || scale.toString();
};

/**
 * 地震情報を取得
 */
const fetchEarthquakeInfo = async () => {
  try {
    const response = await fetch(`${P2P_QUAKE_API}?codes=551&limit=1`);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.length === 0) {
      console.log('地震情報なし');
      return null;
    }
    
    return data[0];
  } catch (error) {
    console.error('地震情報取得エラー:', error);
    return null;
  }
};

/**
 * 震度5弱以上の地震かチェック
 */
const isSignificantEarthquake = (quakeData) => {
  if (!quakeData || !quakeData.earthquake) {
    return false;
  }
  
  const maxScale = quakeData.earthquake.maxScale;
  // 震度5弱(45)以上
  return maxScale >= 45;
};

/**
 * 災害情報をSupabaseに保存
 */
const saveDisasterStatus = async (quakeData) => {
  try {
    const earthquake = quakeData.earthquake;
    const maxScale = convertScale(earthquake.maxScale);
    const hypocenter = earthquake.hypocenter.name;
    const magnitude = earthquake.hypocenter.magnitude;
    const time = quakeData.earthquake.time;
    
    // メッセージ作成
    const message = `${hypocenter}で地震が発生しました。最大震度${maxScale}、M${magnitude}`;
    
    console.log('災害情報を保存:', message);
    
    // 既存のアクティブな地震情報をチェック
    const { data: existingData, error: checkError } = await supabase
      .from('disaster_status')
      .select('*')
      .eq('is_active', true)
      .eq('disaster_type', '地震');
    
    if (checkError) {
      console.error('既存データチェックエラー:', checkError);
    }
    
    // 既にアクティブな地震情報がある場合はスキップ
    if (existingData && existingData.length > 0) {
      console.log('既にアクティブな地震情報が存在します');
      return;
    }
    
    // 新しい災害情報を挿入
    const { data, error } = await supabase
      .from('disaster_status')
      .insert({
        is_active: true,
        disaster_type: '地震',
        message: message,
        activated_by: 'P2PQuake API',
        activated_at: new Date(time).toISOString(),
      });
    
    if (error) {
      console.error('Supabase保存エラー:', error);
    } else {
      console.log('✅ 災害情報を保存しました:', message);
    }
  } catch (error) {
    console.error('災害情報保存エラー:', error);
  }
};

/**
 * 地震情報をチェック
 */
const checkEarthquake = async () => {
  console.log('地震情報をチェック中...', new Date().toISOString());
  
  const quakeData = await fetchEarthquakeInfo();
  
  if (!quakeData) {
    return;
  }
  
  // 発生時刻をチェック
  const quakeTime = new Date(quakeData.earthquake.time);
  
  // 最後のチェック時刻より新しい地震情報のみ処理
  if (quakeTime > lastCheckedTime) {
    console.log('新しい地震情報を検出:', quakeData.earthquake);
    
    // 震度5弱以上の場合のみ通知
    if (isSignificantEarthquake(quakeData)) {
      console.log('⚠️ 震度5弱以上の地震を検出');
      await saveDisasterStatus(quakeData);
    } else {
      const maxScale = convertScale(quakeData.earthquake.maxScale);
      console.log(`震度${maxScale}の地震 - 通知対象外`);
    }
    
    lastCheckedTime = quakeTime;
  }
};

/**
 * 監視を開始
 */
const startMonitoring = () => {
  console.log('🌍 P2PQuake 地震情報監視サービスを開始します');
  console.log(`チェック間隔: ${CHECK_INTERVAL / 1000}秒`);
  console.log(`監視対象: 震度5弱以上の地震`);
  
  // 環境変数チェック
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Supabase環境変数が設定されていません');
    console.error('EXPO_PUBLIC_SUPABASE_URL と EXPO_PUBLIC_SUPABASE_ANON_KEY を設定してください');
    process.exit(1);
  }
  
  // 初回チェック
  checkEarthquake();
  
  // 定期チェック
  setInterval(checkEarthquake, CHECK_INTERVAL);
};

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  console.log('\n地震情報監視サービスを停止します');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n地震情報監視サービスを停止します');
  process.exit(0);
});

// サービス開始
if (require.main === module) {
  startMonitoring();
}

module.exports = { checkEarthquake, startMonitoring };
