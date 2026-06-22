import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.parche.app',
  appName: 'Parche',
  webDir: 'out',
  server: {
    // In development, point to local Next.js server
    // Comment this out for production builds
    url: 'http://localhost:3000',
    cleartext: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Geolocation: {
      // iOS permissions
    },
  },
  ios: {
    contentInset: 'always',
  },
  android: {
    allowMixedContent: true,
  },
}

export default config
