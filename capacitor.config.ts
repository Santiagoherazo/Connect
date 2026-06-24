import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.parche.app',
  appName: 'Parche',
  webDir: 'out',
  // PRODUCTION: App carga desde Vercel (SSR completo, sin static export)
  // Cambiar por tu URL real de Vercel antes de compilar
  server: {
    url: 'https://connect-tau-puce.vercel.app',
    cleartext: false,
  },
  plugins: {
    Geolocation: {},
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#1D9E75',
      showSpinner: false,
    },
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#FFFFFF',
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#FFFFFF',
  },
}

export default config
