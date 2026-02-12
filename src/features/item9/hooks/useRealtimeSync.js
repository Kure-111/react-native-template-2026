import { useEffect } from 'react';
import { supabase } from '../../../services/supabase/client';

// Supabase Realtimeでデータ同期
export const useRealtimeSync = (table, callback) => {
  useEffect(() => {
    const subscription = supabase
      .channel(`public:${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [table, callback]);
};
