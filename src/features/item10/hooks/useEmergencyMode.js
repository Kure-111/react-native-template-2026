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
  
  const activate = async (userId, type, customMessage) => {
    setLoading(true);
    try {
      const result = await emergencyService.activate(userId, type, customMessage);
      if (!result.error) {
        setIsEmergency(true);
        setDisasterType(type);
        setMessage(customMessage);
        setNotificationData({
          to: '全員',
          message: `【緊急】${type}：${customMessage}`,
          additionalInfo: '全員のERP画面が避難情報画面に切り替わります',
        });
        setShowNotificationPopup(true);
      }
    } catch (error) {
      console.error('Error activating emergency mode:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const deactivate = async (userId) => {
    setLoading(true);
    try {
      const result = await emergencyService.deactivate(userId);
      if (!result.error) {
        setIsEmergency(false);
        setDisasterType('');
        setMessage('');
        setNotificationData({
          to: '全員',
          message: '緊急モードが解除されました',
        });
        setShowNotificationPopup(true);
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
    setDisasterType,
    setMessage,
    activate, 
    deactivate, 
    fetchHistory 
  };
};
