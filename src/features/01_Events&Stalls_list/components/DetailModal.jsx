import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { Ionicons } from '../../../shared/components/icons';
import { useTheme } from '../../../shared/hooks/useTheme';
import { TABS } from '../constants';

/**
 * 企画・屋台の詳細情報を表示するモーダルコンポーネント
 * 
 * @param {boolean} visible モーダルの表示状態
 * @param {Object} item 表示するデータオブジェクト
 * @param {Function} onClose モーダルを閉じる関数
 */
const DetailModal = ({ visible, item, onClose }) => {
    const { theme } = useTheme();

    if (!item) return null;

    const typeBadgeColor = item.itemType === TABS.STALLS ? '#f97316' : '#3b82f6';
    const typeLabel = item.itemType === TABS.STALLS ? '屋台' : '企画';

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: theme.background }]}>

                    {/* ヘッダーエリア */}
                    <View style={[styles.header, { borderBottomColor: theme.border }]}>
                        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
                            詳細情報
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={theme.text} />
                        </TouchableOpacity>
                    </View>

                    {/* コンテンツエリア */}
                    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>

                        {/* タイトル部 */}
                        <View style={styles.titleSection}>
                            <Text style={[styles.mainTitle, { color: theme.text }]}>
                                {item.displayName}
                            </Text>

                            <View style={styles.badgesWrapper}>
                                <View style={[styles.typeBadge, { backgroundColor: typeBadgeColor }]}>
                                    <Text style={styles.badgeText}>{typeLabel}</Text>
                                </View>
                                <View style={styles.categoryBadge}>
                                    <Text style={styles.categoryText}>{item.categoryName || 'カテゴリなし'}</Text>
                                </View>
                            </View>
                        </View>

                        {/* 詳細情報部 */}
                        <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>

                            <View style={styles.infoRow}>
                                <View style={styles.iconContainer}>
                                    <Ionicons name="location" size={20} color={theme.primary} />
                                </View>
                                <View style={styles.infoTextContainer}>
                                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>場所</Text>
                                    <Text style={[styles.infoValue, { color: theme.text }]}>{item.locationName || '設定なし'}</Text>
                                </View>
                            </View>

                            <View style={[styles.divider, { backgroundColor: theme.border }]} />

                            <View style={styles.infoRow}>
                                <View style={styles.iconContainer}>
                                    <Ionicons name="people" size={20} color={theme.primary} />
                                </View>
                                <View style={styles.infoTextContainer}>
                                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>団体名</Text>
                                    <Text style={[styles.infoValue, { color: theme.text }]}>{item.groupName || '設定なし'}</Text>
                                </View>
                            </View>

                        </View>

                        {/* 説明文エリア */}
                        <View style={styles.descriptionSection}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>説明・詳細</Text>
                            <View style={[styles.descriptionBox, { backgroundColor: theme.surface }]}>
                                {item.description ? (
                                    <Text style={[styles.descriptionText, { color: theme.text }]}>
                                        {item.description}
                                    </Text>
                                ) : (
                                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                        説明文は登録されていません。
                                    </Text>
                                )}
                            </View>
                        </View>

                    </ScrollView>

                    {/* フッターエリア (閉じるボタン) */}
                    <View style={[styles.footer, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
                        <TouchableOpacity
                            style={[styles.fullWidthButton, { backgroundColor: theme.primary }]}
                            onPress={onClose}
                        >
                            <Text style={styles.buttonText}>閉じる</Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end', // 下からスライドしてくるので下部配置
    },
    modalContent: {
        height: '85%', // 画面の85%を占める
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 4,
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    titleSection: {
        marginBottom: 24,
    },
    mainTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    badgesWrapper: {
        flexDirection: 'row',
        gap: 8,
    },
    typeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    categoryBadge: {
        backgroundColor: '#e5e7eb', // gray-200
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    categoryText: {
        color: '#374151', // gray-700
        fontSize: 14,
        fontWeight: '500',
    },
    infoCard: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 16,
        marginBottom: 24,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0, 122, 255, 0.1)', // primaryの薄い版を想定
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    infoTextContainer: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        marginVertical: 12,
        marginLeft: 48, // アイコンの幅分インデント
    },
    descriptionSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    descriptionBox: {
        padding: 16,
        borderRadius: 12,
        minHeight: 120,
    },
    descriptionText: {
        fontSize: 15,
        lineHeight: 24,
    },
    emptyText: {
        fontSize: 15,
        fontStyle: 'italic',
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
    },
    fullWidthButton: {
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default DetailModal;
