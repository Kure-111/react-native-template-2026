import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '../../../shared/components/icons';
import { useTheme } from '../../../shared/hooks/useTheme';
import { TABS } from '../constants';

/**
 * リストに表示するカードコンポーネント
 * - デスクトップ: テーブル行スタイル（カラムヘッダーに合わせて横並び）
 * - モバイル: 二段レイアウト（名称 + バッジ行 + 団体名）
 */
const ItemCard = ({ item, onPress }) => {
    const { theme } = useTheme();
    const { width } = useWindowDimensions();

    // 画面幅768px未満をモバイルとして判定
    const isMobile = Platform.OS !== 'web' || width < 768;

    // 屋台か企画かでバッジの色を変える
    const typeBadgeColor = item.itemType === TABS.STALLS ? '#f97316' : '#3b82f6';
    const typeLabel = item.itemType === TABS.STALLS ? '屋台' : '企画';

    if (isMobile) {
        // --- モバイルレイアウト ---
        return (
            <TouchableOpacity
                style={[
                    styles.card,
                    {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                        borderRadius: theme.borderRadius,
                    }
                ]}
                onPress={onPress}
                activeOpacity={0.7}
            >
                {/* 1行目：タイプバッジ + 名称（フル表示） */}
                <View style={styles.mobileNameRow}>
                    <View style={[styles.typeBadge, { backgroundColor: typeBadgeColor, borderRadius: Math.min(theme.borderRadius, 4) }]}>
                        <Text style={styles.badgeText}>{typeLabel}</Text>
                    </View>
                    <Text style={[styles.mobileNameText, { color: theme.text }]} numberOfLines={2}>
                        {item.displayName}
                    </Text>
                </View>

                {/* 2行目：カテゴリ・場所のバッジ */}
                <View style={styles.mobileTagRow}>
                    {item.categoryName && (
                        <View style={[styles.infoTag, { backgroundColor: theme.border, borderRadius: theme.borderRadius }]}>
                            <Ionicons name="pricetag-outline" size={11} color={theme.textSecondary} />
                            <Text style={[styles.infoTagText, { color: theme.text }]}>
                                {item.categoryName}
                            </Text>
                        </View>
                    )}
                    {item.locationName ? (
                        <View style={[styles.infoTag, { backgroundColor: theme.border, borderRadius: theme.borderRadius }]}>
                            <Ionicons name="location-outline" size={11} color={theme.textSecondary} />
                            <Text style={[styles.infoTagText, { color: theme.text }]}>
                                {item.locationName}
                            </Text>
                        </View>
                    ) : null}
                </View>

                {/* 3行目：運営団体（右詰め） */}
                {item.groupName ? (
                    <View style={styles.groupRow}>
                        <Ionicons name="people-outline" size={11} color={theme.textSecondary} />
                        <Text style={[styles.mobileGroupText, { color: theme.textSecondary }]}>
                            {item.groupName}
                        </Text>
                    </View>
                ) : null}
            </TouchableOpacity>
        );
    }

    // --- デスクトップレイアウト（テーブル行） ---
    return (
        <TouchableOpacity
            style={[
                styles.card,
                {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    borderRadius: theme.borderRadius,
                }
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.row}>
                {/* 名称列 */}
                <View style={styles.nameCol}>
                    <View style={[styles.typeBadge, { backgroundColor: typeBadgeColor, borderRadius: Math.min(theme.borderRadius, 4) }]}>
                        <Text style={styles.badgeText}>{typeLabel}</Text>
                    </View>
                    <Text style={[styles.nameText, { color: theme.text }]} numberOfLines={2}>
                        {item.displayName}
                    </Text>
                </View>

                {/* カテゴリ列 */}
                <View style={styles.col}>
                    <View style={styles.iconCell}>
                        <Ionicons name="pricetag-outline" size={13} color={theme.textSecondary} />
                        <Text style={[styles.cellText, { color: theme.textSecondary }]} numberOfLines={1}>
                            {item.categoryName || '-'}
                        </Text>
                    </View>
                </View>

                {/* 場所列 */}
                <View style={styles.col}>
                    <View style={styles.iconCell}>
                        <Ionicons name="location-outline" size={13} color={theme.textSecondary} />
                        <Text style={[styles.cellText, { color: theme.textSecondary }]} numberOfLines={1}>
                            {item.locationName || '-'}
                        </Text>
                    </View>
                </View>

                {/* 運営団体列 */}
                <View style={styles.col}>
                    <View style={styles.iconCell}>
                        <Ionicons name="people-outline" size={13} color={theme.textSecondary} />
                        <Text style={[styles.cellText, { color: theme.textSecondary }]} numberOfLines={1}>
                            {item.groupName || '-'}
                        </Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    // --- 共通スタイル ---
    card: {
        borderWidth: 1,
        paddingVertical: 14,
        paddingHorizontal: 14,
        marginBottom: 10,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
    },
    typeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        flexShrink: 0,
    },
    badgeText: {
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold',
    },

    // --- モバイル専用スタイル ---
    mobileNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    mobileNameText: {
        fontSize: 16,
        fontWeight: '600',
        flexShrink: 1,
    },
    mobileTagRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 4,
    },
    groupRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 3,
        marginTop: 4,
    },
    mobileGroupText: {
        fontSize: 11,
    },
    infoTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    infoTagText: {
        fontSize: 11,
        fontWeight: '500',
    },

    // --- デスクトップ専用スタイル ---
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 36,
    },
    nameCol: {
        flex: 2.5,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingRight: 8,
    },
    col: {
        flex: 1.5,
        paddingHorizontal: 4,
    },
    nameText: {
        fontSize: 15,
        fontWeight: '600',
        flexShrink: 1,
    },
    cellText: {
        fontSize: 13,
        flexShrink: 1,
    },
    iconCell: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
});

export default ItemCard;
