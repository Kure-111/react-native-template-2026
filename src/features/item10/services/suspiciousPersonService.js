import { supabase } from '../../../services/supabase/client';

export const suspiciousPersonService = {
  // 一覧取得
  getAll: async (limit = 5) => {
    const { data, error } = await supabase
      .from('suspicious_persons')
      .select('*')
      .order('discovered_at', { ascending: false })
      .limit(limit);
    return { data, error };
  },
  
  // 新規登録
  create: async (personData, photoFile) => {
    let photoUrl = null;
    
    // TODO: Google Driveに写真アップロード実装
    // if (photoFile) {
    //   photoUrl = await uploadToGoogleDrive(photoFile, 'suspicious_persons');
    // }
    
    const { data, error } = await supabase
      .from('suspicious_persons')
      .insert({ ...personData, photo_url: photoUrl });
    
    return { data, error };
  },
  
  // ステータス更新
  updateStatus: async (id, status) => {
    const updates = { status, updated_at: new Date().toISOString() };
    if (status === 'resolved') {
      updates.resolved_at = new Date().toISOString();
    }
    const { data, error } = await supabase
      .from('suspicious_persons')
      .update(updates)
      .eq('id', id);
    return { data, error };
  },
};
