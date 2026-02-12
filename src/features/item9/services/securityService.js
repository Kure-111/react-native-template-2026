import { supabase } from '../../../services/supabase/client';

// 注意：警備配置情報の詳細仕様は未定（今後検討）
export const securityService = {
  // 配置情報取得（警備員情報含む、無線チャンネル情報も）
  getPlacements: async () => {
    const { data, error } = await supabase
      .from('security_placements')
      .select('*, security_members(*)')
      .eq('status', 'on_duty');
    return { data, error };
  },
  
  // ステータス更新
  updateStatus: async (id, status, lat, lon) => {
    const { data, error } = await supabase
      .from('security_placements')
      .update({
        status,
        latitude: lat,
        longitude: lon,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    return { data, error };
  },
};
