/**
 * SPEC9 Flooring — Cloudflare Worker
 * -----------------------------------
 * Minimal entrypoint: hands every request to the static ASSETS
 * binding (see wrangler.toml). Everything is served from /public:
 *   index.html, assets/css, assets/js, images, etc.
 *
 * To add caching headers, security headers, a redirect, or a
 * /api/* route later, intercept the request here before falling
 * back to the assets.
 */
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};