// eBay Finding API relay — run on your HOME laptop so requests use your
// (unblocked) residential IP. The Kickoff Cards backend calls this relay's
// URL (stored as the EBAY_PROXY_URL secret) and it forwards to eBay.
//
// Prereqs: Node 18+ installed.  Then:
//   1. Paste your eBay App ID below (same value as the EBAY_APP_ID secret).
//   2. node relay/ebay-relay.js
//   3. Expose it publicly with a Cloudflare Tunnel (one command, no account):
//        cloudflared tunnel --url http://localhost:8787
//      It prints a URL like https://<random>.trycloudflare.com — copy it.
//   4. Set the EBAY_PROXY_URL secret to that trycloudflare URL.
//
// Keep the laptop on + the relay + tunnel running while you want live data.

import http from 'node:http';

const APP_ID = 'PASTE_YOUR_EBAY_APP_ID_HERE';
const PORT = 8787;
const EBAY_BASE = 'https://svcs.ebay.com/services/search/FindingService/v1';

http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/health') { res.end('ok'); return; }

  const params = new URLSearchParams(url.searchParams);
  params.set('SECURITY-APPNAME', APP_ID); // force our app id from the home IP
  try {
    const r = await fetch(EBAY_BASE + '?' + params.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-EBAY-SOA-RESPONSE-DATA-FORMAT': 'JSON',
      },
    });
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = r.status;
    res.end(await r.text());
  } catch (e) {
    res.statusCode = 502;
    res.end(JSON.stringify({ error: e.message }));
  }
}).listen(PORT, () => console.log('eBay relay on http://localhost:' + PORT));