const { spawn } = require('child_process');
const http = require('http');

let logs = 'STARTING DEBUG SERVER...\n';

const child = spawn('node', ['dist/src/main.js'], {
  env: process.env // pass all env vars
});

child.stdout.on('data', (d) => {
  logs += d.toString();
  console.log(d.toString());
});

child.stderr.on('data', (d) => {
  logs += d.toString();
  console.error(d.toString());
});

child.on('error', (err) => {
  logs += 'SPAWN ERROR: ' + err.toString() + '\n';
});

child.on('close', (code) => {
  logs += 'PROCESS EXITED WITH CODE: ' + code + '\n';
});

// Since NestJS MIGHT fail to bind to 7860 or crash, we'll run a server on 7860
// Wait, if NestJS successfully binds to 7860, our server will fail to bind!
// So we let NestJS run on 3001, and our debug server on 7860!
process.env.PORT = '3001';

http.createServer((req, res) => {
  res.writeHead(200);
  res.end(logs);
}).listen(7860, () => {
  console.log('Debug server listening on 7860');
});
