/**
 * Hugging Face Proxy Server
 * Opens port 7860 immediately to pass HF health checks,
 * then proxies all requests to NestJS on port 3001 once it's ready.
 */
const http = require('http');
const { spawn } = require('child_process');

const HF_PORT = 7860;
const NEST_PORT = 3001;
let nestReady = false;

// Start NestJS as a background child process
let nestLogs = [];
const logStream = (data) => {
  const str = data.toString();
  console.log(str);
  nestLogs.push(str);
  if (nestLogs.length > 200) nestLogs.shift();
};

const nest = spawn('node', ['dist/src/main.js'], {
  env: { ...process.env, PORT: String(NEST_PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
});

nest.stdout.on('data', logStream);
nest.stderr.on('data', logStream);

nest.on('close', (code) => {
  const msg = `[proxy] NestJS exited with code ${code}`;
  console.error(msg);
  nestLogs.push(msg);
  // Don't exit, stay alive to serve /debug
});

// Poll until NestJS is listening
function waitForNest(callback) {
  const check = () => {
    const req = http.request({ host: '127.0.0.1', port: NEST_PORT, path: '/health', method: 'GET' }, (res) => {
      if (res.statusCode < 500) {
        nestReady = true;
        console.log('[proxy] NestJS is ready, proxying traffic.');
        callback();
      } else {
        setTimeout(check, 1000);
      }
    });
    req.on('error', () => setTimeout(check, 1000));
    req.end();
  };
  check();
}

// Reverse proxy server on HF_PORT
const proxy = http.createServer((req, res) => {
  if (req.url === '/debug') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(nestLogs.join(''));
    return;
  }

  if (!nestReady) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'starting', message: 'Backend is booting up, please wait...' }));
    return;
  }

  const options = {
    host: '127.0.0.1',
    port: NEST_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error('[proxy] Error proxying request:', err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Bad Gateway', message: err.message }));
  });

  req.pipe(proxyReq, { end: true });
});

proxy.listen(HF_PORT, '0.0.0.0', () => {
  console.log(`[proxy] Listening on port ${HF_PORT}, waiting for NestJS on port ${NEST_PORT}...`);
  waitForNest(() => console.log('[proxy] All systems go!'));
});
