import type { NextConfig } from "next";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] || "teacher-dashboard";
const configuredBasePath = process.env.DEMO_BASE_PATH;
const basePath = configuredBasePath === "" ? "" : configuredBasePath || `/${repositoryName}`;

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  assetPrefix: basePath,
  reactStrictMode: true,
};

export default nextConfig;
