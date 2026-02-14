import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Button, ScrollView, Pressable } from 'react-native';
import { OPTIONAL_FIELD_DEFAULTS } from '../constants.js';

const TITLE_SEPARATOR = '\n\n---\n\n';
const IMMEDIATE_TIME_LABEL = '現在時刻';
const LEGACY_IMMEDIATE_TIME_LABEL = 'いますぐ';
const META_SEPARATOR = '\n\n::META::\n\n';
const LATE_JOIN_ALLOW = 'allow';
const LATE_JOIN_DENY = 'deny';
const TIME_DROPDOWN_MIN_WIDTH = 280;

const emptyForm = {
  headcount: '',
  work_date: '',
  work_time: '',
  location: '',
  meet_time: '',
  meet_place: '',
  title: '',
  description: '',
  reward: '',
  belongings: '',
  department_id: '',
};

export const RecruitForm = ({
  initialValues = {},
  submitLabel = '作成',
  onSubmit,
  disabled = false,
}) => {
  const [form, setForm] = useState({ ...emptyForm, ...initialValues });
  const [errors, setErrors] = useState({});
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [dateLayout, setDateLayout] = useState(null);
  const [startHour, setStartHour] = useState('');
  const [startMinute, setStartMinute] = useState('');
  const [isImmediateTime, setIsImmediateTime] = useState(false);
  const [lateJoin, setLateJoin] = useState(LATE_JOIN_DENY);
  const [durationMinutes, setDurationMinutes] = useState('未定');
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [timeLayout, setTimeLayout] = useState(null);
  const [containerLayout, setContainerLayout] = useState(null);

  const dateOptions = [
    { label: '2026/11/1', value: '2026-11-01' },
    { label: '2026/11/2', value: '2026-11-02' },
    { label: '2026/11/3', value: '2026-11-03' },
    { label: '2026/11/4', value: '2026-11-04' },
    { label: '2026/11/5', value: '2026-11-05' },
  ];
  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    label: `${i}`.padStart(2, '0'),
    value: `${i}`.padStart(2, '0'),
  }));
  const minuteOptions = Array.from({ length: 60 }, (_, i) => {
    const value = `${i}`.padStart(2, '0');
    return { label: value, value };
  });

  useEffect(() => {
    const parseTitleAndDescription = (value) => {
      if (!value || typeof value !== 'string') {
        return { title: '', description: '', lateJoin: LATE_JOIN_DENY };
      }
      const metaIdx = value.indexOf(META_SEPARATOR);
      const plain = metaIdx === -1 ? value : value.slice(0, metaIdx);
      const metaRaw = metaIdx === -1 ? '' : value.slice(metaIdx + META_SEPARATOR.length).trim();
      const parsedLateJoin = metaRaw === LATE_JOIN_ALLOW ? LATE_JOIN_ALLOW : LATE_JOIN_DENY;
      const idx = plain.indexOf(TITLE_SEPARATOR);
      if (idx === -1) {
        return { title: '', description: plain, lateJoin: parsedLateJoin };
      }
      return {
        title: plain.slice(0, idx),
        description: plain.slice(idx + TITLE_SEPARATOR.length),
        lateJoin: parsedLateJoin,
      };
    };

    const parsedText = parseTitleAndDescription(initialValues.description);
    setForm({
      ...emptyForm,
      ...initialValues,
      title: parsedText.title,
      description: parsedText.description,
    });
    setLateJoin(parsedText.lateJoin);

    // work_time 形式 "HH:MM〜HH:MM" or "HH:MM〜終了時刻未定" or "現在時刻"
    const parseFromWorkTime = (value) => {
      if (!value || typeof value !== 'string') return null;
      if (
        value === IMMEDIATE_TIME_LABEL ||
        value.startsWith(`${IMMEDIATE_TIME_LABEL}〜`) ||
        value === LEGACY_IMMEDIATE_TIME_LABEL ||
        value.startsWith(`${LEGACY_IMMEDIATE_TIME_LABEL}〜`)
      ) {
        return { immediate: true };
      }
      const m = value.match(/(?<sh>\d{2}):(?<sm>\d{2})〜(?:(?<eh>\d{2}):(?<em>\d{2})|終了時刻未定)/);
      if (!m || !m.groups) return null;
      const { sh, sm, eh, em } = m.groups;
      const parsed = { startH: sh, startM: sm, immediate: false };
      if (eh && em) {
        const startTotal = Number(sh) * 60 + Number(sm);
        const endTotal = Number(eh) * 60 + Number(em);
        const diff = ((endTotal - startTotal) + 24 * 60) % (24 * 60);
        parsed.duration = diff || '未定';
      }
      return parsed;
    };

    const parsed = parseFromWorkTime(initialValues.work_time);
    setIsImmediateTime(Boolean(parsed?.immediate));
    setStartHour(parsed?.startH || '');
    setStartMinute(parsed?.startM || '');
    setDurationMinutes(parsed?.duration ?? '未定');
  }, [initialValues]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.headcount) newErrors.headcount = '募集人数は必須です';
    if (!form.location) newErrors.location = '場所は必須です';
    if (!form.work_date) newErrors.work_date = '募集日を入力してください';
    if (!isImmediateTime && (!startHour || !startMinute)) {
      newErrors.work_time = '開始時刻を選択してください';
    }
    if (!form.title) newErrors.title = '募集タイトルは必須です';
    if (!form.description) newErrors.description = '業務内容は必須です';
    if (!form.reward) newErrors.reward = '報酬は必須です';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildWorkTime = () => {
    if (isImmediateTime) return IMMEDIATE_TIME_LABEL;
    const start = `${startHour}:${startMinute}`;
    const dur = durationMinutes?.toString().trim();
    const toMinutes = (hh, mm) => Number(hh) * 60 + Number(mm);
    const pad = (n) => `${n}`.padStart(2, '0');
    if (dur && dur !== '未定' && !Number.isNaN(Number(dur))) {
      const total = toMinutes(startHour, startMinute) + Number(dur);
      const endH = Math.floor((total % (24 * 60)) / 60);
      const endM = total % 60;
      const end = `${pad(endH)}:${pad(endM)}`;
      return `${start}〜${end}`;
    }
    return `${start}〜終了時刻未定`;
  };

  const selectImmediateNow = () => {
    const now = new Date();
    const hh = `${now.getHours()}`.padStart(2, '0');
    const mm = `${now.getMinutes()}`.padStart(2, '0');
    setIsImmediateTime(false);
    setStartHour(hh);
    setStartMinute(mm);
    setTimePickerOpen(false);
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const { title, ...restForm } = form;
    const mergedDescription = `${form.title}${TITLE_SEPARATOR}${form.description}${META_SEPARATOR}${lateJoin}`;
    const payload = {
      ...restForm,
      work_time: buildWorkTime(),
      description: mergedDescription,
      headcount: Number(form.headcount),
      department_id: form.department_id || null,
      meet_place:
        form.meet_place || OPTIONAL_FIELD_DEFAULTS.meet_place(form.location),
      meet_time: form.meet_time || (isImmediateTime ? IMMEDIATE_TIME_LABEL : `${startHour}:${startMinute}`),
      belongings: form.belongings || OPTIONAL_FIELD_DEFAULTS.belongings,
    };
    onSubmit?.(payload);
  };

  const renderInput = (label, key, props = {}) => (
    <View style={[styles.field, props.containerStyle]} key={key}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          props.multiline && styles.inputMultiline,
          props.inputStyle,
        ]}
        value={form[key]}
        onChangeText={(text) => updateField(key, text)}
        editable={!disabled}
        placeholderTextColor={props.placeholderTextColor || '#999'}
        {...props}
      />
      {errors[key] ? <Text style={styles.error}>{errors[key]}</Text> : null}
    </View>
  );

  const renderRow = (fields, itemStyle = styles.half) => (
    <View style={styles.row}>
      {fields.map((f) =>
        renderInput(f.label, f.key, { ...f.props, containerStyle: itemStyle })
      )}
    </View>
  );

  const renderDatePicker = (containerStyle = styles.half) => {
    const selected = dateOptions.find((o) => o.value === form.work_date);
    return (
      <View
        style={[styles.field, containerStyle, datePickerOpen && styles.fieldRaised]}
        onLayout={(e) => setDateLayout(e.nativeEvent.layout)}
      >
        <Text style={styles.label}>募集日</Text>
        <Button
          title={selected ? selected.label : '選択してください'}
          onPress={() => {
            setTimePickerOpen(false);
            setDatePickerOpen((v) => !v);
          }}
          disabled={disabled}
          color={selected ? undefined : '#666'}
        />
        {errors.work_date ? <Text style={styles.error}>{errors.work_date}</Text> : null}
      </View>
    );
  };

  const getTimeDropdownPlacement = () => {
    if (!timeLayout) return null;
    const baseWidth = timeLayout.width || 0;
    const widthCandidate = Math.max(baseWidth, TIME_DROPDOWN_MIN_WIDTH);
    const containerWidth = containerLayout?.width || widthCandidate;
    const width = Math.min(widthCandidate, containerWidth);
    const maxLeft = Math.max(0, containerWidth - width);
    const left = Math.max(0, Math.min(timeLayout.x || 0, maxLeft));
    return {
      top: (timeLayout.y || 0) + (timeLayout.height || 0) + 4,
      left,
      width,
    };
  };

  const timeDropdownPlacement = getTimeDropdownPlacement();

  return (
    <View style={styles.container} onLayout={(e) => setContainerLayout(e.nativeEvent.layout)}>
      <Text style={styles.sectionTitle}>募集情報</Text>
      {/* 行1: 募集人数 / 場所 / 集合場所 */}
      {renderRow(
        [
          { label: '募集人数', key: 'headcount', props: { keyboardType: 'numeric' } },
          { label: '場所', key: 'location', props: { placeholder: 'A棟 2F' } },
          { label: '集合場所（任意）', key: 'meet_place', props: { placeholder: 'A棟 1F ロビー' } },
        ],
        styles.third
      )}

      {/* 行2: 募集日 / 開始時刻 / 所要時間目安 */}
      <View style={styles.row}>
        {renderDatePicker(styles.third)}
        <View
          style={[styles.field, styles.third, timePickerOpen && styles.fieldRaised]}
          onLayout={(e) => setTimeLayout(e.nativeEvent.layout)}
        >
          <Text style={styles.label}>開始時刻</Text>
          <Button
            title={
              isImmediateTime
                ? IMMEDIATE_TIME_LABEL
                : startHour && startMinute
                  ? `${startHour}:${startMinute}`
                  : '開始時刻を選択'
            }
            onPress={() => {
              setDatePickerOpen(false);
              setTimePickerOpen((v) => !v);
            }}
          />
          {errors.work_time ? <Text style={styles.error}>{errors.work_time}</Text> : null}
        </View>
        <View style={[styles.field, styles.third]}>
          <Text style={styles.label}>所要時間目安（分）</Text>
          <TextInput
            style={styles.input}
            value={durationMinutes === '未定' ? '' : durationMinutes}
            onChangeText={(text) => {
              const onlyNumber = text.replace(/[^0-9]/g, '');
              setDurationMinutes(onlyNumber || '未定');
            }}
            placeholder="未定"
            placeholderTextColor="#999"
            keyboardType="numeric"
            editable={!disabled}
          />
        </View>
      </View>

      {/* 行3: 報酬 / 集合時間 / 持ち物 */}
      <View style={styles.row}>
        {renderInput('報酬', 'reward', {
          placeholder: 'カントリーマアム1個',
          containerStyle: styles.third,
        })}
        {renderInput('集合時間（任意）', 'meet_time', {
          placeholder: '08:45',
          containerStyle: styles.third,
        })}
        {renderInput('持ち物（任意）', 'belongings', {
          placeholder: 'なし',
          containerStyle: styles.third,
        })}
      </View>

      {/* 行4: 募集タイトル */}
      <View style={styles.row}>
        {renderInput('募集タイトル', 'title', {
          placeholder: '例: 受付前の案内サポート募集',
          containerStyle: styles.twoThird,
        })}
        <View style={[styles.field, styles.third]}>
          <Text style={styles.label}>途中参加の可否</Text>
          <View style={styles.checkboxRow}>
            <Pressable
              style={styles.checkboxOption}
              onPress={() => setLateJoin(LATE_JOIN_ALLOW)}
              disabled={disabled}
            >
              <View style={[styles.radioOuter, lateJoin === LATE_JOIN_ALLOW && styles.radioOuterChecked]}>
                {lateJoin === LATE_JOIN_ALLOW ? <View style={styles.radioInner} /> : null}
              </View>
              <Text style={styles.checkboxLabel}>可</Text>
            </Pressable>
            <Pressable
              style={styles.checkboxOption}
              onPress={() => setLateJoin(LATE_JOIN_DENY)}
              disabled={disabled}
            >
              <View style={[styles.radioOuter, lateJoin === LATE_JOIN_DENY && styles.radioOuterChecked]}>
                {lateJoin === LATE_JOIN_DENY ? <View style={styles.radioInner} /> : null}
              </View>
              <Text style={styles.checkboxLabel}>不可</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* 行5: 業務内容 */}
      {renderInput('業務内容', 'description', { multiline: true, inputStyle: styles.textarea })}
      <Button title={submitLabel} onPress={handleSubmit} disabled={disabled} />
      {datePickerOpen && (
        <>
          <Pressable style={styles.portalOverlay} onPress={() => setDatePickerOpen(false)} />
          <View
            style={[
              styles.portalDropdown,
              dateLayout && {
                top: (dateLayout.y || 0) + (dateLayout.height || 0) + 4,
                left: dateLayout.x || 0,
                width: dateLayout.width || '100%',
              },
            ]}
          >
            {dateOptions.map((opt) => (
              <Text
                key={opt.value}
                style={styles.dropdownItem}
                onPress={() => {
                  updateField('work_date', opt.value);
                  setDatePickerOpen(false);
                }}
              >
                {opt.label}
              </Text>
            ))}
          </View>
        </>
      )}

      {timePickerOpen && (
        <>
          <Pressable style={styles.portalOverlay} onPress={() => setTimePickerOpen(false)} />
          <View
            style={[
              styles.timeDropdown,
              timeDropdownPlacement || {},
            ]}
          >
            <Pressable style={styles.timeQuickOption} onPress={selectImmediateNow}>
              <Text style={styles.timeQuickText}>{IMMEDIATE_TIME_LABEL}</Text>
            </Pressable>
            <View style={styles.timeGrid}>
              <View style={styles.timeColumn}>
                <Text style={styles.timeHeader}>時</Text>
                <ScrollView style={styles.timeScroll} nestedScrollEnabled>
                  {hourOptions.map((opt) => (
                    <Text
                      key={opt.value}
                      style={[
                        styles.dropdownItem,
                        !isImmediateTime && opt.value === startHour && styles.timeSelected,
                      ]}
                      onPress={() => {
                        setIsImmediateTime(false);
                        setStartHour(opt.value);
                      }}
                    >
                      {opt.label}
                    </Text>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.timeColumn}>
                <Text style={styles.timeHeader}>分</Text>
                <ScrollView style={styles.timeScroll} nestedScrollEnabled>
                  {minuteOptions.map((opt) => (
                    <Text
                      key={opt.value}
                      style={[
                        styles.dropdownItem,
                        !isImmediateTime && opt.value === startMinute && styles.timeSelected,
                      ]}
                      onPress={() => {
                        setIsImmediateTime(false);
                        setStartMinute(opt.value);
                      }}
                    >
                      {opt.label}
                    </Text>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    gap: 8,
    position: 'relative',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  field: {
    marginBottom: 8,
    position: 'relative',
  },
  label: {
    fontSize: 13,
    color: '#444',
    marginBottom: 4,
  },
  fieldRaised: {
    zIndex: 2000,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 8,
  },
  error: {
    color: '#d00',
    fontSize: 12,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  half: {
    flex: 1,
  },
  third: {
    flex: 1,
  },
  twoThird: {
    flex: 2,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dropdown: {
  },
  dropdownItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    fontSize: 14,
    backgroundColor: '#fff',
  },
  smallPicker: {
    flex: 1,
    position: 'relative',
  },
  miniDropdown: {
    position: 'absolute',
    top: 36,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    zIndex: 3100,
    maxHeight: 220,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 10,
  },
  timeDropdown: {
    position: 'absolute',
    minWidth: TIME_DROPDOWN_MIN_WIDTH,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    zIndex: 4200,
    padding: 8,
    gap: 8,
    maxHeight: 260,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 14,
    overflow: 'hidden',
  },
  timeGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  timeQuickOption: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e6e6e6',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  timeQuickText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
  },
  timeColumn: {
    flex: 1,
  },
  timeHeader: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  timeScroll: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 6,
    maxHeight: 210,
    backgroundColor: '#fff',
  },
  timeSelected: {
    backgroundColor: '#e8f0ff',
    fontWeight: '700',
  },
  checkboxRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    minHeight: 40,
  },
  checkboxOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: '#7a7a7a',
    borderRadius: 999,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterChecked: {
    borderColor: '#3b82f6',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#3b82f6',
  },
  checkboxLabel: {
    fontSize: 13,
    color: '#333',
  },
  portalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    zIndex: 3900,
  },
  portalDropdown: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 12,
    overflow: 'hidden',
    zIndex: 4100,
  },
});

export default RecruitForm;
