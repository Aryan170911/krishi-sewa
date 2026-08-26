module.exports = {
  apps: [
    {
      name: "krishi-node",
      cwd: "./server",
      script: "server.js",
      env: { NODE_ENV: "production", PORT: 3000 },
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "300M",
      error_file: "../logs/node-err.log",
      out_file: "../logs/node-out.log",
      time: true
    },
    {
      name: "krishi-py",
      cwd: "./",
      script: "api.py",
      interpreter: "python3",
      env: { PORT: 8000, FLASK_ENV: "production" },
      instances: 1,
      exec_mode: "fork",
      error_file: "./logs/py-err.log",
      out_file: "./logs/py-out.log",
      time: true
    }
  ]
};
