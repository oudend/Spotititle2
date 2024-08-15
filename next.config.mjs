/** @type {import('next').NextConfig} */

const nextConfig = {
  output: "export",
  distDir: "build",
  images: {
    unoptimized: true,
  },
  // async redirects() {
  //   return [
  //     {
  //       source: "/",
  //       destination: "/Home",
  //       permanent: true,
  //     },
  //   ];
  // },
  serverRuntimeConfig: {
    appVersion: process.env.npm_package_version || "",
  },
};

export default nextConfig;
