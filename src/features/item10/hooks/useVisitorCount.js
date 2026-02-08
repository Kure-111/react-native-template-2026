import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase/client';
import { visitorCountService } from '../services/visitorCountService';

// 来場者カウント情報を取得（表示のみ）
export const useVisitorCount = () => {
  const [count, setCount] = useState(0);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const fetchCurrent = async () => {
    setLoading(true);
    try {
      const { data, error } = await visitorCountService.getCurrent();
      if (!error && data) {
        setCount(data.count);
      }
    } catch (error) {
      console.error('Error fetching current count:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchHistory = async (date) => {
    setLoading(true);
    try {
      const { data, error } = await visitorCountService.getHistory(date);
      if (!error && data) {
        setHistory(data);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // リアルタイム同期
  useEffect(() => {
    fetchCurrent();
    
    const subscription = supabase
      .channel('visitor_counts')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'visitor_counts' 
      }, () => fetchCurrent())
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  return { count, history, loading, fetchCurrent, fetchHistory };
};
