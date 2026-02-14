/**
 * モックデータ - テスト用
 */

export const generateMockVisitorHistory = () => {
  const today = new Date();
  const data = [];
  
  // 9時から18時まで1時間ごとのデータを生成
  for (let hour = 9; hour <= 18; hour++) {
    const date = new Date(today);
    date.setHours(hour, 0, 0, 0);
    
    // ランダムな来場者数（ピーク時間帯は多めに）
    let count;
    if (hour >= 11 && hour <= 14) {
      // 昼時はピーク
      count = Math.floor(Math.random() * 50) + 80;
    } else if (hour >= 15 && hour <= 17) {
      // 午後も多め
      count = Math.floor(Math.random() * 40) + 60;
    } else {
      // それ以外
      count = Math.floor(Math.random() * 30) + 20;
    }
    
    data.push({
      id: `mock-${hour}`,
      count: count,
      counted_at: date.toISOString(),
      operation: 'mock',
      updated_by: 'system',
    });
  }
  
  return data;
};
