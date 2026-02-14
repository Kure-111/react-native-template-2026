import React from 'react';
import { View, Text, StyleSheet, FlatList, Button } from 'react-native';
import { OPTIONAL_FIELD_DEFAULTS, RINJI_STATUS } from '../constants.js';

const TITLE_SEPARATOR = '\n\n---\n\n';
const WORK_TIME_SEPARATOR = '〜';
const IMMEDIATE_TIME_LABEL = '現在時刻';
const LEGACY_IMMEDIATE_TIME_LABEL = 'いますぐ';
const META_SEPARATOR = '\n\n::META::\n\n';
const LATE_JOIN_ALLOW = 'allow';
const LATE_JOIN_DENY = 'deny';

const inferStartTime = (workTime) => {
  if (!workTime || typeof workTime !== 'string') return null;
  if (
    workTime === IMMEDIATE_TIME_LABEL ||
    workTime.startsWith(`${IMMEDIATE_TIME_LABEL}${WORK_TIME_SEPARATOR}`) ||
    workTime === LEGACY_IMMEDIATE_TIME_LABEL ||
    workTime.startsWith(`${LEGACY_IMMEDIATE_TIME_LABEL}${WORK_TIME_SEPARATOR}`)
  ) {
    return IMMEDIATE_TIME_LABEL;
  }
  const start = workTime.split(WORK_TIME_SEPARATOR)[0]?.trim();
  if (!start) return null;
  return /^\d{2}:\d{2}$/.test(start) ? start : null;
};

const formatOptional = (recruit) => ({
  meet_place: recruit.meet_place || OPTIONAL_FIELD_DEFAULTS.meet_place(recruit.location),
  meet_time: recruit.meet_time || inferStartTime(recruit.work_time) || null,
  belongings: recruit.belongings || OPTIONAL_FIELD_DEFAULTS.belongings,
});

const parseTitleAndDescription = (raw) => {
  if (!raw || typeof raw !== 'string') return { title: '募集', body: '', lateJoin: null };
  const metaIdx = raw.indexOf(META_SEPARATOR);
  const plain = metaIdx === -1 ? raw : raw.slice(0, metaIdx);
  const metaRaw = metaIdx === -1 ? '' : raw.slice(metaIdx + META_SEPARATOR.length).trim();
  const idx = plain.indexOf(TITLE_SEPARATOR);
  const lateJoin = metaRaw === LATE_JOIN_ALLOW || metaRaw === LATE_JOIN_DENY ? metaRaw : null;
  if (idx === -1) {
    return { title: '募集', body: plain, lateJoin };
  }
  return {
    title: plain.slice(0, idx) || '募集',
    body: plain.slice(idx + TITLE_SEPARATOR.length),
    lateJoin,
  };
};

const InfoRow = ({ items, size = 'half' }) => (
  <View style={styles.row}>
    {items.map((item) => (
      <View
        key={item.label}
        style={[
          size === 'third' ? styles.third : styles.half,
          styles.infoBox,
        ]}
      >
        <Text style={styles.label}>{item.label}</Text>
        <Text style={styles.value}>{item.value || '—'}</Text>
      </View>
    ))}
  </View>
);

const RecruitCard = ({
  recruit,
  isManager,
  onApply,
  onEdit,
  onClose,
  onReopen,
}) => {
  const optional = formatOptional(recruit);
  const text = parseTitleAndDescription(recruit.description);
  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{text.title}</Text>
        {text.lateJoin === LATE_JOIN_ALLOW ? (
          <View style={styles.lateJoinBadge}>
            <Text style={styles.lateJoinBadgeText}>途中参加可</Text>
          </View>
        ) : null}
        {text.lateJoin === LATE_JOIN_DENY ? (
          <View style={styles.lateJoinBadgeDeny}>
            <Text style={styles.lateJoinBadgeDenyText}>途中参加不可</Text>
          </View>
        ) : null}
      </View>

      {/* 行1: 募集人数 / 場所 / 集合場所 */}
      <InfoRow
        size="third"
        items={[
          { label: '募集人数', value: recruit.headcount },
          { label: '場所', value: recruit.location },
          { label: '集合場所', value: optional.meet_place },
        ]}
      />

      {/* 行2: 募集日 / 募集時間帯 / 集合時間 */}
      <InfoRow
        size="third"
        items={[
          { label: '募集日', value: recruit.work_date },
          { label: '募集時間帯', value: recruit.work_time },
          { label: '集合時間', value: optional.meet_time || '—' },
        ]}
      />

      {/* 報酬 + 持ち物 */}
      <InfoRow
        items={[
          { label: '報酬', value: recruit.reward },
          { label: '持ち物', value: optional.belongings },
        ]}
      />

      {/* 業務内容 */}
      <View style={styles.rowColumn}>
        <Text style={styles.label}>業務内容</Text>
        <Text style={styles.value}>{text.body || '—'}</Text>
      </View>

      <Text style={styles.status}>ステータス: {recruit.status}</Text>

      <View style={styles.actions}>
        {isManager ? (
          <>
            <Button title="編集" onPress={() => onEdit?.(recruit)} />
            {recruit.status === RINJI_STATUS.OPEN ? (
              <Button title="クローズ" onPress={() => onClose?.(recruit.id)} />
            ) : (
              <Button title="再開" onPress={() => onReopen?.(recruit.id)} />
            )}
          </>
        ) : (
          <Button
            title="応募する"
            onPress={() => onApply?.(recruit.id)}
            disabled={recruit.status !== RINJI_STATUS.OPEN}
          />
        )}
      </View>
    </View>
  );
};

export const RecruitList = ({
  data,
  isManager = false,
  onApply,
  onEdit,
  onClose,
  onReopen,
  refreshing = false,
  onRefresh,
  emptyText = '募集がありません',
}) => {
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      refreshing={refreshing}
      onRefresh={onRefresh}
      ListEmptyComponent={<Text style={styles.empty}>{emptyText}</Text>}
      renderItem={({ item }) => (
        <RecruitCard
          recruit={item}
          isManager={isManager}
          onApply={onApply}
          onEdit={onEdit}
          onClose={onClose}
          onReopen={onReopen}
        />
      )}
    />
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#fff',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  lateJoinBadge: {
    backgroundColor: '#fde68a',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  lateJoinBadgeText: {
    fontSize: 12,
    color: '#7c2d12',
    fontWeight: '700',
  },
  lateJoinBadgeDeny: {
    backgroundColor: '#bfdbfe',
    borderColor: '#2563eb',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  lateJoinBadgeDenyText: {
    fontSize: 12,
    color: '#1e3a8a',
    fontWeight: '700',
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    color: '#222',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  rowColumn: {
    gap: 4,
  },
  half: {
    flex: 1,
  },
  third: {
    flex: 1,
  },
  status: {
    marginTop: 4,
    fontSize: 12,
    color: '#555',
  },
  infoBox: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    padding: 8,
    backgroundColor: '#fafafa',
  },
  actions: {
    marginTop: 4,
    flexDirection: 'row',
    gap: 8,
  },
  empty: {
    textAlign: 'center',
    padding: 20,
    color: '#666',
  },
});

export default RecruitList;
