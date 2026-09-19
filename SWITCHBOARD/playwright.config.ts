import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./e2e',workers:1,timeout:60000,use:{baseURL:'http://localhost:3000',trace:'retain-on-failure'},
 webServer:[
  {command:'node backend/dist/server.js',url:'http://127.0.0.1:4000/health',timeout:30000,reuseExistingServer:false,env:{NODE_ENV:'test',FRONTEND_URL:'http://localhost:3000'}},
  {command:'npm run start -- --hostname 0.0.0.0',url:'http://localhost:3000/login',timeout:30000,reuseExistingServer:false,env:{SWITCHBOARD_API_URL:'http://127.0.0.1:4000/api'}}
 ]
});
