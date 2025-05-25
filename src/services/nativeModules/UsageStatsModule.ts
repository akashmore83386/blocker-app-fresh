import { NativeModules, Platform } from 'react-native';

const { UsageStatsModule } = NativeModules;

// Define the interface for usage stats data
export interface AppUsageStats {
  packageName: string;
  appName: string;
  totalTimeInForeground: number; // in seconds
  firstTimeStamp: number;
  lastTimeStamp: number;
  lastTimeUsed: number;
}

// Define the interface for usage session data
export interface AppUsageSession {
  packageName: string;
  startTime: number;
  endTime: number;
  duration: number; // in seconds
  isOngoing?: boolean;
}

// Define the interface for today's usage time
export interface AppUsageTime {
  [packageName: string]: number; // in minutes
}

/**
 * Interface for the UsageStatsModule native module
 */
export interface UsageStatsModuleInterface {
  hasUsageStatsPermission(): Promise<boolean>;
  openUsageAccessSettings(): void;
  getAppUsageStats(startTime: number, endTime: number): Promise<AppUsageStats[]>;
  getAppUsageEvents(startTime: number, endTime: number): Promise<AppUsageSession[]>;
  getTodayUsageTime(packageNames: string[]): Promise<AppUsageTime>;
}

/**
 * Default implementation (mock) for platforms where native module is not available
 */
class UsageStatsModuleMock implements UsageStatsModuleInterface {
  hasUsageStatsPermission(): Promise<boolean> {
    console.warn('UsageStatsModule is not available on this platform');
    return Promise.resolve(false);
  }

  openUsageAccessSettings(): void {
    console.warn('UsageStatsModule is not available on this platform');
  }

  getAppUsageStats(startTime: number, endTime: number): Promise<AppUsageStats[]> {
    console.warn('UsageStatsModule is not available on this platform');
    return Promise.resolve([]);
  }

  getAppUsageEvents(startTime: number, endTime: number): Promise<AppUsageSession[]> {
    console.warn('UsageStatsModule is not available on this platform');
    return Promise.resolve([]);
  }

  getTodayUsageTime(packageNames: string[]): Promise<AppUsageTime> {
    console.warn('UsageStatsModule is not available on this platform');
    // Return mock data with zeros
    const result: AppUsageTime = {};
    packageNames.forEach(packageName => {
      result[packageName] = 0;
    });
    return Promise.resolve(result);
  }
}

// Export the appropriate implementation based on platform
export default Platform.OS === 'android' && UsageStatsModule
  ? UsageStatsModule as UsageStatsModuleInterface
  : new UsageStatsModuleMock();
