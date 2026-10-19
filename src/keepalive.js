// Mali HTTP server koji Render koristi za health check.
// Free Web Service na Renderu se "uspava" posle 15 min bez saobraćaja,
// pa se ovaj endpoint pinguje (UptimeRobot / cron-job.org) da bot stalno radi.
const http = require('http');

let started = false;
let client = null;

function startHealthServer(discordClient) {
  if (discordClient) client = discordClient;
  if (started) return;

  const port = Number(process.env.PORT);
  if (!port) {
    // Lokalno (bez PORT promenljive) ne pokrećemo server
    return;
  }

  const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/health' || req.url.startsWith('/health?')) {
      const body = {
        status: client?.isReady?.() ? 'online' : 'starting',
        bot: client?.user?.tag ?? null,
        uptimeSeconds: Math.round(process.uptime()),
        pingMs: client?.ws?.ping ?? null
      };
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(body));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  });

  server.on('error', (err) => {
    console.warn('⚠️ Health server greška:', err.message);
  });

  server.listen(port, '0.0.0.0', () => {
    started = true;
    console.log(`🌐 Health check server radi na portu ${port} (endpoint: /health)`);
  });
}

module.exports = { startHealthServer };
