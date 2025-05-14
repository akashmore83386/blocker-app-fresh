import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';

type NavigationProps = NativeStackNavigationProp<RootStackParamList>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProps>();
  const { 
    user,
    socialMediaApps,
    usageStats,
    blockedApps,
    refreshUsageStats,
    settings
  } = useAppContext();
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    // Refresh stats when the screen is focused
    const unsubscribe = navigation.addListener('focus', () => {
      refreshUsageStats();
    });

    return unsubscribe;
  }, [navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshUsageStats();
    setRefreshing(false);
  };

  const handleUnlockApp = (appId: string) => {
    navigation.navigate('Unlock', { appId });
  };

  const getMinutesUsedToday = (appId: string): number => {
    if (!usageStats || !usageStats.dailyUsage) {
      return 0;
    }

    const today = new Date().toISOString().split('T')[0];
    if (!usageStats.dailyUsage[today]) {
      return 0;
    }

    return usageStats.dailyUsage[today][appId] || 0;
  };

  const getLimitForApp = (appId: string): number => {
    return settings.dailyLimits[appId] || 120; // Default 120 minutes
  };

  const getProgressColor = (used: number, limit: number) => {
    const percentage = (used / limit) * 100;
    
    if (percentage < 50) {
      return '#10B981'; // Green
    } else if (percentage < 80) {
      return '#FBBF24'; // Yellow
    } else {
      return '#EF4444'; // Red
    }
  };

  const renderAppItem = ({ item }: { item: any }) => {
    const isBlocked = blockedApps.includes(item.id);
    const minutesUsed = getMinutesUsedToday(item.id);
    const minutesLimit = getLimitForApp(item.id);
    const progressPercentage = Math.min((minutesUsed / minutesLimit) * 100, 100);
    const progressColor = getProgressColor(minutesUsed, minutesLimit);

    return (
      <View style={styles.appItem}>
        <View style={styles.appHeader}>
          <View style={styles.appInfo}>
            <MaterialCommunityIcons
              name={item.iconName as any}
              size={24}
              color="#4F46E5"
            />
            <Text style={styles.appName}>{item.name}</Text>
          </View>
          {isBlocked && (
            <TouchableOpacity
              style={styles.unblockButton}
              onPress={() => handleUnlockApp(item.id)}
            >
              <Text style={styles.unblockButtonText}>Unlock</Text>
              <Ionicons name="lock-open-outline" size={16} color="white" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.usageInfo}>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { width: `${progressPercentage}%` as any, backgroundColor: progressColor },
              ]}
            />
          </View>
          <Text style={styles.usageText}>
            {minutesUsed}/{minutesLimit} min
          </Text>
        </View>

        {isBlocked && (
          <Text style={styles.blockedText}>
            This app is blocked. Time limit exceeded.
          </Text>
        )}
      </View>
    );
  };

  const renderCombinedUsage = () => {
    if (!settings.combinedLimit) return null;
    
    const totalMinutesUsed = socialMediaApps.reduce(
      (total, app) => total + getMinutesUsedToday(app.id),
      0
    );
    
    // Get the first limit value as the combined limit
    const combinedLimit = Object.values(settings.dailyLimits)[0] || 120;
    
    const progressPercentage = Math.min((totalMinutesUsed / combinedLimit) * 100, 100);
    const progressColor = getProgressColor(totalMinutesUsed, combinedLimit);
    
    return (
      <View style={styles.combinedUsageContainer}>
        <Text style={styles.combinedUsageTitle}>Combined Usage</Text>
        <View style={styles.usageInfo}>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { width: `${progressPercentage}%` as any, backgroundColor: progressColor },
              ]}
            />
          </View>
          <Text style={styles.usageText}>
            {totalMinutesUsed}/{combinedLimit} min
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>App Usage</Text>
      </View>

      {settings.combinedLimit && renderCombinedUsage()}

      <FlatList
        data={socialMediaApps}
        renderItem={renderAppItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
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
  listContent: {
    padding: 16,
  },
  appItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  appInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appName: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  usageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    flex: 1,
    marginRight: 10,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  usageText: {
    fontSize: 14,
    color: '#6B7280',
    width: 80,
    textAlign: 'right',
  },
  unblockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  unblockButtonText: {
    color: 'white',
    marginRight: 4,
    fontWeight: '500',
  },
  blockedText: {
    color: '#EF4444',
    fontSize: 14,
    marginTop: 8,
  },
  combinedUsageContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    margin: 16,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  combinedUsageTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
});

export default HomeScreen;
