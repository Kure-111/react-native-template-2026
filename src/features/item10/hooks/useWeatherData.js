import { useState, useEffect } from 'react';
import { weatherService } from '../services/weatherService';

// 天気情報APIからデータ取得（降水量含む）
export const useWeatherData = (latitude, longitude) => {
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [rainfall, setRainfall] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const fetchWeather = async () => {
    setLoading(true);
    try {
      const data = await weatherService.getCurrentWeather(latitude, longitude);
      if (data) {
        setWeather(data);
        setRainfall(data.rainfall || 0);
      }
    } catch (error) {
      console.error('Error fetching weather:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchForecast = async () => {
    try {
      const data = await weatherService.getForecast(latitude, longitude);
      if (data) {
        setForecast(data.list || []);
      }
    } catch (error) {
      console.error('Error fetching forecast:', error);
    }
  };
  
  useEffect(() => {
    if (latitude && longitude) {
      fetchWeather();
      fetchForecast();
      
      const interval = setInterval(fetchWeather, 300000); // 5分ごと
      return () => clearInterval(interval);
    }
  }, [latitude, longitude]);
  
  return { weather, forecast, rainfall, loading, refetch: fetchWeather };
};
