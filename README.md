# Blocker App

A React Native application that helps users manage their screen time by blocking access to social media apps after daily usage limits are reached.

## Features

- Track usage time for social media apps
- Set daily usage limits per app
- Block apps when limits are exceeded
- Emergency unlock feature (with payment)
- Usage analytics and statistics
- Secure authentication

## Setup

### Prerequisites

- Node.js (v18 or later)
- Yarn package manager
- Android Studio
- Expo CLI

### Installation

1. Clone the repository
2. Install dependencies:
```bash
yarn install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Fill in the environment variables in the `.env` file with your credentials:
   - Supabase URL and anonymous key
   - Stripe publishable key
   - Backend API URL

5. Start the development server:
```bash
yarn start
```

### Setting up the backend server

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with your Stripe secret key and webhook secret:
```
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
PORT=3000
```

4. Start the server:
```bash
npm start
```

## Architecture

The app is built with the following architecture:

- **React Native**: Frontend UI and logic
- **Expo**: Development and build tools
- **TypeScript**: Type-safe code
- **Supabase**: Authentication and database
- **Stripe**: Payment processing
- **Native Modules**: Usage tracking and app blocking functionality

## Deployment Checklist

Before deploying to the Google Play Store, ensure the following:

1. **Environment Variables**:
   - Ensure all environment variables are properly set for production
   - Remove any hardcoded API keys or credentials

2. **Permissions**:
   - Verify all required Android permissions are properly requested
   - Test permission flows, especially for Usage Stats and Overlay permissions

3. **Native Modules**:
   - Test that AppBlockerModule works correctly on various Android versions
   - Test that UsageStatsModule correctly tracks app usage

4. **Payment Processing**:
   - Test the complete Stripe payment flow
   - Verify refunds are properly scheduled and processed

5. **Error Handling**:
   - Test app behavior when permissions are denied
   - Ensure proper error recovery in all flows

6. **Performance**:
   - Test app performance on lower-end devices
   - Ensure background services don't drain battery

7. **Google Play Store Requirements**:
   - Prepare privacy policy
   - Create store listing assets (screenshots, video, etc.)
   - Complete the Data safety form
   - Set appropriate content ratings

## Building for Production

1. Configure app.json with correct package name and version:
```json
{
  "expo": {
    "name": "Blocker App",
    "slug": "blocker-app",
    "version": "1.0.0",
    "android": {
      "package": "com.akashmore83388.blockerappfresh",
      "versionCode": 1
    }
  }
}
```

2. Build the Android app bundle:
```bash
expo build:android --type app-bundle
```

3. Submit the generated .aab file to the Google Play Console

## Recent Fixes

The following critical issues were fixed:

1. Fixed authentication flow in navigation (was commented out)
2. Completed UsageStatsModule native implementation for proper usage tracking
3. Resolved circular dependencies between services
4. Improved backend implementation with reliable job scheduling
5. Removed hardcoded API keys and credentials
6. Enhanced error handling for permission denials

## License

[MIT License](LICENSE)
