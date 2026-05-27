import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // unzipper (used by the OPL ingest fetcher) has an optional @aws-sdk/client-s3
  // dependency for S3 streaming. We don't use that code path, but Turbopack
  // resolves all requires statically. Marking unzipper as a server-external
  // package makes Node.js resolve it at runtime instead, bypassing the issue.
  serverExternalPackages: ['unzipper'],
};

export default nextConfig;
