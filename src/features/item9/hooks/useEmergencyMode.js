import { useState, useEffect } from 'react';
import { emergencyService } from '../services/emergencyService';

// 緊急モードの状態管理（自然災害のみ）
export const useEmergencyMode = () => {
  const [isEmergency, setIsEmergency] = useState(false);
  const [disasterType, setDisasterType] = useState('');
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState([]);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [notificationData, setNotificationData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // APIから災害情報を定期的にチェック
  useEffect(() => {
    const checkDisasterStatus = async () => {
      try {
        const result = await emergencyService.getCurrentDisasterStatus();
        if (result.data && !result.error) {
          const { is_active, disaster_type, message: disasterMessage } = result.data;
          
          if (is_active && !isEmergency) {
            // 新しい災害が発生
            setIsEmergency(true);
            setDisasterType(disaster_type);
            setMessage(disasterMessage || '');
            setNotificationData({
              to: '全員',
              message: `【緊急】${disaster_type}：${disasterMessage || '災害が発生しました'}`,
              additionalInfo: '全員のERP画面が避難情報画面に切り替わります',
            });
            setShowNotificationPopup(true);
          } else if (!is_active && isEmergency) {
            // 災害が解除された
            setIsEmergency(false);
            setDisasterType('');
            setMessage('');
            setNotificationData({
              to: '全員',
              message: '緊急モードが解除されました',
            });
            setShowNotificationPopup(true);
          }
        }
      } catch (error) {
        console.error('Error checking disaster status:', error);
      }
    };
    
    // 初回チェック
    checkDisasterStatus();
    
    // 10秒ごとにチェック
    const interval = setInterval(checkDisasterStatus, 10000);
    
    return () => clearInterval(interval);
  }, [isEmergency]);
  
  const deactivate = async (userId) => {
    setLoading(true);
    try {
      const result = await emergencyService.deactivate(userId);
      if (!result.error) {
        setIsEmergency(false);
        setDisasterType('');
        setMessage('');
      }
    } catch (error) {
      console.error('Error deactivating emergency mode:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await emergencyService.getHistory();
      if (!error && data) {
        setHistory(data);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return { 
    isEmergency, 
    disasterType, 
    message, 
    history,
    loading,
    showNotificationPopup,
    notificationData,
    setShowNotificationPopup,
    deactivate, 
    fetchHistory 
  };
};
