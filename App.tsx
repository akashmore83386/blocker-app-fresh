import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { initializeStripe } from './src/services/stripe';
import { AppProvider } from './src/context/AppContext';
import { Navigation } from './src/navigation';
import * as Font from 'expo-font';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadResources = async () => {
      try {
        // Initialize Stripe
        await initializeStripe();
        
        // Load required fonts for icons
        await Font.loadAsync({
          ...MaterialCommunityIcons.font,
          ...Ionicons.font,
        });
      } catch (error) {
        console.error('Error loading resources:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadResources();
  }, []);

  if (isLoading) {
    return null; // Or a splash screen component
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <AppProvider>
        <Navigation />
      </AppProvider>
    </SafeAreaProvider>
  );
}
