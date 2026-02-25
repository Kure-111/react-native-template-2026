import React from 'react';
import { Platform, View } from 'react-native';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

// Webビルド時、Metroは「assets/...」という相対パスを返すことがあります。
// SPAのサブルート（例: /item10）へ直接アクセスした場合に404になるのを防ぐため、
// ルートからの絶対パス（/assets/...）に変換するヘルパー。
const getAbsoluteFontUrl = (fontAsset) => {
    if (typeof fontAsset === 'string' && !fontAsset.startsWith('/') && !fontAsset.startsWith('http') && !fontAsset.startsWith('data:')) {
        return '/' + fontAsset;
    }
    return fontAsset;
};

if (Platform.OS === 'web') {
    const ioniconsFont = require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf');
    const materialCommunityIconsFont = require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf');

    const iconFontStyles = `
    @font-face {
      src: url(${getAbsoluteFontUrl(ioniconsFont)});
      font-family: Ionicons;
    }
    @font-face {
      src: url(${getAbsoluteFontUrl(materialCommunityIconsFont)});
      font-family: MaterialCommunityIcons;
    }
  `;

    // DOMに <style> タグを追加
    if (typeof document !== 'undefined') {
        const style = document.createElement('style');
        style.type = 'text/css';
        if (style.styleSheet) {
            style.styleSheet.cssText = iconFontStyles;
        } else {
            style.appendChild(document.createTextNode(iconFontStyles));
        }
        document.head.appendChild(style);
    }
}

/**
 * フォントの事前読み込みとプロバイダラッパー
 */
export const FontLoaderProvider = ({ children }) => {
    const [fontsLoaded, fontError] = useFonts({
        Ionicons: Platform.OS === 'web'
            ? getAbsoluteFontUrl(require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'))
            : Ionicons.font.Ionicons,
        MaterialCommunityIcons: Platform.OS === 'web'
            ? getAbsoluteFontUrl(require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf'))
            : MaterialCommunityIcons.font.MaterialCommunityIcons,
    });

    // ネイティブ(iOS/Android)ではフォントロード前に描画するとクラッシュするため待機します。
    // Webでは、万一useFontsが404エラー等でブロックしても画面が真っ白にならないよう描画を続行します。
    if (Platform.OS !== 'web' && (!fontsLoaded && !fontError)) {
        return null;
    }

    return <>{children}</>;
};
