const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const config = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  // TODO: arrumar lint progressivamente e reativar a checagem no build
  eslint: { ignoreDuringBuilds: true },
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
