import { supabase } from '../../../services/supabase/client';

export const emergencyService = {
  // 緊急モード発動（自然災害のみ）
  activate: async (userId, disasterType, message) => {
    const { data, error } = await supabase
      .from('emergency_logs')
      .insert({
        action: 'activate',
        activated_by: userId,
        emergency_type: disasterType,
        reason: message,
      });
    
    return { data, error };
  },
  
  // 緊急モード解除
  deactivate: async (userId) => {
    const { data, error } = await supabase
      .from('emergency_logs')
      .insert({
        action: 'deactivate',
        activated_by: userId,
      });
    
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
