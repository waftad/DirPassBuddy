import { NativeScriptConfig } from '@nativescript/core';

export default {
  id: 'org.nativescript.mountainbikepark',
  appPath: 'app',
  appResourcesPath: '../../tools/assets/App_Resources',
  android: {
    v8Flags: '--expose_gc',
    markingMode: 'none',
    codeCache: true,
    enableScreenCapture: true,
    enableWebViewDebugging: false
  },
  ios: {
    discardUncaughtJsExceptions: false,
    enableScreenCapture: true
  }
} as NativeScriptConfig;