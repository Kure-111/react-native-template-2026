import { supabase } from '../../../services/supabase/client';

export const emergencyService = {
  // 現在の災害状態を取得
  getCurrentDisasterStatus: async () => {
    const { data, error } = await supabase
      .from('disaster_status')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    return { data, error };
  },
  
  // 緊急モード解除
  deactivate: async (userId) => {
    const { data, error } = await supabase
      .from('disaster_status')
      .update({
        is_active: false,
        deactivated_by: userId,
        deactivated_at: new Date().toISOString(),
      })
      .eq('is_active', true);
    
    return { data, error };
  },
  
  // 履歴取得
  getHistory: async (limit = 10) => {
    const { data, error } = await supabase
      .from('emergency_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    return { data, error };
  },
};
