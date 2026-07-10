import {defineConfig,devices} from '@playwright/test';

export default defineConfig({
  testDir:'./tests/e2e',
  fullyParallel:false,
  workers:1,
  timeout:45000,
  expect:{timeout:8000},
  reporter:process.env.CI?'github':'list',
  use:{
    baseURL:'http://127.0.0.1:4173',
    locale:'es-PY',
    timezoneId:'America/Asuncion',
    serviceWorkers:'allow',
    trace:'retain-on-failure'
  },
  projects:[
    {name:'android-chromium',use:{...devices['Pixel 7'],browserName:'chromium'}},
    {name:'iphone-webkit',use:{...devices['iPhone 13'],browserName:'webkit'}}
  ],
  webServer:{
    command:'node scripts/serve-static.mjs 4173',
    url:'http://127.0.0.1:4173/index.html',
    reuseExistingServer:!process.env.CI,
    timeout:30000
  }
});
