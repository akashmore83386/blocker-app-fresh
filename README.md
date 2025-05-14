# Screen Blocker Mobile Application

A React Native Expo application that helps users control their social media usage by tracking app usage time and implementing time limits with an emergency unlock feature.

## Table of Contents

- [Application Overview](#application-overview)
- [Project Structure](#project-structure)
- [Libraries and Dependencies](#libraries-and-dependencies)
- [File Structure Explanation](#file-structure-explanation)
- [Running the Application](#running-the-application)
- [Deploying to Google Play Store](#deploying-to-google-play-store)
- [Future Enhancements](#future-enhancements)

## Application Overview

The Screen Blocker app is designed to help users monitor and limit their social media app usage. When users exceed their daily time limits for apps like YouTube, Facebook, Twitter, and Instagram, the apps are automatically blocked. Users can set up individual app time limits or use a combined limit mode. In case of emergency, users can temporarily unlock apps by paying a fee, with 90% of the amount refunded after 7 days.

### Key Features

1. **User Authentication**
   - Email/password login and registration
   - Secure token storage

2. **App Usage Tracking**
   - Track time spent on social media apps
   - Background monitoring service

3. **Time Limits**
   - Set daily time limits per app
   - Combined usage tracking option

4. **Lock Mechanism**
   - Automatic blocking when time limits are exceeded
   - Configurable lock durations

5. **Emergency Unlock**
   - Temporary access via payment
   - 90% refund after 7 days

6. **Usage Analytics**
   - Daily, weekly, and monthly statistics
   - Visual charts and insights

## Project Structure

The application follows a modular architecture with clear separation of concerns:

```
blocker-app-fresh/
├── App.tsx                # Main application entry point
├── index.ts               # Expo entry point
├── app.json               # Expo configuration
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── assets/                # App images and assets
└── src/                   # Application source code
    ├── components/        # Reusable UI components
    ├── screens/           # Application screens
    │   ├── AnalyticsScreen.tsx
    │   ├── HomeScreen.tsx
    │   ├── LoadingScreen.tsx
    │   ├── LoginScreen.tsx
    │   ├── RegisterScreen.tsx
    │   ├── SettingsScreen.tsx
    │   └── UnlockScreen.tsx
    ├── navigation/        # Navigation configuration
    │   └── index.tsx
    ├── services/          # External services integration
    │   ├── supabase.ts
    │   ├── stripe.ts
    │   └── usageTracking.ts
    ├── context/           # State management
    │   └── AppContext.tsx
    ├── types/             # TypeScript definitions
    │   └── index.ts
    ├── utils/             # Utility functions
    └── hooks/             # Custom React hooks
```

## Libraries and Dependencies

The application uses the following key libraries:

| Library | Version | Purpose |
|---------|---------|---------|
| React Native | 0.79.2 | Mobile app development framework |
| Expo | ~53.0.9 | React Native toolkit |
| TypeScript | ~5.8.3 | Static type checking |
| @supabase/supabase-js | ^2.49.4 | Backend as a service for authentication and database |
| @stripe/stripe-react-native | ^0.46.0 | Payment processing |
| @react-navigation/native | ^7.1.9 | Navigation between screens |
| @react-navigation/native-stack | ^7.3.13 | Stack navigation |
| @react-navigation/bottom-tabs | ^7.3.13 | Tab navigation |
| expo-background-fetch | ^13.1.5 | Background tasks execution |
| expo-task-manager | ^13.1.5 | Background task management |
| expo-notifications | ^0.31.2 | Push notifications |
| expo-secure-store | ^14.2.3 | Secure storage for tokens |
| react-native-chart-kit | ^6.12.0 | Data visualization |
| react-native-svg | ^15.12.0 | SVG support for charts |
| dayjs | ^1.11.13 | Date manipulation |
| react-native-reanimated | ^3.17.5 | Animations |

## File Structure Explanation

### Root Files

- **App.tsx**: The main entry point that initializes Stripe, loads fonts, and provides the app context and navigation.
- **index.ts**: Registers the root component for Expo.
- **app.json**: Contains Expo configuration settings such as app name, icons, and splash screen.
- **package.json**: Lists all dependencies and scripts for the project.
- **tsconfig.json**: TypeScript configuration for the project.

### Source Directory (`src/`)

#### Types (`src/types/`)

- **index.ts**: Contains TypeScript interfaces for the application:
  - `AppSettings`: Interface for user's app settings (time limits, emergency unlock amount)
  - `SocialMediaApp`: Interface for the tracked social media apps
  - `AppUsageData`: Interface for usage tracking data
  - `User`: Interface for user profile data
  - `PaymentDetails`: Interface for payment transaction data
  - `UsageStats`: Interface for analytics data

#### Services (`src/services/`)

- **supabase.ts**: Handles all interactions with Supabase:
  - Authentication (sign up, sign in, sign out)
  - User profile management
  - App usage data storage and retrieval
  - Payment records management
  
- **stripe.ts**: Manages payment processing through Stripe:
  - Initializes Stripe
  - Processes emergency unlock payments
  - Calculates refund and app revenue amounts
  
- **usageTracking.ts**: Handles app usage monitoring:
  - Defines tracked social media apps
  - Manages background tasks for tracking
  - Checks app limits and triggers blocking
  - Provides temporary unblocking functionality
  - Calculates usage statistics

#### Context (`src/context/`)

- **AppContext.tsx**: Provides global state management:
  - User authentication state
  - App settings
  - Usage statistics
  - Blocked apps list
  - Functions for updating settings, refreshing stats, and emergency unlocking

#### Navigation (`src/navigation/`)

- **index.tsx**: Sets up the navigation structure:
  - Authentication flow (Login/Register screens)
  - Main tab navigation (Home, Analytics, Settings)
  - Modal screens (Unlock screen)

#### Screens (`src/screens/`)

- **LoadingScreen.tsx**: Simple loading indicator shown during app initialization.
  
- **LoginScreen.tsx**: Handles user login with email and password through Supabase.
  
- **RegisterScreen.tsx**: Handles new user registration with email and password.
  
- **HomeScreen.tsx**: Main screen showing:
  - List of tracked social media apps
  - Usage progress bars for each app
  - Combined usage if enabled
  - Unlock buttons for blocked apps
  
- **AnalyticsScreen.tsx**: Shows usage statistics:
  - Daily, weekly, and monthly charts
  - Per-app usage summaries
  - Usage insights and trends
  
- **SettingsScreen.tsx**: Allows users to configure:
  - Time limits for each app
  - Combined limit toggle
  - Emergency unlock amount
  - Sign out functionality
  
- **UnlockScreen.tsx**: Handles emergency unlocking:
  - Duration selection
  - Payment details
  - Stripe payment processing

## Running the Application

### Prerequisites

- Node.js (v16 or later)
- Yarn or npm
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your mobile device or an iOS/Android emulator

### Configuration Steps

1. **Clone and Install Dependencies**

```bash
git clone <repository-url>
cd blocker-app-fresh
yarn install
```

2. **Configure Supabase**

- Create a Supabase project at https://supabase.com
- Set up the necessary tables:

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  settings JSONB DEFAULT '{"dailyLimits":{"youtube":60,"facebook":30,"twitter":30,"instagram":30},"emergencyUnlockAmount":3,"combinedLimit":false}'
);

-- Create app_usage table
CREATE TABLE app_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  app_id TEXT NOT NULL,
  date DATE NOT NULL,
  minutes INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, app_id, date)
);

-- Create payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  refunded_at TIMESTAMP WITH TIME ZONE,
  app_id TEXT NOT NULL,
  unlock_duration INTEGER NOT NULL
);
```

- Update the Supabase credentials in `src/services/supabase.ts`:

```typescript
// Replace with your Supabase URL and anon key
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
```

3. **Configure Stripe**

- Create a Stripe account at https://stripe.com
- Set up a backend service for creating payment intents
- Update the Stripe credentials in `src/services/stripe.ts`:

```typescript
// Replace with your Stripe publishable key
const STRIPE_PUBLISHABLE_KEY = 'YOUR_STRIPE_PUBLISHABLE_KEY';
```

- Update the payment intent endpoint:

```typescript
// Update with your backend API endpoint
const response = await fetch('YOUR_BACKEND_API/create-payment-intent', {
  // ...
});
```

4. **Run the App**

```bash
expo start
```

- Scan the QR code with the Expo Go app on your device, or
- Press 'a' to run on Android emulator, or
- Press 'i' to run on iOS simulator

### Note on Native Functionality

The app currently uses mock implementations for:

- App usage tracking: In a production app, you'd need native modules to access actual usage stats.
- App blocking: You'd need native modules to restrict access to other apps.

## Deploying to Google Play Store

### 1. Generate a Production Build

```bash
expo build:android -t app-bundle
```

This will start the build process on Expo's servers and generate an Android App Bundle (.aab) file.

### 2. Create a Google Play Developer Account

- Sign up at https://play.google.com/console/ (requires a one-time $25 USD fee)

### 3. Create a New Application

- In the Google Play Console, click "Create app"
- Fill in your app details, content rating, and pricing information

### 4. Configure Store Listing

- Add screenshots, feature graphic, and app icon
- Write compelling app descriptions
- Set up privacy policy URL

### 5. Upload the App Bundle

- Navigate to "Production" > "Create new release"
- Upload your .aab file from Expo's build
- Fill in release notes
- Submit for review

### 6. Configure Google Play App Signing

- Follow Google Play Console prompts to set up app signing

### 7. Submit for Review

- Complete the content rating questionnaire
- Set pricing and distribution options
- Review and roll out to production

### Additional Requirements for Screen Blocker Apps

Since this is an app that monitors and restricts access to other apps, you'll need to:

1. **Provide a clear privacy policy** that explains what data is collected and how it's used
2. **Request appropriate permissions** in your app.json:

```json
"android": {
  "permissions": [
    "PACKAGE_USAGE_STATS",
    "FOREGROUND_SERVICE",
    "SYSTEM_ALERT_WINDOW"
  ]
}
```

3. **Implement proper native modules** for actual app blocking functionality
4. **Be transparent about functionality** in the app description to avoid policy violations

## Future Enhancements

1. **Native Module Integration**
   - Implement actual app usage statistics tracking
   - Add real app blocking functionality

2. **Advanced Analytics**
   - Usage patterns detection
   - Personalized insights and recommendations

3. **Social Features**
   - Challenges and accountability groups
   - Comparing stats with friends (anonymized)

4. **Additional Payment Options**
   - Subscription model for premium features
   - Family plans for multiple users

5. **Enhanced Blocking Strategies**
   - Time-based scheduling (e.g., block during work hours)
   - Location-based rules (e.g., block at office or school)
   - Focus mode with enhanced restrictions
