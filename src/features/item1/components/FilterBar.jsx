import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../shared/hooks/useTheme';

/**
 * 検索・ファセット絞り込みのUIを提供するバーコンポーネント
 * カテゴリはチップ形式で複数選択可能、企画と屋台で分離表示
 */
const FilterBar = ({
    searchQuery,
    onSearchChange,
    selectedCategories,
    onToggleCategory,
    onClearCategories,
    stallCategories,
    eventCategories,
}) => {
    const { theme } = useTheme();
    const [showFilters, setShowFilters] = useState(false);

    const hasFilters = selectedCategories.length > 0;

    const renderCategoryChip = (cat) => {
        const isSelected = selectedCategories.includes(cat.id);
        return (
            <TouchableOpacity
                key={cat.id}
                style={[
                    styles.chip,
                    {
                        backgroundColor: isSelected ? theme.primary : theme.surface,
                        borderColor: isSelected ? theme.primary : theme.border,
                        borderRadius: theme.borderRadius,
                    }
                ]}
                onPress={() => onToggleCategory(cat.id)}
                activeOpacity={0.7}
            >
                <Text style={[
                    styles.chipText,
                    { color: isSelected ? 'white' : theme.text }
                ]}>
                    {cat.name}
                </Text>
                {isSelected && (
                    <Ionicons name="checkmark" size={14} color="white" style={{ marginLeft: 2 }} />
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>

            {/* 上段：検索バーとフィルター表示トグル */}
            <View style={styles.topRow}>
                <View style={[styles.searchContainer, { backgroundColor: theme.background, borderRadius: theme.borderRadius }]}>
                    <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.text }]}
                        placeholder="キーワードで検索 (名前・団体名)"
                        placeholderTextColor={theme.textSecondary}
                        value={searchQuery}
                        onChangeText={onSearchChange}
                        autoCapitalize="none"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => onSearchChange('')} style={styles.clearButton}>
                            <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>

                <TouchableOpacity
                    style={[
                        styles.filterToggleBtn,
                        {
                            backgroundColor: (showFilters || hasFilters) ? theme.primary : theme.background,
                            borderRadius: theme.borderRadius,
                        }
                    ]}
                    onPress={() => setShowFilters(!showFilters)}
                >
                    <Ionicons
                        name="funnel-outline"
                        size={22}
                        color={(showFilters || hasFilters) ? 'white' : theme.text}
                    />
                    {hasFilters && (
                        <View style={styles.filterBadge}>
                            <Text style={styles.filterBadgeText}>{selectedCategories.length}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* 下段：ファセット絞り込み（トグルで表示/非表示） */}
            {showFilters && (
                <View style={styles.filtersContainer}>

                    {/* クリアボタン */}
                    {hasFilters && (
                        <TouchableOpacity
                            style={[styles.clearAllBtn, { borderColor: theme.border, borderRadius: theme.borderRadius }]}
                            onPress={onClearCategories}
                        >
                            <Ionicons name="close" size={14} color={theme.textSecondary} />
                            <Text style={[styles.clearAllText, { color: theme.textSecondary }]}>絞り込み解除</Text>
                        </TouchableOpacity>
                    )}

                    {/* 企画カテゴリ */}
                    {eventCategories.length > 0 && (
                        <View style={styles.categorySection}>
                            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                                企画カテゴリ
                            </Text>
                            <View style={styles.chipRow}>
                                {eventCategories.map(renderCategoryChip)}
                            </View>
                        </View>
                    )}

                    {/* 屋台カテゴリ */}
                    {stallCategories.length > 0 && (
                        <View style={styles.categorySection}>
                            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                                屋台カテゴリ
                            </Text>
                            <View style={styles.chipRow}>
                                {stallCategories.map(renderCategoryChip)}
                            </View>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 12,
        borderBottomWidth: 1,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 44,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: '100%',
        fontSize: 16,
        ...Platform.select({
            web: { outlineStyle: 'none' }
        }),
    },
    clearButton: {
        padding: 4,
    },
    filterToggleBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    filterBadge: {
        position: 'absolute',
        top: 2,
        right: 2,
        backgroundColor: '#ef4444',
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    filterBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    filtersContainer: {
        marginTop: 12,
        gap: 12,
    },
    clearAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderWidth: 1,
    },
    clearAllText: {
        fontSize: 12,
    },
    categorySection: {
        gap: 6,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginLeft: 2,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '500',
    },
});

export default FilterBar;
