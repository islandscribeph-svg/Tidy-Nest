import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Fully dynamic app. The default cache is enough, so the first deploy does not need an R2 bucket.
export default defineCloudflareConfig({});
