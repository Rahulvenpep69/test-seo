/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
  experimental: {
    instrumentationHook: true,
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') || '',
      ].filter(Boolean),
    },
  },
  transpilePackages: ['robots-parser', 'sitemap-parser', 'jsonld', 'html-encoding-sniffer'],
};

module.exports = nextConfig;
