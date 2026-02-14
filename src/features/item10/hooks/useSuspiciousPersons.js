import { useState, useEffect } from 'react';
import { suspiciousPersonService } from '../services/suspiciousPersonService';

// 不審者情報の取得・登録・更新を管理
export const useSuspiciousPersons = () => {
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [notificationData, setNotificationData] = useState(null);
  
  const fetchPersons = async () => {
    setLoading(true);
    try {
      const { data, error } = await suspiciousPersonService.getAll();
      if (!error && data) {
        setPersons(data);
      }
    } catch (error) {
      console.error('Error fetching suspicious persons:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const addPerson = async (data, photoFile) => {
    setLoading(true);
    try {
      const result = await suspiciousPersonService.create(data, photoFile);
      if (!result.error) {
        setNotificationData({
          to: '全スタッフ',
          message: `${data.location}で不審者が発見されました`,
        });
        setShowNotificationPopup(true);
        await fetchPersons();
      }
    } catch (error) {
      console.error('Error adding suspicious person:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const updateStatus = async (id, status) => {
    setLoading(true);
    try {
      await suspiciousPersonService.updateStatus(id, status);
      await fetchPersons();
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchPersons();
  }, []);
  
  return { 
    persons, 
    loading, 
    showNotificationPopup, 
    notificationData,
    setShowNotificationPopup,
    fetchPersons, 
    addPerson, 
    updateStatus 
  };
};
