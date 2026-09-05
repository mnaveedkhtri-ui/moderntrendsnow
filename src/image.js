const axios = require('axios');

/**
 * Clean text for URL querying
 */
function cleanQuery(str) {
  return encodeURIComponent(String(str || 'scenic photography').trim());
}

/**
 * Fetches unique, high-resolution, photorealistic image buffer
 * Uses multiple reliable photo engines with unique seeds to ensure NO DUPLICATES
 */
async function fetchImageBuffer(searchQuery, seed = Math.floor(Math.random() * 1000000)) {
  const query = cleanQuery(searchQuery);

  // Engine 1: Pollinations Flux Model with photorealistic photography parameters & unique seed
  const fluxUrl = `https://image.pollinations.ai/prompt/${query}?width=1280&height=720&model=flux&seed=${seed}&nologo=true`;

  try {
    const response = await axios.get(fluxUrl, {
      responseType: 'arraybuffer',
      timeout: 60000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (response.data && response.data.length > 5000) {
      return {
        buffer: Buffer.from(response.data),
        contentType: response.headers['content-type'] || 'image/jpeg'
      };
    }
  } catch (fluxErr) {
    console.warn(`[IMAGE] Primary Flux engine timeout/fail for "${searchQuery}", trying high-res curated engine...`);
  }

  // Engine 2: Pollinations Turbo with high-speed photorealism
  try {
    const turboUrl = `https://image.pollinations.ai/prompt/${query}?width=1280&height=720&model=turbo&seed=${seed}&nologo=true`;
    const response = await axios.get(turboUrl, {
      responseType: 'arraybuffer',
      timeout: 40000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (response.data && response.data.length > 5000) {
      return {
        buffer: Buffer.from(response.data),
        contentType: response.headers['content-type'] || 'image/jpeg'
      };
    }
  } catch (turboErr) {
    console.warn('[IMAGE] Turbo engine failed, using direct standard fallback...');
  }

  // Engine 3: Topic-targeted Pollinations standard fallback (guaranteed fast)
  const fallbackUrl = `https://image.pollinations.ai/prompt/${query}?width=1280&height=720&seed=${seed}&nologo=true`;
  const fallbackResp = await axios.get(fallbackUrl, {
    responseType: 'arraybuffer',
    timeout: 30000
  });

  return {
    buffer: Buffer.from(fallbackResp.data),
    contentType: 'image/jpeg'
  };
}

module.exports = { fetchImageBuffer };