import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';
import { calculateRefundAmount } from '../services/stripe';

type Props = NativeStackScreenProps<RootStackParamList, 'Unlock'>;

const UnlockScreen: React.FC<Props> = ({ route, navigation }) => {
  const { appId } = route.params;
  const { socialMediaApps, settings, unlockApp } = useAppContext();
  const [duration, setDuration] = useState<number>(60); // Default 60 minutes
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Get the app details
  const app = socialMediaApps.find(a => a.id === appId);
  
  // Calculate costs
  const emergencyUnlockAmount = settings.emergencyUnlockAmount;
  const refundAmount = calculateRefundAmount(emergencyUnlockAmount);
  
  // Duration options
  const durationOptions = [
    { label: '30 min', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '3 hours', value: 180 },
    { label: '12 hours', value: 720 },
    { label: '24 hours', value: 1440 },
  ];
  
  // Handle emergency unlock
  const handleUnlock = async () => {
    if (!app) return;
    
    setIsProcessing(true);
    
    try {
      const success = await unlockApp(app.id, duration);
      
      if (success) {
        Alert.alert(
          'Success',
          `You have successfully unlocked ${app.name} for ${formatDuration(duration)}.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', 'Failed to process payment. Please try again.');
      }
    } catch (error) {
      console.error('Unlock error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Format the duration for display
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    } else if (minutes === 60) {
      return '1 hour';
    } else if (minutes < 1440) {
      const hours = minutes / 60;
      return `${hours} hours`;
    } else {
      const days = minutes / 1440;
      return `${days} days`;
    }
  };

  if (!app) {
    return (
      <View style={styles.container}>
        <Text>App not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency Unlock</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.appInfoCard}>
          <MaterialCommunityIcons
            name={app.iconName as any}
            size={40}
            color="#4F46E5"
          />
          <Text style={styles.appName}>{app.name}</Text>
          <Text style={styles.blockedText}>Time limit exceeded. App is blocked.</Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Unlock Duration</Text>
          <Text style={styles.sectionDescription}>
            Select how long you want to unlock this app for emergency use.
          </Text>
          
          <View style={styles.durationOptions}>
            {durationOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.durationOption,
                  duration === option.value && styles.selectedDuration,
                ]}
                onPress={() => setDuration(option.value)}
              >
                <Text
                  style={[
                    styles.durationText,
                    duration === option.value && styles.selectedDurationText,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          
          <View style={styles.paymentInfo}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Emergency Unlock Fee</Text>
              <Text style={styles.paymentValue}>${emergencyUnlockAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Refund After 7 Days (90%)</Text>
              <Text style={styles.paymentValue}>${refundAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Service Fee (10%)</Text>
              <Text style={styles.paymentValue}>${(emergencyUnlockAmount - refundAmount).toFixed(2)}</Text>
            </View>
          </View>
          
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
            <Text style={styles.infoText}>
              The emergency unlock fee will be charged to your payment method. 90% of this fee will be automatically refunded after 7 days.
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.unlockButton, isProcessing && styles.disabledButton]}
          onPress={handleUnlock}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Text style={styles.unlockButtonText}>
                Pay ${emergencyUnlockAmount.toFixed(2)} to Unlock
              </Text>
              <Ionicons name="lock-open-outline" size={20} color="white" />
            </>
          )}
        </TouchableOpacity>
        
        <Text style={styles.cancelText}>
          This is a one-time emergency unlock. To avoid future payments, adjust your usage limits in Settings.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    padding: 16,
  },
  appInfoCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  appName: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
    color: '#111827',
  },
  blockedText: {
    fontSize: 14,
    color: '#EF4444',
    marginTop: 4,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#111827',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  durationOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  durationOption: {
    width: '48%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 10,
  },
  selectedDuration: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  durationText: {
    fontSize: 14,
    color: '#6B7280',
  },
  selectedDurationText: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  paymentInfo: {
    marginBottom: 16,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  paymentLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    marginLeft: 8,
    flex: 1,
  },
  unlockButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  disabledButton: {
    backgroundColor: '#A5B4FC',
  },
  unlockButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  cancelText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 40,
  },
});

export default UnlockScreen;
