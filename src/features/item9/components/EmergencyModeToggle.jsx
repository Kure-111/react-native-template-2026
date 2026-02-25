import React from 'react';
import { View, Text, StyleSheet, Switch, Animated, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '../../../shared/components/icons';
import { useTheme } from '../../../shared/hooks/useTheme';

// 緊急モードスイッチ
export const EmergencyModeToggle = ({ isEmergency, onToggle, disabled }) => {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isMobile = width < 480;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  
  // 緊急時の点滅アニメーション
  React.useEffect(() => {
    if (isEmergency) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isEmergency]);
  
  return (
    <View style={[
      styles.container, 
      { backgroundColor: theme.surface, borderColor: theme.border },
      isEmergency && styles.emergencyContainer,
      isMobile && styles.containerMobile
    ]}>
      <View style={[styles.header, isMobile && styles.headerMobile]}>
        <View style={styles.titleContainer}>
          <Animated.View style={[
            styles.iconContainer, 
            isMobile && styles.iconContainerMobile,
            isEmergency && styles.emergencyIconContainer,
            isEmergency && { transform: [{ scale: pulseAnim }] }
          ]}>
            <MaterialCommunityIcons 
              name={isEmergency ? "alert-octagon" : "shield-check"} 
              size={isMobile ? 24 : 32} 
              color={isEmergency ? "#FFFFFF" : "#4CAF50"} 
            />
          </Animated.View>
          <View style={styles.textContainer}>
            <Text style={[
              styles.title, 
              { color: theme.text },
              isEmergency && styles.emergencyTitle,
              isMobile && styles.titleMobile
            ]}>
              緊急モード
            </Text>
            <View style={styles.statusContainer}>
              <View style={[
                styles.statusDot,
                isEmergency ? styles.statusDotActive : styles.statusDotInactive
              ]} />
              <Text style={[
                styles.status, 
                { color: theme.textSecondary },
                isEmergency && styles.emergencyStatus,
                isMobile && styles.statusMobile
              ]}>
                {isEmergency ? '🚨 発動中' : '✓ 待機中'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.switchContainer}>
          <Switch
            value={isEmergency}
            onValueChange={onToggle}
            disabled={disabled}
            trackColor={{ 
              false: theme.name === 'dark' ? '#555' : '#BDBDBD', 
              true: '#F44336' 
            }}
            thumbColor={isEmergency ? '#fff' : (theme.name === 'dark' ? '#888' : '#f4f3f4')}
            style={[styles.switch, isMobile && styles.switchMobile]}
          />
          {!isEmergency && !isMobile && (
            <Text style={[styles.switchLabel, { color: theme.textSecondary }]}>
              解除可能
            </Text>
          )}
        </View>
      </View>
      
      {isEmergency && (
        <View style={styles.warningBanner}>
          <MaterialCommunityIcons name="alert" size={16} color="#FFFFFF" />
          <Text style={styles.warningText}>
            全スタッフに緊急通知が送信されました
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 2,
    marginBottom: 4,
  },
  containerMobile: {
    padding: 14,
    borderRadius: 12,
  },
  emergencyContainer: {
    backgroundColor: '#D32F2F',
    borderColor: '#B71C1C',
    shadowColor: '#F44336',
    shadowOpacity: 0.4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerMobile: {
    gap: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconContainerMobile: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  emergencyIconContainer: {
    backgroundColor: '#B71C1C',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  titleMobile: {
    fontSize: 16,
    marginBottom: 4,
  },
  emergencyTitle: {
    color: '#FFFFFF',
    fontSize: 22,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusDotActive: {
    backgroundColor: '#FFFFFF',
  },
  statusDotInactive: {
    backgroundColor: '#4CAF50',
  },
  status: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusMobile: {
    fontSize: 12,
  },
  emergencyStatus: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  switchContainer: {
    alignItems: 'center',
  },
  switch: {
    transform: [{ scale: 1.3 }],
  },
  switchMobile: {
    transform: [{ scale: 1.1 }],
  },
  switchLabel: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  warningText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
});
