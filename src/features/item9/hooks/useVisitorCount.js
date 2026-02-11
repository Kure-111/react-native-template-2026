import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase/client';
import { visitorCountService } from '../services/visitorCountService';
import { generateMockVisitorHistory } from '../utils/mockData';

// 来場者カウント情報を取得（表示のみ）
export const useVisitorCount = () => {
  const [count, setCount] = useState(0);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [useMockData, setUseMockData] = useState(false);
  
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
      console.log('Fetching history from Supabase for date:', date);
      const { data, error } = await visitorCountService.getHistory(date);
      console.log('History data received:', data, 'error:', error);
      
      if (!error && data && data.length > 0) {
        setHistory(data);
        setUseMockData(false);
      } else {
        // データがない場合はモックデータを使用
        console.log('No real data found, using mock data');
        const mockData = generateMockVisitorHistory();
        setHistory(mockData);
        setUseMockData(true);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      // エラー時もモックデータを使用
      const mockData = generateMockVisitorHistory();
      setHistory(mockData);
      setUseMockData(true);
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
  
  return { count, history, loading, fetchCurrent, fetchHistory, useMockData };
};
