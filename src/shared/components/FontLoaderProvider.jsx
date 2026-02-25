import React from 'react';
import { Platform, View } from 'react-native';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

// Webの本番環境で @expo/vector-icons が確実に読み込まれるように手動でCSSを注入する
if (Platform.OS === 'web') {
    const ioniconsFont = require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf');
    const materialCommunityIconsFont = require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf');

    const iconFontStyles = `
    @font-face {
      src: url(${ioniconsFont});
      font-family: Ionicons;
    }
    @font-face {
      src: url(${materialCommunityIconsFont});
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
 * Webの本番環境での文字化け（□になる問題）を防ぐためにCSSを注入し、
 * フォントの準備が完了するまで子要素のレンダリングをブロックします。
 * 
 * @param {Object} props - コンポーネントのプロパティ
 * @param {React.ReactNode} props.children - 子要素
 */
export const FontLoaderProvider = ({ children }) => {
    const [fontsLoaded] = useFonts({
        ...Ionicons.font,
        ...MaterialCommunityIcons.font,
    });

    // フォントの読み込みが完了していない場合は何も表示しない（スプラッシュ等の代わり）
    if (!fontsLoaded) {
        return null;
    }

    return <>{children}</>;
};
