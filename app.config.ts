import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Extends app.json. When building the web version for GitHub Pages the
 * workflow sets EXPO_BASE_URL=/awaken so assets resolve under the repo path.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
