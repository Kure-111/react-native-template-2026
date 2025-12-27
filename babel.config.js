/**
 * Babel 設定ファイル
 * Expo 標準設定
 */

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
