/**
 * Hot Monitor - 一键启动脚本
 * 同时启动服务端 + 客户端，单个终端窗口
 * 用法: node start.js
 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nodeExe = process.execPath; // auto-detect: works even if node not in PATH

const colors = {
  server: '\x1b[36m', // cyan
  client: '\x1b[35m', // magenta
  reset: '\x1b[0m',
  dim: '\x1b[2m',
};

function log(label, data) {
  const prefix = colors[label] + `[${label}]` + colors.reset;
  data.toString().trim().split('\n').forEach(line => {
    console.log(`${prefix} ${line}`);
  });
}

// Start server (using detected node path)
const server = spawn(nodeExe, ['server/index.js'], {
  cwd: __dirname,
  stdio: 'pipe',
});
server.stdout.on('data', d => log('server', d));
server.stderr.on('data', d => log('server', d));
server.on('close', code => console.log(`[server] exited with code ${code}`));

// Start Vite client (using detected node path, direct vite bin)
const viteBin = path.join(__dirname, 'client', 'node_modules', 'vite', 'bin', 'vite.js');
const client = spawn(nodeExe, [viteBin, '--host'], {
  cwd: path.join(__dirname, 'client'),
  stdio: 'pipe',
});
client.stdout.on('data', d => log('client', d));
client.stderr.on('data', d => log('client', d));
client.on('close', code => console.log(`[client] exited with code ${code}`));

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.kill();
  client.kill();
  process.exit(0);
});

console.log(`${colors.server}[server]${colors.reset} Starting on http://localhost:3456`);
console.log(`${colors.client}[client]${colors.reset} Starting on http://localhost:5173`);
console.log(`${colors.dim}Press Ctrl+C to stop both servers${colors.reset}\n`);
