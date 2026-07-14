import {defineConfig,devices} from '@playwright/test';

export default defineConfig({
  testDir:'./tests/web-dist',
  fullyParallel:false,
  workers:1,
  timeout:45000,
  expect:{timeout:8000},
  reporter:process.env.CI?'github':'list',
  use:{
    ...devices['Desktop Chrome'],
    baseURL:'http://127.0.0.1:4174',
    locale:'es-PY',
    timezoneId:'America/Asuncion',
    serviceWorkers:'allow'
  },
  webServer:{
    command:'node scripts/build-web-dist.mjs && node scripts/serve-static.mjs 4174 dist-pages',
    url:'http://127.0.0.1:4174/index.html',
    reuseExistingServer:!process.env.CI,
    timeout:30000
  }
});
