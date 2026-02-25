import React from 'react';
import { Platform, View } from 'react-native';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

/**
 * フォントの事前読み込みとプロバイダラッパー
 */
export const FontLoaderProvider = ({ children }) => {
    const [fontsLoaded, fontError] = useFonts({
        ...Ionicons.font,
        ...MaterialCommunityIcons.font
    });

    // ネイティブ(iOS/Android)ではフォントロード前に描画するとクラッシュするため待機します。
    // Webでは、万一useFontsが404エラー等でブロックしても画面が真っ白にならないよう描画を続行します。
    // （public/index.htmlの <base href="/" /> によりSPAの相対パス問題は解決済み）
    if (Platform.OS !== 'web' && (!fontsLoaded && !fontError)) {
        return null;
    }

    return <>{children}</>;
};
