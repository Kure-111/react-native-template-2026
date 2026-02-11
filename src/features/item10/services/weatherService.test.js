// 環境変数デバッグ用
console.log('=== Weather Service Debug ===');
console.log('EXPO_PUBLIC_OPENWEATHERMAP_API_KEY:', process.env.EXPO_PUBLIC_OPENWEATHERMAP_API_KEY);
console.log('All EXPO_PUBLIC_ vars:', Object.keys(process.env).filter(key => key.startsWith('EXPO_PUBLIC_')));
console.log('============================');

export default {};
