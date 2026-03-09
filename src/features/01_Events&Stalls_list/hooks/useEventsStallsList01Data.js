import { useState, useEffect } from 'react';
import { getSupabaseClient } from '../../../services/supabase/client';
import { TABS, SORT_OPTIONS } from '../constants';

/**
 * Supabaseから提供されるItem1データ（屋台・企画）を取得し、フィルタリング・ソートを行うフック
 *
 * @param {string} tabInfo 現在選択中のタブ (TABS.ALL | TABS.STALLS | TABS.EVENTS)
 * @param {string} searchQuery 検索キーワード（企画名/屋台名または団体名）
 * @param {string[]} selectedCategories 選択中のカテゴリIDの配列（空配列 = すべて表示）
 * @param {string} sortOrder ソート順オプション
 * @returns {Object} データ、カテゴリ一覧、読み込み状態、エラー情報
 */
export const useEventsStallsList01Data = (tabInfo, searchQuery, selectedCategories, sortOrder, selectedArea) => {
    const [data, setData] = useState([]);
    const [stallCategories, setStallCategories] = useState([]);
    const [eventCategories, setEventCategories] = useState([]);
    const [areas, setAreas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const supabase = getSupabaseClient();

                // --- 1. 取得するテーブルの決定 ---
                let fetchStalls = false;
                let fetchEvents = false;

                if (tabInfo === TABS.ALL) {
                    fetchStalls = true;
                    fetchEvents = true;
                } else if (tabInfo === TABS.STALLS) {
                    fetchStalls = true;
                } else if (tabInfo === TABS.EVENTS) {
                    fetchEvents = true;
                }

                // 並行してデータフェッチ
                const promises = [];
                if (fetchStalls) {
                    promises.push(
                        supabase.from('stalls')
                            .select('id, name, description, image_path, category_id, updated_at, location_id, stall_organization_id, stall_locations(name, area_id, building_locations(name, display_order)), stall_organizations(name)')
                            .then(res => ({ ...res, type: TABS.STALLS }))
                    );
                }
                if (fetchEvents) {
                    promises.push(
                        supabase.from('events')
                            .select('id, name, description, image_path, category_id, updated_at, location_id, event_organization_id, event_locations(name, building_locations(name, area_id, display_order)), event_organizations(name)')
                            .then(res => ({ ...res, type: TABS.EVENTS }))
                    );
                }

                // カテゴリ・エリアマスタの取得
                promises.push(
                    supabase.from('area_locations')
                        .select('id, name')
                        .then(res => ({ ...res, type: 'AREA_LOCATIONS' }))
                );
                promises.push(
                    supabase.from('stall_categorys')
                        .select('id, name, display_order')
                        .order('display_order', { ascending: true })
                        .then(res => ({ ...res, type: 'STALL_CATEGORIES' }))
                );
                promises.push(
                    supabase.from('event_categorys')
                        .select('id, name, display_order')
                        .order('display_order', { ascending: true })
                        .then(res => ({ ...res, type: 'EVENT_CATEGORIES' }))
                );

                const results = await Promise.all(promises);

                // エラーチェック
                for (const result of results) {
                    if (result.error) {
                        console.error(`Supabase error fetching ${result.type}:`, result.error);
                        throw new Error(result.error.message);
                    }
                }

                // --- 2. カテゴリマスタの処理 ---
                let categoryMap = {};        // id -> name
                let categoryOrderMap = {};   // id -> display_order
                let stallCatsList = [];
                let eventCatsList = [];

                const stallCatsResult = results.find(r => r.type === 'STALL_CATEGORIES');
                if (stallCatsResult && stallCatsResult.data) {
                    stallCatsList = stallCatsResult.data;
                    stallCatsResult.data.forEach(cat => {
                        categoryMap[cat.id] = cat.name;
                        categoryOrderMap[cat.id] = cat.display_order;
                    });
                }

                const eventCatsResult = results.find(r => r.type === 'EVENT_CATEGORIES');
                if (eventCatsResult && eventCatsResult.data) {
                    eventCatsList = eventCatsResult.data;
                    eventCatsResult.data.forEach(cat => {
                        categoryMap[cat.id] = cat.name;
                        categoryOrderMap[cat.id] = cat.display_order;
                    });
                }

                // --- 2.5 エリアマスタの処理 ---
                let areasList = [];
                const areasResult = results.find(r => r.type === 'AREA_LOCATIONS');
                if (areasResult && areasResult.data) {
                    areasList = areasResult.data;
                }

                // --- 3. データの結合と正規化 ---
                let combinedData = [];

                results.forEach(result => {
                    if ((result.type === TABS.STALLS || result.type === TABS.EVENTS) && result.data) {
                        const mappedData = result.data.map(item => {
                            let locationName = '';
                            let listLocationName = '';
                            let areaId = null;
                            let buildingLocationOrder = 9999;

                            if (result.type === TABS.STALLS && item.stall_locations) {
                                const lName = item.stall_locations.name || '';
                                const bName = item.stall_locations.building_locations?.name || '';
                                listLocationName = bName ? `${bName}前` : lName;

                                if (bName && lName && bName !== lName) {
                                    locationName = `${bName} ${lName}`;
                                } else {
                                    locationName = bName || lName;
                                }
                                areaId = item.stall_locations.area_id;
                                buildingLocationOrder = item.stall_locations.building_locations?.display_order ?? 9999;
                            } else if (result.type === TABS.EVENTS && item.event_locations) {
                                const lName = item.event_locations.name || '';
                                const bName = item.event_locations.building_locations?.name || '';
                                listLocationName = bName || lName;

                                if (bName && lName && bName !== lName) {
                                    locationName = `${bName} ${lName}`;
                                } else {
                                    locationName = bName || lName;
                                }
                                areaId = item.event_locations.building_locations?.area_id || null;
                                buildingLocationOrder = item.event_locations.building_locations?.display_order ?? 9999;
                            }

                            let groupName = '';
                            if (result.type === TABS.STALLS) {
                                groupName = item.stall_organizations?.name || '';
                            } else {
                                groupName = item.event_organizations?.name || '';
                            }

                            return {
                                ...item,
                                itemType: result.type,
                                displayName: item.name,
                                locationName: locationName,
                                listLocationName: listLocationName,
                                buildingLocationOrder,
                                groupName: groupName,
                                categoryName: categoryMap[item.category_id] || item.category_id,
                                categoryDisplayOrder: categoryOrderMap[item.category_id] ?? 9999,
                                areaId: areaId,
                            };
                        });
                        combinedData = [...combinedData, ...mappedData];
                    }
                });

                // --- 4. フィルタリング処理 ---
                let filteredData = combinedData;

                // エリアで絞り込み
                if (selectedArea && selectedArea !== 'すべて') {
                    filteredData = filteredData.filter(item => item.areaId === selectedArea);
                }

                // カテゴリで絞り込み（複数選択対応）
                if (selectedCategories && selectedCategories.length > 0) {
                    filteredData = filteredData.filter(item =>
                        selectedCategories.includes(item.category_id)
                    );
                }

                // キーワードで絞り込み（あいまい検索）
                if (searchQuery) {
                    const query = searchQuery.toLowerCase();
                    filteredData = filteredData.filter(item => {
                        const nameMatch = item.displayName?.toLowerCase().includes(query);
                        const groupMatch = item.groupName?.toLowerCase().includes(query);
                        return nameMatch || groupMatch;
                    });
                }

                // --- 5. 並べ替え処理 ---
                filteredData.sort((a, b) => {
                    switch (sortOrder) {
                        case SORT_OPTIONS.NAME_ASC:
                            return (a.displayName || '').localeCompare(b.displayName || '', 'ja');
                        case SORT_OPTIONS.CATEGORY_ASC: {
                            const orderDiff = (a.categoryDisplayOrder ?? 9999) - (b.categoryDisplayOrder ?? 9999);
                            if (orderDiff !== 0) return orderDiff;
                            if (a.itemType !== b.itemType) {
                                return a.itemType === TABS.EVENTS ? -1 : 1;
                            }
                            return 0;
                        }
                        case SORT_OPTIONS.LOCATION_ASC: {
                            const diff = (a.buildingLocationOrder ?? 9999) - (b.buildingLocationOrder ?? 9999);
                            if (diff !== 0) return diff;
                            return (a.listLocationName || '').localeCompare(b.listLocationName || '', 'ja');
                        }
                        case SORT_OPTIONS.GROUP_ASC:
                            return (a.groupName || '').localeCompare(b.groupName || '', 'ja');
                        default:
                            return 0;
                    }
                });

                if (isMounted) {
                    setData(filteredData);
                    setStallCategories(stallCatsList);
                    setEventCategories(eventCatsList);
                    setAreas(areasList);
                }
            } catch (err) {
                if (isMounted) {
                    setError(err.message || 'データの取得に失敗しました');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            isMounted = false;
        };
    }, [tabInfo, searchQuery, selectedCategories, sortOrder, selectedArea]);

    return { data, stallCategories, eventCategories, areas, loading, error };
};
