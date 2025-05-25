import { NativeModules, Platform } from 'react-native';

const { AppBlockerModule } = NativeModules;

/**
 * Interface for the AppBlockerModule native module
 */
export interface AppBlockerModuleInterface {
  hasOverlayPermission(): Promise<boolean>;
  requestOverlayPermission(): void;
  startBlockerService(): Promise<boolean>;
  stopBlockerService(): Promise<boolean>;
  blockApps(packageNames: string[]): Promise<boolean>;
  unblockAppTemporarily(packageName: string, durationMinutes: number): Promise<boolean>;
  unblockApp(packageName: string): Promise<boolean>;
  getBlockedApps(): Promise<string[]>;
  isAppInForeground(packageName: string): Promise<boolean>;
}

/**
 * Default implementation (mock) for platforms where native module is not available
 */
class AppBlockerModuleMock implements AppBlockerModuleInterface {
  private blockedApps: Set<string> = new Set();
  private tempUnblockedApps: Map<string, NodeJS.Timeout> = new Map();

  hasOverlayPermission(): Promise<boolean> {
    console.warn('AppBlockerModule is not available on this platform');
    return Promise.resolve(true);
  }

  requestOverlayPermission(): void {
    console.warn('AppBlockerModule is not available on this platform');
  }

  startBlockerService(): Promise<boolean> {
    console.warn('AppBlockerModule is not available on this platform');
    return Promise.resolve(true);
  }

  stopBlockerService(): Promise<boolean> {
    console.warn('AppBlockerModule is not available on this platform');
    this.blockedApps.clear();
    // Clear all timeouts
    this.tempUnblockedApps.forEach((timeout) => clearTimeout(timeout));
    this.tempUnblockedApps.clear();
    return Promise.resolve(true);
  }

  blockApps(packageNames: string[]): Promise<boolean> {
    console.warn('AppBlockerModule is not available on this platform');
    packageNames.forEach(packageName => this.blockedApps.add(packageName));
    return Promise.resolve(true);
  }

  unblockAppTemporarily(packageName: string, durationMinutes: number): Promise<boolean> {
    console.warn('AppBlockerModule is not available on this platform');
    
    // Clear existing timeout if any
    if (this.tempUnblockedApps.has(packageName)) {
      clearTimeout(this.tempUnblockedApps.get(packageName)!);
    }
    
    // Set a new timeout
    const timeout = setTimeout(() => {
      this.tempUnblockedApps.delete(packageName);
    }, durationMinutes * 60 * 1000);
    
    this.tempUnblockedApps.set(packageName, timeout);
    return Promise.resolve(true);
  }

  unblockApp(packageName: string): Promise<boolean> {
    console.warn('AppBlockerModule is not available on this platform');
    this.blockedApps.delete(packageName);
    
    // Clear any temporary unblock timeout
    if (this.tempUnblockedApps.has(packageName)) {
      clearTimeout(this.tempUnblockedApps.get(packageName)!);
      this.tempUnblockedApps.delete(packageName);
    }
    
    return Promise.resolve(true);
  }

  getBlockedApps(): Promise<string[]> {
    console.warn('AppBlockerModule is not available on this platform');
    return Promise.resolve(Array.from(this.blockedApps));
  }

  isAppInForeground(packageName: string): Promise<boolean> {
    console.warn('AppBlockerModule is not available on this platform');
    return Promise.resolve(false);
  }
}

// Export the appropriate implementation based on platform
export default Platform.OS === 'android' && AppBlockerModule
  ? AppBlockerModule as AppBlockerModuleInterface
  : new AppBlockerModuleMock();
