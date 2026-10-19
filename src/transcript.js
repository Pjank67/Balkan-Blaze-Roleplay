const config = require('./config');

// Preuzmi poruke iz kanala (do maxMessages, 100 po zahtevu)
async function fetchMessages(channel, maxMessages = 1000) {
  const collected = new Map();
  let lastId = null;

  while (collected.size < maxMessages) {
    const batch = await channel.messages.fetch({
      limit: 100,
      ...(lastId ? { before: lastId } : {})
    });

    if (!batch || batch.size === 0) break;

    for (const [id, message] of batch) collected.set(id, message);

    lastId = batch.last()?.id ?? null;
    if (batch.size < 100 || !lastId) break;
  }

  return [...collected.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) => {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
  });
}

function typeLabel(value) {
  return config.ticketTypes.find((t) => t.value === value)?.label ?? value ?? '—';
}

function renderMessage(message) {
  const author = escapeHtml(message.author?.tag ?? 'Nepoznato');
  const avatar = message.author?.displayAvatarURL?.({ size: 64, extension: 'png' }) ?? '';
  const time = new Date(message.createdTimestamp).toLocaleString('sr-RS', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const parts = [];
  if (message.content) {
    parts.push(`<div class="text">${escapeHtml(message.content).replace(/\n/g, '<br>')}</div>`);
  }
  if (message.embeds?.length) {
    parts.push(`<div class="embed">📋 Embed (${message.embeds.length})</div>`);
  }
  if (message.attachments?.size) {
    const links = [...message.attachments.values()]
      .map(
        (a) =>
          `<a href="${escapeHtml(a.url)}" target="_blank" rel="noopener">📎 ${escapeHtml(a.name ?? 'fajl')}</a>`
      )
      .join(' ');
    parts.push(`<div class="attachments">${links}</div>`);
  }
  if (parts.length === 0) {
    parts.push('<div class="text muted">[poruka bez teksta]</div>');
  }

  return `
  <div class="message">
    <img class="avatar" src="${avatar}" alt="" loading="lazy">
    <div class="body">
      <div class="header"><span class="author">${author}</span><span class="time">${time}</span></div>
      ${parts.join('\n')}
    </div>
  </div>`;
}

// Napravi HTML transkript tiketa
async function buildTranscript(channel, ticket) {
  const messages = await fetchMessages(channel);
  const number = String(ticket.number ?? 0).padStart(4, '0');
  const generatedAt = new Date();
  const rows = messages.map(renderMessage).join('\n');
  const opened = ticket.createdAt
    ? new Date(ticket.createdAt).toLocaleString('sr-RS', { dateStyle: 'medium', timeStyle: 'short' })
    : '—';

  const html = `<!DOCTYPE html>
<html lang="sr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tiket #${number} — ${escapeHtml(channel.name)}</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px 16px;
    background: #1e1f22;
    color: #dbdee1;
    font-family: "Segoe UI", Roboto, Arial, sans-serif;
    font-size: 15px;
    line-height: 1.5;
  }
  .wrap { max-width: 900px; margin: 0 auto; }
  header {
    background: #2b2d31;
    border-radius: 12px;
    padding: 20px 24px;
    margin-bottom: 20px;
    border-left: 4px solid #5865f2;
  }
  header h1 { margin: 0 0 8px; font-size: 22px; color: #fff; }
  .meta { font-size: 13px; color: #a3a6aa; }
  .meta b { color: #dbdee1; font-weight: 600; }
  .message {
    display: flex;
    gap: 12px;
    background: #2b2d31;
    border-radius: 10px;
    padding: 12px 16px;
    margin-bottom: 8px;
  }
  .avatar { width: 40px; height: 40px; border-radius: 50%; background: #404249; flex-shrink: 0; }
  .body { min-width: 0; flex: 1; }
  .header { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
  .author { font-weight: 600; color: #fff; }
  .time { font-size: 12px; color: #949ba4; }
  .text { white-space: normal; overflow-wrap: anywhere; }
  .embed, .attachments { margin-top: 6px; font-size: 13px; color: #a3a6aa; }
  .attachments a { color: #00a8fc; text-decoration: none; margin-right: 10px; }
  .attachments a:hover { text-decoration: underline; }
  .muted { color: #949ba4; font-style: italic; }
  footer { text-align: center; font-size: 12px; color: #6d6f78; margin-top: 20px; }
</style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>🎫 Tiket #${number} — ${escapeHtml(channel.name)}</h1>
      <div class="meta">
        <b>Kategorija:</b> ${escapeHtml(typeLabel(ticket.type))} &nbsp;•&nbsp;
        <b>Otvoren:</b> ${opened} &nbsp;•&nbsp;
        <b>Poruka:</b> ${messages.length}
      </div>
    </header>
    <main>
      ${rows || '<p class="muted">Nema poruka u tiketu.</p>'}
    </main>
    <footer>Transkript generisan ${generatedAt.toLocaleString('sr-RS')}</footer>
  </div>
</body>
</html>`;

  const fileName = `tiket-${number}-transkript.html`;
  return {
    buffer: Buffer.from(html, 'utf8'),
    fileName,
    count: messages.length
  };
}

module.exports = { buildTranscript };
