# Testing the Blocker App on Real Devices

Before submitting to the Google Play Store, it's essential to test the app on real Android devices. This guide will walk you through setting up and testing your app.

## Prerequisites

- A physical Android device (preferably multiple with different Android versions)
- USB cable to connect your device to your computer
- Android Debug Bridge (ADB) installed
- Your development environment set up as described in README.md

## Enabling Developer Mode on Your Android Device

1. Go to **Settings** > **About phone** > **Software information**.
2. Tap on **Build number** 7 times until you see a message that you're now a developer.
3. Go back to **Settings** > **Developer options**.
4. Enable **USB debugging**.

## Connect Your Device

1. Connect your device to your computer using a USB cable.
2. When prompted on your device, allow USB debugging.
3. Open a terminal and verify the device is connected:
```bash
adb devices
```

## Testing the App

### Method 1: Using Expo

1. Make sure your Android device is on the same WiFi network as your development computer.
2. Start the Expo development server:
```bash
yarn start
```
3. Use the Expo Go app on your device to scan the QR code or connect to your development server.

### Method 2: Using a Development Build

1. Create a development build:
```bash
npx expo prebuild
yarn android
```
2. This will install the app directly to your connected device.

### Method 3: Installing an APK

1. Build an APK for testing:
```bash
expo build:android -t apk
```
2. Download the APK from the Expo build service.
3. Install it on your device using ADB:
```bash
adb install path/to/your-app.apk
```

## Testing Critical Functionality

### 1. Permissions

- Test granting and denying Usage Stats permission
- Test granting and denying Overlay permission
- Verify appropriate error handling when permissions are denied

### 2. App Blocking

- Set up usage limits for apps
- Use a tracked app until the limit is reached
- Verify the blocking overlay appears
- Test the emergency unlock feature

### 3. Background Processing

- Set app time limits
- Close your Blocker App
- Use a tracked app until the limit is reached
- Verify blocking still works in background

### 4. Payment Processing

- Test the payment flow for emergency unlocks
- Verify payment success and failure scenarios

### 5. Device Restart Behavior

- Set up blocking for apps
- Restart your device
- Verify that blocking still works after device restart

### 6. Different Android Versions

- If possible, test on devices with different Android versions (Android 10, 11, 12, 13)
- Pay special attention to permission handling which can vary between Android versions

## Setting Up a Test Environment

1. Create a test Supabase project for testing
2. Set up a test Stripe account with test keys
3. Configure your `.env` file with test credentials
4. Run the backend server locally or deploy a test version

## Common Issues to Check

1. **Battery optimization**: Some Android devices aggressively kill background services. Check if your tracking still works after a few hours.
2. **Permission persistence**: Make sure permissions stay granted after app updates.
3. **Data usage**: Monitor the app's data usage to ensure it's reasonable.
4. **Storage usage**: Check if the app manages storage efficiently.
5. **Performance**: Test on lower-end devices to ensure good performance.

## Final Pre-Production Checks

Before submitting to Google Play:

1. Run a final test with all production APIs and credentials
2. Verify all analytics and crash reporting tools are working
3. Test the app with slow or unstable network connections
4. Check all UI elements on different screen sizes
5. Validate accessibility features
