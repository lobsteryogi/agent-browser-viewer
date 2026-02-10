module.exports = {
  apps: [
    {
      name: "agent-viewer",
      script: "node_modules/.bin/tsx",
      args: "server.ts",
      cwd: __dirname,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "3458",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      watch: false,
    },
  ],
};
