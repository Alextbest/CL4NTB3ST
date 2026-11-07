import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.clantb3st.app',
  appName: 'CL4N TB3ST',
  webDir: 'www',
  backgroundColor: '#151515',
  android: {
    allowMixedContent: false
  },
  plugins: {
    CapacitorUpdater: {
      autoUpdate: 'off',
      appReadyTimeout: 60000,
      resetWhenUpdate: true
    },
    SplashScreen: {
      launchShowDuration: 1400,
      launchAutoHide: true,
      backgroundColor: '#151515',
      androidScaleType: 'CENTER_INSIDE',
      showSpinner: false
    }
  }
};

export default config;
