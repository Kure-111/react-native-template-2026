/**
 * 落とし物情報カードコンポーネント
 * 一般・緊急共通で使用。写真サムネイル、拾得物名、場所、時間、ステータスを表示する
 * 写真タップでフルスクリーン表示。失敗時はプレースホルダーを表示する
 */

import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { Ionicons } from '../../../shared/components/icons';

/**
 * 落とし物情報カードコンポーネント
 * @param {Object} props - コンポーネントプロパティ
 * @param {Object} props.item - 落とし物データ
 * @param {string} props.item.tag - 識別タグ
 * @param {string|null} props.item.imageUrl - 写真サムネイルURL
 * @param {string} props.item.itemName - 拾得物の名前
 * @param {string} props.item.foundTime - 拾得時間
 * @param {string} props.item.location - 拾得場所
 * @param {string} props.item.returnDate - 返却日（空文字 = 保管中）
 * @param {boolean} props.item.isReturned - 返却済みフラグ
 * @param {boolean} props.item.isUrgent - 緊急フラグ
 * @returns {JSX.Element} 落とし物カードUI
 */
const LostItemCard = ({ item }) => {
  /** テーマオブジェクト */
  const { theme } = useTheme();
  /** 写真の読み込みに失敗したかどうか */
  const [hasImageError, setHasImageError] = useState(false);
  /** 写真フルスクリーンモーダルの表示状態 */
  const [isModalVisible, setIsModalVisible] = useState(false);
  /** 写真が存在するかどうか（URLがあり、かつエラーが発生していない） */
  const hasImage = item.imageUrl && !hasImageError;

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {/* 写真エリア（画像あり時はタップでフルスクリーン表示） */}
      <View style={styles.imageContainer}>
        {hasImage ? (
          <TouchableOpacity
            onPress={() => setIsModalVisible(true)}
            activeOpacity={0.9}
            style={styles.imageTouchable}
          >
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.image}
              resizeMode="cover"
              onError={() => setHasImageError(true)}
            />
          </TouchableOpacity>
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: theme.background }]}>
            <Ionicons name="image-outline" size={28} color={theme.textSecondary} />
          </View>
        )}
      </View>

      {/* テキスト情報エリア */}
      <View style={styles.infoContainer}>
        {/* 1行目: 識別タグ + 緊急バッジ + ステータスバッジ */}
        <View style={styles.headerRow}>
          <Text style={[styles.tag, { color: theme.textSecondary }]}>
            {item.tag}
          </Text>
          {item.isUrgent && (
            <View style={[styles.urgentBadge, { backgroundColor: theme.error }]}>
              <Text style={styles.urgentBadgeText}>緊急</Text>
            </View>
          )}
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: item.isReturned
                  ? theme.success + '20'
                  : theme.primary + '20',
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: item.isReturned ? theme.success : theme.primary,
                },
              ]}
            >
              {item.isReturned ? '返却済み' : '保管中'}
            </Text>
          </View>
        </View>

        {/* 2行目: 拾得物の名前 */}
        <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={2}>
          {item.itemName}
        </Text>

        {/* 3行目: 預かり場所 */}
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={14} color={theme.textSecondary} />
          <Text style={[styles.detailText, { color: theme.textSecondary }]} numberOfLines={1}>
            預かり場所: {item.location}
          </Text>
        </View>

        {/* 4行目: 拾得時刻 */}
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
          <Text style={[styles.detailText, { color: theme.textSecondary }]}>
            拾得時刻: {item.foundTime}
          </Text>
        </View>

        {/* 返却済みの場合は返却時刻を表示 */}
        {item.isReturned && (
          <View style={styles.detailRow}>
            <Ionicons name="checkmark-circle-outline" size={14} color={theme.success} />
            <Text style={[styles.detailText, { color: theme.success }]}>
              返却時刻: {item.returnDate}
            </Text>
          </View>
        )}
      </View>

      {/* 写真フルスクリーンモーダル（タップで閉じる） */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsModalVisible(false)}
        >
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.modalImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  /** カード全体 */
  card: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 4,
    overflow: 'hidden',
  },
  /** 写真コンテナ（幅120・高さ90 = 4:3横長比率） */
  imageContainer: {
    width: 120,
    minHeight: 90,
  },
  /** 写真タップ領域（コンテナ全体を覆う） */
  imageTouchable: {
    width: '100%',
    height: '100%',
  },
  /** 写真画像 */
  image: {
    width: '100%',
    height: '100%',
  },
  /** 写真プレースホルダー */
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  /** テキスト情報コンテナ */
  infoContainer: {
    flex: 1,
    padding: 10,
  },
  /** ヘッダー行（タグ + バッジ群） */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  /** 識別タグテキスト */
  tag: {
    fontSize: 12,
    fontWeight: '600',
  },
  /** 緊急バッジ */
  urgentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  /** 緊急バッジテキスト */
  urgentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  /** ステータスバッジ */
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  /** ステータスバッジテキスト */
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  /** 拾得物名テキスト */
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  /** 詳細行（アイコン + テキスト） */
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  /** 詳細テキスト */
  detailText: {
    fontSize: 12,
    flex: 1,
  },
  /** 写真フルスクリーンモーダルの背景 */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  /** フルスクリーン表示の写真 */
  modalImage: {
    width: '100%',
    height: '100%',
  },
});

export default LostItemCard;
