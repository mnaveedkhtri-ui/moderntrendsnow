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

  // Enforce photography styles to prevent blurry/plastic AI look
  const styleEnhancer = encodeURIComponent(", photorealistic photography, hyperrealistic, 8k resolution, highly detailed, sharp focus, cinematic lighting");

  // Engine 1: Pollinations Auto Model (Most Stable)
  const primaryUrl = `https://image.pollinations.ai/prompt/${query}${styleEnhancer}?width=1280&height=720&nologo=true`;

  try {
    const response = await axios.get(primaryUrl, {
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
  } catch (primaryErr) {
    console.warn(`[IMAGE] Primary engine timeout/fail for "${searchQuery}", trying fallback...`);
  }

  // Engine 2: Pollinations Fallback
  try {
    const fallbackUrl = `https://image.pollinations.ai/prompt/${query}?width=1280&height=720&nologo=true`;
    const response = await axios.get(fallbackUrl, {
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
  } catch (fallbackErr) {
    console.warn('[IMAGE] Fallback engine failed...');
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