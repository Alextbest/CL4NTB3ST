import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.clantb3st.app',
  appName: 'CL4N TB3ST',
  webDir: 'www',
  backgroundColor: '#100b18',
  android: {
    allowMixedContent: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1400,
      launchAutoHide: true,
      backgroundColor: '#100b18',
      androidScaleType: 'CENTER_INSIDE',
      showSpinner: false
    }
  }
};

export default config;
