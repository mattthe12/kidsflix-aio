export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const response = await env.ASSETS.fetch(request);
    const type = response.headers.get('content-type') || '';

    // A stale index.html can request an old hashed bundle after a deploy. Never
    // answer a missing asset with the SPA fallback: HTML parsed as JavaScript
    // throws "Unexpected token '<'" and leaves a blank page.
    if (type.includes('text/html') && url.pathname !== '/' && url.pathname.includes('.')) {
      return new Response('Asset not found', {
        status: 404,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      });
    }

    // Keep the app shell revalidating so a new deploy is picked up immediately.
    if (type.includes('text/html')) {
      const headers = new Headers(response.headers);
      headers.set('cache-control', 'no-store, max-age=0, must-revalidate');
      return new Response(response.body, { status: response.status, headers });
    }

    return response;
  },
};
