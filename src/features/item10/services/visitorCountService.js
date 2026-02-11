import { supabase } from '../../../services/supabase/client';

export const visitorCountService = {
  // 現在のカウント取得
  getCurrent: async () => {
    const { data, error } = await supabase
      .from('visitor_counts')
      .select('*')
      .order('counted_at', { ascending: false })
      .limit(1);
    return { data: data?.[0], error };
  },
  
  // カウント更新
  updateCount: async (count, operation, userId) => {
    const { data, error } = await supabase
      .from('visitor_counts')
      .insert({
        count,
        counted_at: new Date().toISOString(),
        operation,
        updated_by: userId,
      });
    return { data, error };
  },
  
  // 時間帯別履歴取得
  getHistory: async (date) => {
    const { data, error } = await supabase
      .from('visitor_counts')
      .select('*')
      .gte('counted_at', `${date}T00:00:00Z`)
      .lte('counted_at', `${date}T23:59:59Z`)
      .order('counted_at', { ascending: true });
    return { data, error };
  },
};
