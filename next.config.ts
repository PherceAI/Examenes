import path from 'node:path';
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Fija la raíz del proyecto: hay otros package-lock.json en carpetas superiores de este PC.
  outputFileTracingRoot: path.resolve(__dirname),
  devIndicators: false,
  eslint: {ignoreDuringBuilds: true},
};

export default nextConfig;
