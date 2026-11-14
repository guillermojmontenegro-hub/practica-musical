import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir:'./tests',
 testMatch:'*.spec.mjs',
 workers:1,
 use:{baseURL:'http://localhost:5173',launchOptions:{executablePath:process.env.CHROME_PATH || '/usr/bin/google-chrome',args:['--no-sandbox']}},
 webServer:{command:'npm run dev',url:'http://localhost:5173',reuseExistingServer:!process.env.CI},
});
