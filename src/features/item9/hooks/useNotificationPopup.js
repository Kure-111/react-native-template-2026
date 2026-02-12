import { useState } from 'react';

// 通知ポップアップの管理
export const useNotificationPopup = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [notificationData, setNotificationData] = useState(null);
  
  const showPopup = (data) => {
    setNotificationData(data);
    setIsVisible(true);
  };
  
  const hidePopup = () => {
    setIsVisible(false);
    setNotificationData(null);
  };
  
  const handleSend = async () => {
    // 現在は未実装
    // 将来的にERP通知システムを呼び出す
    console.log('通知送信（未実装）:', notificationData);
    hidePopup();
  };
  
  return { 
    isVisible, 
    notificationData, 
    showPopup, 
    hidePopup, 
    handleSend 
  };
};
