import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  devIndicators: false,
  eslint: {ignoreDuringBuilds: true},
};

export default nextConfig;
