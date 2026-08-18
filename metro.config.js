const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const existing = config.resolver.blockList;

// npm/expo create short-lived hidden dirs under node_modules. Watching them
// throws ENOENT on Windows and kills Metro.
config.resolver.blockList = [
  ...(Array.isArray(existing) ? existing : [existing]),
  /^node_modules[\\/]\./,
];

module.exports = config;
