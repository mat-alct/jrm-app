const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const config = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  reactStrictMode: true,
  compiler: {
    removeConsole: { exclude: ['error', 'warn'] },
  },
  experimental: {
    optimizePackageImports: [
      '@chakra-ui/react',
      '@chakra-ui/icons',
      'react-icons',
      'date-fns',
      'firebase',
    ],
  },
};

module.exports = withBundleAnalyzer(config);
