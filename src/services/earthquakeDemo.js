/**
 * 地震発生デモスクリプト
 * Supabaseに地震情報を挿入してテストします
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const earthquakeDemo = async () => {
  console.log('🌍 地震発生デモを開始します...\n');

  // テスト用地震データ
  const testEarthquakes = [
    {
      disaster_type: '地震',
      message: '東京都で地震が発生しました。最大震度5強、M6.5',
      activated_by: 'デモシステム',
    },
    {
      disaster_type: '地震',
      message: '大阪府で地震が発生しました。最大震度6弱、M7.2',
      activated_by: 'デモシステム',
    },
    {
      disaster_type: '地震',
      message: '北海道で地震が発生しました。最大震度5弱、M5.8',
      activated_by: 'デモシステム',
    },
  ];

  console.log('📋 利用可能なデモシナリオ:');
  testEarthquakes.forEach((eq, index) => {
    console.log(`  ${index + 1}. ${eq.message}`);
  });
  console.log('  4. すべての地震を解除\n');

  // コマンドライン引数から選択
  const choice = process.argv[2] ? parseInt(process.argv[2]) : 1;

  if (choice === 4) {
    // すべての地震を解除
    console.log('🔄 すべての地震情報を解除中...\n');
    
    const { data: activeEarthquakes, error: fetchError } = await supabase
      .from('disaster_status')
      .select('*')
      .eq('is_active', true);

    if (fetchError) {
      console.error('❌ エラー:', fetchError.message);
      return;
    }

    if (!activeEarthquakes || activeEarthquakes.length === 0) {
      console.log('✅ 現在、アクティブな地震情報はありません');
      return;
    }

    console.log(`📊 ${activeEarthquakes.length}件のアクティブな地震を解除します...\n`);

    const { error: updateError } = await supabase
      .from('disaster_status')
      .update({
        is_active: false,
        deactivated_by: 'デモシステム',
        deactivated_at: new Date().toISOString(),
      })
      .eq('is_active', true);

    if (updateError) {
      console.error('❌ 解除エラー:', updateError.message);
      return;
    }

    console.log('✅ すべての地震情報を解除しました');
    console.log('📱 10秒以内にWebアプリで緊急モードが解除されます\n');
    return;
  }

  if (choice < 1 || choice > 3) {
    console.log('❌ 無効な選択です (1-4を指定してください)\n');
    return;
  }

  const selectedEarthquake = testEarthquakes[choice - 1];

  console.log(`🚨 シナリオ ${choice} を実行します:`);
  console.log(`   ${selectedEarthquake.message}\n`);

  // 既存のアクティブな地震を確認
  const { data: existingData, error: checkError } = await supabase
    .from('disaster_status')
    .select('*')
    .eq('is_active', true);

  if (checkError) {
    console.error('❌ エラー:', checkError.message);
    return;
  }

  if (existingData && existingData.length > 0) {
    console.log('⚠️  既にアクティブな地震情報が存在します:');
    existingData.forEach(eq => {
      console.log(`   - ${eq.message}`);
    });
    console.log('\n💡 先に既存の地震を解除してください:');
    console.log('   npm run earthquake-demo 4\n');
    return;
  }

  // 地震情報を挿入
  const { data, error } = await supabase
    .from('disaster_status')
    .insert({
      is_active: true,
      disaster_type: selectedEarthquake.disaster_type,
      message: selectedEarthquake.message,
      activated_by: selectedEarthquake.activated_by,
      activated_at: new Date().toISOString(),
    })
    .select();

  if (error) {
    console.error('❌ エラー:', error.message);
    return;
  }

  console.log('✅ 地震情報をSupabaseに保存しました');
  console.log('📱 10秒以内にWebアプリで緊急モードが発動します\n');
  console.log('📊 保存されたデータ:');
  console.log(JSON.stringify(data[0], null, 2));
  console.log('\n💡 解除するには:');
  console.log('   npm run earthquake-demo 4\n');
};

// 使用方法を表示
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('🌍 地震発生デモスクリプト\n');
  console.log('使用方法:');
  console.log('  npm run earthquake-demo [番号]\n');
  console.log('シナリオ:');
  console.log('  1: 東京都 震度5強 M6.5');
  console.log('  2: 大阪府 震度6弱 M7.2');
  console.log('  3: 北海道 震度5弱 M5.8');
  console.log('  4: すべての地震を解除\n');
  console.log('例:');
  console.log('  npm run earthquake-demo 1  # シナリオ1を実行');
  console.log('  npm run earthquake-demo 4  # 地震を解除\n');
  process.exit(0);
}

// 実行
earthquakeDemo().catch(console.error);
