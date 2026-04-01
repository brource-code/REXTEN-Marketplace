const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Отключаем веб-платформу - это мобильное приложение
config.resolver = {
  ...config.resolver,
  platforms: ['ios', 'android', 'native'],
};

module.exports = config;
