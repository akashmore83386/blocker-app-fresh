import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';
import { useFocusEffect } from '@react-navigation/native';

const AnalyticsScreen: React.FC = () => {
  const { socialMediaApps, usageStats, refreshUsageStats } = useAppContext();
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [refreshing, setRefreshing] = useState(false);
  
  const screenWidth = Dimensions.get('window').width - 32;
  
  // Refresh data when the screen is focused
  useFocusEffect(
    useCallback(() => {
      refreshUsageStats();
    }, [])
  );
  
  const onRefresh = async () => {
    setRefreshing(true);
    await refreshUsageStats();
    setRefreshing(false);
  };
  
  // Get daily usage data for chart
  const getDailyChartData = () => {
    if (!usageStats || !usageStats.dailyUsage) {
      return {
        labels: ['No data'],
        datasets: [{ data: [0] }],
      };
    }
    
    // Sort dates and get the last 7 days
    const dates = Object.keys(usageStats.dailyUsage).sort();
    const lastSevenDays = dates.slice(-7); // Get last 7 days
    
    // For daily view, show individual app usage for each day
    // We'll pick one app (first one) for the line chart
    const mainApp = socialMediaApps[0];
    const mainAppData = lastSevenDays.map(date => {
      const dayData = usageStats.dailyUsage[date] || {};
      return dayData[mainApp.id] || 0;
    });
    
    // Format date labels (MM/DD)
    const formattedDates = lastSevenDays.map(date => {
      const [year, month, day] = date.split('-');
      return `${month}/${day}`;
    });
    
    return {
      labels: formattedDates,
      datasets: [
        {
          data: mainAppData,
          color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };
  };
  
  // Get weekly totals for each app
  const getWeeklyChartData = () => {
    if (!usageStats || !usageStats.weeklyTotals) {
      return {
        labels: ['No data'],
        datasets: [{ data: [0] }],
      };
    }
    
    const appNames = socialMediaApps.map(app => app.name.substring(0, 3)); // First 3 chars of app name
    const appData = socialMediaApps.map(app => usageStats.weeklyTotals[app.id] || 0);
    
    return {
      labels: appNames,
      datasets: [
        {
          data: appData,
        },
      ],
    };
  };
  
  // Get combined usage over time for all apps
  const getMonthlyCombinedData = () => {
    if (!usageStats || !usageStats.dailyUsage) {
      return {
        labels: ['No data'],
        datasets: [{ data: [0] }],
      };
    }
    
    // Sort dates and get data points
    const dates = Object.keys(usageStats.dailyUsage).sort();
    const lastMonth = dates.slice(-30); // Get last 30 days
    
    // Calculate combined usage for each day
    const combinedData = lastMonth.map(date => {
      const dayData = usageStats.dailyUsage[date] || {};
      return Object.values(dayData).reduce((sum, minutes) => sum + (minutes || 0), 0);
    });
    
    // Generate weekly labels (Week 1, Week 2, etc.)
    const weekLabels = Array.from({ length: 4 }, (_, i) => `W${i + 1}`);
    
    // Aggregate data into weeks
    const weeklyData = Array(4).fill(0);
    combinedData.forEach((value, index) => {
      const weekIndex = Math.floor(index / 7);
      if (weekIndex < 4) { // Ensure we don't go beyond 4 weeks
        weeklyData[weekIndex] += value;
      }
    });
    
    return {
      labels: weekLabels,
      datasets: [
        {
          data: weeklyData,
          color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };
  };
  
  // Chart configuration
  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#4F46E5',
    },
  };
  
  // Render app usage summary items
  const renderAppUsageSummary = () => {
    if (!usageStats) return null;
    
    return socialMediaApps.map(app => {
      const usage = usageStats.weeklyTotals[app.id] || 0;
      const averageDaily = usage / 7; // Simple average
      
      return (
        <View style={styles.summaryItem} key={app.id}>
          <View style={styles.appInfo}>
            <MaterialCommunityIcons
              name={app.iconName as any}
              size={24}
              color="#4F46E5"
            />
            <Text style={styles.appName}>{app.name}</Text>
          </View>
          
          <View style={styles.usageDetails}>
            <View style={styles.usageStat}>
              <Text style={styles.usageValue}>{usage}</Text>
              <Text style={styles.usageLabel}>Total (min)</Text>
            </View>
            <View style={styles.usageStat}>
              <Text style={styles.usageValue}>{averageDaily.toFixed(1)}</Text>
              <Text style={styles.usageLabel}>Avg/day</Text>
            </View>
          </View>
        </View>
      );
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics</Text>
      </View>
      
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Tab Navigation */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'daily' && styles.activeTab]}
            onPress={() => setActiveTab('daily')}
          >
            <Text style={[styles.tabText, activeTab === 'daily' && styles.activeTabText]}>Daily</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'weekly' && styles.activeTab]}
            onPress={() => setActiveTab('weekly')}
          >
            <Text style={[styles.tabText, activeTab === 'weekly' && styles.activeTabText]}>Weekly</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'monthly' && styles.activeTab]}
            onPress={() => setActiveTab('monthly')}
          >
            <Text style={[styles.tabText, activeTab === 'monthly' && styles.activeTabText]}>Monthly</Text>
          </TouchableOpacity>
        </View>
        
        {/* Charts */}
        <View style={styles.chartContainer}>
          {activeTab === 'daily' && (
            <>
              <Text style={styles.chartTitle}>Daily Usage - {socialMediaApps[0]?.name}</Text>
              <LineChart
                data={getDailyChartData()}
                width={screenWidth}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
              />
            </>
          )}
          
          {activeTab === 'weekly' && (
            <>
              <Text style={styles.chartTitle}>Weekly Usage by App</Text>
              <BarChart
                data={getWeeklyChartData()}
                width={screenWidth}
                height={220}
                chartConfig={chartConfig}
                style={styles.chart}
                yAxisLabel=""
                yAxisSuffix=" min"
                fromZero
              />
            </>
          )}
          
          {activeTab === 'monthly' && (
            <>
              <Text style={styles.chartTitle}>Monthly Combined Usage</Text>
              <LineChart
                data={getMonthlyCombinedData()}
                width={screenWidth}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                yAxisSuffix=" min"
              />
            </>
          )}
        </View>
        
        {/* Summary */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Weekly Summary</Text>
          {renderAppUsageSummary()}
        </View>
        
        <View style={styles.insightBox}>
          <Text style={styles.insightTitle}>Key Insight</Text>
          <Text style={styles.insightText}>
            {!usageStats ? 'No data available' : 'Based on your usage patterns, you tend to spend more time on social media during weekends. Consider setting stricter limits for those days.'}
          </Text>
        </View>
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#4F46E5',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#4F46E5',
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#111827',
  },
  chart: {
    borderRadius: 8,
    padding: 8,
    marginVertical: 8,
  },
  summaryContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: '#111827',
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  appInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appName: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    color: '#111827',
  },
  usageDetails: {
    flexDirection: 'row',
  },
  usageStat: {
    alignItems: 'center',
    marginLeft: 16,
    width: 60,
  },
  usageValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
  },
  usageLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  insightBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 40,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1E40AF',
  },
  insightText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1E40AF',
  },
});

export default AnalyticsScreen;
