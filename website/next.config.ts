import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      // Map Node.js built-ins to browser polyfills (client-side only)
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        buffer: require.resolve('buffer/'),
        path: require.resolve('path-browserify'),
        process: require.resolve('process/browser'),
        events: require.resolve('events/'),
        stream: require.resolve('stream-browserify'),
        util: require.resolve('util/'),
        fs: require.resolve('memfs'),
        zlib: require.resolve('browserify-zlib'),
        module: false,
        crypto: false,
        os: false,
        tty: false,
        child_process: false,
        net: false,
        dns: false,
        http: false,
        https: false,
        http2: false,
        tls: false,
      };

      // Strip the node: prefix so fallback mappings take effect.
      // Webpack doesn't handle the node: URI scheme by default.
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource: any) => {
          resource.request = resource.request.replace(/^node:/, '');
        }),
      );

      // Provide Buffer and process globals
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        }),
      );

      // Define global as globalThis
      config.plugins.push(
        new webpack.DefinePlugin({
          global: 'globalThis',
        }),
      );
    }

    // Enable WebAssembly support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    return config;
  },
  // Transpile workspace packages
  transpilePackages: ['@nodepack/client', '@nodepack/runtime', '@nodepack/worker'],
  // Expose whether server-side AI keys are configured
  env: {
    NEXT_PUBLIC_HAS_SERVER_KEYS: process.env.ANTHROPIC_API_KEY ? 'true' : 'false',
  },
};

export default nextConfig;
