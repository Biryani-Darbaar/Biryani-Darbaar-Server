export default {
  apps: [
    {
      name: "biryani-darbaar-server",
      script: "index.js",
      instances: 1,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "development",
        PORT: 3000,
      },
      env_qa: {
        NODE_ENV: "qa",
        PORT: 4000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 5000,
      },
    },
  ],
};
