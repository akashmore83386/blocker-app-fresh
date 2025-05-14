import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';

const SettingsScreen: React.FC = () => {
  const { settings, updateSettings, socialMediaApps, signOut } = useAppContext();
  const [localSettings, setLocalSettings] = useState({ ...settings });
  
  // Save settings
  const handleSaveSettings = async () => {
    try {
      await updateSettings(localSettings);
      Alert.alert('Success', 'Settings have been saved.');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  };
  
  // Toggle combined limit mode
  const handleToggleCombinedLimit = (value: boolean) => {
    setLocalSettings(prev => ({
      ...prev,
      combinedLimit: value,
    }));
  };
  
  // Update app time limit
  const handleUpdateTimeLimit = (appId: string, minutes: string) => {
    const minutesNumber = parseInt(minutes || '0', 10);
    
    setLocalSettings(prev => ({
      ...prev,
      dailyLimits: {
        ...prev.dailyLimits,
        [appId]: minutesNumber,
      },
    }));
  };
  
  // Update emergency unlock amount
  const handleUpdateUnlockAmount = (amount: string) => {
    const amountNumber = parseFloat(amount || '3');
    
    setLocalSettings(prev => ({
      ...prev,
      emergencyUnlockAmount: amountNumber,
    }));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Time Limits</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLabel}>
              <Text style={styles.settingText}>Combined Limit Mode</Text>
              <Text style={styles.settingDescription}>
                Apply the same time limit to all social media apps combined.
              </Text>
            </View>
            <Switch
              value={localSettings.combinedLimit}
              onValueChange={handleToggleCombinedLimit}
              trackColor={{ false: '#E5E7EB', true: '#A5B4FC' }}
              thumbColor={localSettings.combinedLimit ? '#4F46E5' : '#F9FAFB'}
            />
          </View>

          {socialMediaApps.map((app) => (
            <View style={styles.settingItem} key={app.id}>
              <View style={styles.settingLabel}>
                <View style={styles.appInfo}>
                  <MaterialCommunityIcons
                    name={app.iconName as any}
                    size={24}
                    color="#4F46E5"
                  />
                  <Text style={styles.settingText}>{app.name}</Text>
                </View>
                {!localSettings.combinedLimit && (
                  <Text style={styles.settingDescription}>
                    Set daily time limit (minutes)
                  </Text>
                )}
              </View>
              
              {localSettings.combinedLimit ? (
                app.id === socialMediaApps[0].id ? (
                  <TextInput
                    style={styles.input}
                    keyboardType="number-pad"
                    value={localSettings.dailyLimits[app.id]?.toString() || '60'}
                    onChangeText={(text) => handleUpdateTimeLimit(app.id, text)}
                    placeholder="Minutes"
                  />
                ) : (
                  <Text style={styles.combinedLimitText}>Combined</Text>
                )
              ) : (
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  value={localSettings.dailyLimits[app.id]?.toString() || '60'}
                  onChangeText={(text) => handleUpdateTimeLimit(app.id, text)}
                  placeholder="Minutes"
                />
              )}
            </View>
          ))}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Unlock</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLabel}>
              <Text style={styles.settingText}>Unlock Amount ($)</Text>
              <Text style={styles.settingDescription}>
                Amount charged for emergency app unlock
              </Text>
            </View>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={localSettings.emergencyUnlockAmount.toString()}
              onChangeText={handleUpdateUnlockAmount}
              placeholder="Amount in USD"
            />
          </View>
          
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
            <Text style={styles.infoText}>
              90% of the amount will be refunded to you after 7 days. 10% is used as a service fee.
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveSettings}
        >
          <Text style={styles.saveButtonText}>Save Settings</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={signOut}
        >
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    padding: 16,
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
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#111827',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  settingLabel: {
    flex: 1,
    marginRight: 16,
  },
  settingText: {
    fontSize: 16,
    color: '#111827',
  },
  settingDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  appInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 80,
    textAlign: 'center',
    fontSize: 16,
  },
  combinedLimitText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#6B7280',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 6,
    marginTop: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    marginLeft: 8,
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginVertical: 16,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 40,
  },
  signOutButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default SettingsScreen;
