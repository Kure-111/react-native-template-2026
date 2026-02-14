import { useState, useEffect } from 'react';
import { securityService } from '../services/securityService';

// 警備員配置情報の管理（無線チャンネル情報含む）
// 注意：詳細仕様は未定（今後検討）
export const useSecurityPlacements = () => {
  const [placements, setPlacements] = useState([]);
  const [viewMode, setViewMode] = useState('map');
  const [loading, setLoading] = useState(false);
  
  const fetchPlacements = async () => {
    setLoading(true);
    try {
      const { data, error } = await securityService.getPlacements();
      if (!error && data) {
        setPlacements(data);
      }
    } catch (error) {
      console.error('Error fetching placements:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const updateStatus = async (id, status, lat, lon) => {
    try {
      await securityService.updateStatus(id, status, lat, lon);
      await fetchPlacements();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };
  
  const updateLocation = async (id, lat, lon) => {
    try {
      await securityService.updateStatus(id, null, lat, lon);
      await fetchPlacements();
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };
  
  useEffect(() => {
    fetchPlacements();
    
    const interval = setInterval(fetchPlacements, 30000); // 30秒ごと
    return () => clearInterval(interval);
  }, []);
  
  return { 
    placements, 
    viewMode, 
    loading,
    setViewMode, 
    fetchPlacements, 
    updateStatus, 
    updateLocation 
  };
};
