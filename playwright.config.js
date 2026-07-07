import { defineConfig, devices } from "@playwright/test";

const libPort = Number(process.env.LIB_PORT) || 5715;
const sitePort = Number(process.env.SITE_PORT) || 5714;
const libURL = `http://localhost:${libPort}`;
const siteURL = `http://localhost:${sitePort}`;

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "lib-chromium",
      testDir: "./e2e",
      use: { ...devices["Desktop Chrome"], baseURL: libURL },
    },
    {
      name: "lib-firefox",
      testDir: "./e2e",
      use: { ...devices["Desktop Firefox"], baseURL: libURL },
    },
    {
      name: "lib-webkit",
      testDir: "./e2e",
      use: { ...devices["Desktop Safari"], baseURL: libURL },
    },
    {
      name: "site-chromium",
      testDir: "./site/e2e",
      use: { ...devices["Desktop Chrome"], baseURL: siteURL },
    },
    {
      name: "site-firefox",
      testDir: "./site/e2e",
      use: { ...devices["Desktop Firefox"], baseURL: siteURL },
    },
    {
      name: "site-webkit",
      testDir: "./site/e2e",
      use: { ...devices["Desktop Safari"], baseURL: siteURL },
    },
  ],
  webServer: [
    {
      command: "node e2e/server.js",
      url: `${libURL}/e2e/fixtures/index.html`,
      env: { PORT: String(libPort) },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "node site/server.js",
      url: `${siteURL}/`,
      env: { PORT: String(sitePort) },
      reuseExistingServer: !process.env.CI,
    },
  ],
});
