/**
 * ”»é¢
 * ©Ÿèƒ½ã®ãƒ¡ã‚¤ãƒ³ç”»é¢
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  useWindowDimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import TicketDistributionCard from '../components/TicketDistributionCard';
import useTicketDistributionData from '../hooks/useTicketDistributionData';
import {
  DISTRIBUTION_TYPES,
  SCREEN_LABELS,
} from '../constants';

/** ãƒ–ãƒ¬ãƒ¼ã‚¯ãƒã‚¤ãƒ³ãƒˆï¼ˆã‚¹ãƒžãƒ›/PCåˆ‡ã‚Šæ›¿ãˆï¼‰ */
const MOBILE_BREAKPOINT = 768;

/** ãƒ•ã‚£ãƒ«ã‚¿ç¨®åˆ¥ */
const FILTER_TYPES = {
  /** å…¨ã¦ */
  ALL: 'all',
  /** é †æ¬¡æ¡ˆå†…åˆ¶ */
  SEQUENTIAL: DISTRIBUTION_TYPES.SEQUENTIAL,
  /** æ™‚é–“æž å®šå“¡åˆ¶ */
  TIME_SLOT: DISTRIBUTION_TYPES.TIME_SLOT,
};

import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { ThemedHeader } from '../../../shared/components/ThemedHeader';
import PlaceholderContent from '../../../shared/components/PlaceholderContent';

/** ç”»é¢å */
const SCREEN_NAME = 'é …ç›®3';

/**
 * ”»é¢ã‚³ãƒ³ãƒãƒ¼ãƒãƒ³ãƒˆ
 * @param {Object} props - ã‚³ãƒ³ãƒãƒ¼ãƒãƒ³ãƒˆãƒ—ãƒ­ãƒ‘ãƒ†ã‚£
 * @param {Object} props.navigation - React Navigationã®navigationã‚ªãƒ–ã‚¸ã‚§ã‚¯ãƒˆ
 * @returns {JSX.Element} ”»é¢
 */
const Item3Screen = ({ navigation }) => {
  /** ç”»é¢ã‚µã‚¤ã‚ºå–å¾— */
  const { width } = useWindowDimensions();
  /** ãƒ¢ãƒã‚¤ãƒ«åˆ¤å®š */
  const isMobile = width < MOBILE_BREAKPOINT;
  /** ãƒ•ã‚£ãƒ«ã‚¿çŠ¶æ…‹ */
  const [selectedFilter, setSelectedFilter] = useState(FILTER_TYPES.ALL);
  /** æ—¥ä»˜æ¤œç´¢æ–‡å­—åˆ— */
  const [dateQuery, setDateQuery] = useState('');
  /** æ—¥ä»˜ãƒ—ãƒ«ãƒ€ã‚¦ãƒ³è¡¨ç¤º */
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  /** é–‹å§‹æ™‚é–“ãƒ•ã‚£ãƒ«ã‚¿ */
  const [selectedStartTime, setSelectedStartTime] = useState('');
  /** é–‹å§‹æ™‚é–“ãƒ—ãƒ«ãƒ€ã‚¦ãƒ³è¡¨ç¤º */
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);

  /** æ—¥ä»˜ãƒ—ãƒ«ãƒ€ã‚¦ãƒ³å€™è£œ */
  const dateOptions = [
    { value: '2026-11-02', label: '11/2(æœˆ)' },
    { value: '2026-11-03', label: '11/3(ç«)' },
    { value: '2026-11-04', label: '11/4(æ°´)' },
  ];
  /** é…å¸ƒçŠ¶æ³ãƒ‡ãƒ¼ã‚¿å–å¾— */
  const {
    distributionList,
    isLoading,
    errorMessage,
    lastUpdatedAt,
    refresh,
  } = useTicketDistributionData();

  /** ãƒ•ã‚£ãƒ«ã‚¿æ¸ˆã¿ãƒ‡ãƒ¼ã‚¿ */
  const filteredList = useMemo(() => {
  /** æ—¥ä»˜æ¤œç´¢æ–‡å­—åˆ— */
  const normalizedDateQuery = dateQuery.trim();
    /** é–‹å§‹æ™‚é–“æ¤œç´¢ */
    const normalizedStartTime = selectedStartTime.trim();

    const typeFilteredList = selectedFilter === FILTER_TYPES.ALL
      ? distributionList
      : distributionList.filter(
          (item) => item.type === selectedFilter
        );

    const dateFilteredList = normalizedDateQuery
      ? typeFilteredList.filter((item) => item.date === normalizedDateQuery)
      : typeFilteredList;

    if (!normalizedStartTime) {
      return dateFilteredList;
    }

    return dateFilteredList.map((item) => {
      if (item.type !== FILTER_TYPES.TIME_SLOT) {
        return item;
      }

      /** é–‹å§‹æ™‚é–“ã§çµžã‚Šè¾¼ã¿ */
      const filteredTimeSlots = (item.timeSlots || []).filter(
        (slot) => slot.startTime?.slice(0, 5) === normalizedStartTime
      );

      return {
        ...item,
        timeSlots: filteredTimeSlots,
      };
    });
  }, [distributionList, selectedFilter, dateQuery, selectedStartTime]);

  /** é–‹å§‹æ™‚é–“ãƒ—ãƒ«ãƒ€ã‚¦ãƒ³å€™è£œ */
  const startTimeOptions = useMemo(() => {
    /** é–‹å§‹æ™‚åˆ»ä¸€è¦§ */
    const timeSlotList = distributionList
      .filter((item) => item.type === FILTER_TYPES.TIME_SLOT)
      .flatMap((item) => item.timeSlots || [])
      .map((slot) => slot.startTime?.slice(0, 5))
      .filter(Boolean);

    /** é‡è¤‡æŽ’é™¤æ¸ˆã¿ãƒžãƒƒãƒ— */
    const uniqueMap = new Map();

    timeSlotList.forEach((timeValue) => {
      if (!uniqueMap.has(timeValue)) {
        uniqueMap.set(timeValue, timeValue);
      }
    });

    return Array.from(uniqueMap.values()).sort();
  }, [distributionList]);

  /**
   * ãƒ‰ãƒ­ãƒ¯ãƒ¼ã‚’é–‹ã
   */
  const openDrawer = () => {
    navigation.openDrawer();
  };
  const { theme } = useTheme();

  /**
   * ãƒ•ã‚£ãƒ«ã‚¿ã‚’åˆ‡ã‚Šæ›¿ãˆã‚‹
   * @param {string} filterType - ãƒ•ã‚£ãƒ«ã‚¿ç¨®åˆ¥
   */
  const handleFilterChange = (filterType) => {
    setSelectedFilter(filterType);

    if (
      filterType !== FILTER_TYPES.TIME_SLOT &&
      filterType !== FILTER_TYPES.ALL
    ) {
      setSelectedStartTime('');
      setIsTimeDropdownOpen(false);
    }
  };

  /**
   * æ—¥ä»˜æ¤œç´¢ã‚’æ›´æ–°ã™ã‚‹
   * @param {string} value - å…¥åŠ›å€¤
   */
  const handleDateSelect = (value) => {
    setDateQuery(value);
    setIsDateDropdownOpen(false);
  };

  /**
   * æ—¥ä»˜ãƒ—ãƒ«ãƒ€ã‚¦ãƒ³ã‚’é–‹é–‰ã™ã‚‹
   */
  const toggleDateDropdown = () => {
    setIsDateDropdownOpen((prev) => !prev);
  };

  /**
   * é–‹å§‹æ™‚é–“ã‚’é¸æŠžã™ã‚‹
   * @param {string} value - é–‹å§‹æ™‚é–“
   */
  const handleStartTimeSelect = (value) => {
    setSelectedStartTime(value);
    setIsTimeDropdownOpen(false);
  };

  /**
   * é–‹å§‹æ™‚é–“ãƒ—ãƒ«ãƒ€ã‚¦ãƒ³ã‚’é–‹é–‰ã™ã‚‹
   */
  const toggleTimeDropdown = () => {
    setIsTimeDropdownOpen((prev) => !prev);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ãƒ˜ãƒƒãƒ€ãƒ¼ */}
      <View style={styles.header}>
        {isMobile && (
          <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
            <Text style={styles.menuButtonText}>â˜°</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{SCREEN_LABELS.title}</Text>
        {isMobile && <View style={styles.menuButton} />}
      </View>

      {/* ã‚³ãƒ³ãƒ†ãƒ³ãƒ„ */}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.filterContainer}>
          <Text style={styles.sectionTitle}>è¡¨ç¤ºãƒ•ã‚£ãƒ«ã‚¿</Text>
          <View style={styles.filterButtons}>
            {[
              { label: SCREEN_LABELS.all, value: FILTER_TYPES.ALL },
              { label: SCREEN_LABELS.sequential, value: FILTER_TYPES.SEQUENTIAL },
              { label: SCREEN_LABELS.timeSlot, value: FILTER_TYPES.TIME_SLOT },
            ].map((filter) => (
              <TouchableOpacity
                key={filter.value}
                style={[
                  styles.filterButton,
                  selectedFilter === filter.value && styles.filterButtonActive,
                ]}
                onPress={() => handleFilterChange(filter.value)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    selectedFilter === filter.value && styles.filterButtonTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.dateFilterSection}>
            <Text style={styles.searchLabel}>{SCREEN_LABELS.dateSearch}</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={toggleDateDropdown}
            >
              <Text style={styles.dropdownButtonText}>
                {dateQuery
                  ? dateOptions.find((option) => option.value === dateQuery)?.label
                  : SCREEN_LABELS.allDates}
              </Text>
              <Text style={styles.dropdownIcon}>{isDateDropdownOpen ? 'â–²' : 'â–¼'}</Text>
            </TouchableOpacity>
            {isDateDropdownOpen && (
              <View style={styles.dropdownMenu}>
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => handleDateSelect('')}
                >
                  <Text style={styles.dropdownItemText}>{SCREEN_LABELS.allDates}</Text>
                </TouchableOpacity>
                {dateOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.dropdownItem}
                    onPress={() => handleDateSelect(option.value)}
                  >
                    <Text style={styles.dropdownItemText}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          {(selectedFilter === FILTER_TYPES.TIME_SLOT || selectedFilter === FILTER_TYPES.ALL) && (
            <View style={styles.dateFilterSection}>
              <Text style={styles.searchLabel}>{SCREEN_LABELS.timeSearch}</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={toggleTimeDropdown}
              >
                <Text style={styles.dropdownButtonText}>
                  {selectedStartTime || SCREEN_LABELS.allTimes}
                </Text>
                <Text style={styles.dropdownIcon}>{isTimeDropdownOpen ? 'â–²' : 'â–¼'}</Text>
              </TouchableOpacity>
              {isTimeDropdownOpen && (
                <View style={styles.dropdownMenu}>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => handleStartTimeSelect('')}
                  >
                    <Text style={styles.dropdownItemText}>{SCREEN_LABELS.allTimes}</Text>
                  </TouchableOpacity>
                  {startTimeOptions.map((timeValue) => (
                    <TouchableOpacity
                      key={timeValue}
                      style={styles.dropdownItem}
                      onPress={() => handleStartTimeSelect(timeValue)}
                    >
                      <Text style={styles.dropdownItemText}>{timeValue}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.refreshRow}>
          <Text style={styles.refreshText}>
            æœ€çµ‚æ›´æ–°: {lastUpdatedAt ? lastUpdatedAt.toLocaleString('ja-JP') : 'å–å¾—ä¸­'}
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={refresh}>
            <Text style={styles.refreshButtonText}>æ›´æ–°</Text>
          </TouchableOpacity>
        </View>

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>ãƒ‡ãƒ¼ã‚¿ã‚’å–å¾—ä¸­...</Text>
          </View>
        )}

        {!isLoading && errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {!isLoading && !errorMessage && filteredList.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>è¡¨ç¤ºã§ãã‚‹ãƒ‡ãƒ¼ã‚¿ãŒã‚ã‚Šã¾ã›ã‚“</Text>
          </View>
        )}

        {!isLoading && !errorMessage && filteredList.length > 0 && (
          <View style={styles.cardList}>
            {filteredList.map((item) => (
              <TicketDistributionCard key={`${item.eventId}_${item.eventDateId}`} item={item} />
            ))}
          </View>
        )}
      </ScrollView>
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ThemedHeader title={SCREEN_NAME} navigation={navigation} />
      <PlaceholderContent title={SCREEN_NAME} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 8,
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#ecf0f1',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 13,
    color: '#2c3e50',
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  dateFilterSection: {
    marginTop: 16,
  },
  searchLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 6,
  },
  dropdownButton: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fdfdfd',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownButtonText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  dropdownIcon: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  dropdownMenu: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#2c3e50',
  },
  refreshRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  refreshText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  refreshButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  refreshButtonText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#7f8c8d',
  },
  errorBox: {
    backgroundColor: '#fdecea',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  errorText: {
    color: '#c0392b',
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#95a5a6',
    fontSize: 14,
  },
  cardList: {
    gap: 12,
  },
});

export default Item3Screen;
