import createIconSet from '@expo/vector-icons/createIconSet';
import ioniconsGlyphMap from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json';
import materialCommunityIconsGlyphMap from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json';

// ローカルに配置したフォントファイルを require することで
// Metro Bundler が node_modules 内ではなく assets/fonts/ を出力元として認識し、
// Cloudflare Pages の node_modules 配信ブロックを100%回避します。
const ioniconsFont = require('../../../../assets/fonts/Ionicons.ttf');
const materialCommunityIconsFont = require('../../../../assets/fonts/MaterialCommunityIcons.ttf');

export const Ionicons = createIconSet(ioniconsGlyphMap, 'Ionicons', ioniconsFont);
export const MaterialCommunityIcons = createIconSet(materialCommunityIconsGlyphMap, 'MaterialCommunityIcons', materialCommunityIconsFont);
