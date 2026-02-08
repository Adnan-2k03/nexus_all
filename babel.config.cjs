module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['transform-inline-environment-variables', {
        include: ['VITE_API_URL', 'VITE_FIREBASE_WEB_API_KEY', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID']
      }],
      'react-native-reanimated/plugin',
    ],
  };
};