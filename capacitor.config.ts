import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cookspath.app',
  appName: "Cook's Path",
  webDir: 'dist/client',
  server: {
    url: 'https://kitchen-quest-path.lovable.app',
    cleartext: false
  }
};

export default config;