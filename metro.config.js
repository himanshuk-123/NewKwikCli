const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  projectRoot: __dirname,
  
  // Optimize resolver
  resolver: {
    // Exclude large node_modules directories to speed up builds
    blockList: [
      /android\/.*\/build\//,
      /ios\/Pods\//,
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
