// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Drizzle migrations are bundled as raw .sql files (inlined by babel-plugin-inline-import).
config.resolver.sourceExts.push('sql');

// expo-sqlite on web uses a wasm build of SQLite.
config.resolver.assetExts.push('wasm');

// expo-sqlite on web needs SharedArrayBuffer, which requires COOP/COEP headers.
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    middleware(req, res, next);
  };
};

module.exports = config;
