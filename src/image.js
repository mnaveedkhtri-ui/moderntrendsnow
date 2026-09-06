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
  let query = cleanQuery(searchQuery).replace(/[^a-zA-Z0-9]/g, ''); // Extract only the single broad keyword
  
  if (query.length > 20) {
    query = 'technology'; // Fallback to a very safe broad keyword if Gemini messes up
  }

  // Engine 1: LoremFlickr (Real Stock Photos using a single broad keyword)
  try {
    const primaryUrl = `https://loremflickr.com/1280/720/${query}?lock=${seed}`;
    console.log(`[IMAGE] Fetching from LoremFlickr for keyword: "${query}"...`);
    const primaryRes = await axios.get(primaryUrl, {
      responseType: 'arraybuffer',
      timeout: 20000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    if (primaryRes.data && primaryRes.data.length > 5000) {
      return {
        buffer: Buffer.from(primaryRes.data),
        contentType: primaryRes.headers['content-type'] || 'image/jpeg'
      };
    }
  } catch (primaryErr) {
    console.warn(`[IMAGE] LoremFlickr failed for "${query}", trying fallback...`);
  }

  // Engine 2: Picsum Fallback (Random High Quality Professional Photo)
  try {
    const fallbackUrl = `https://picsum.photos/seed/${seed}/1280/720`;
    console.log(`[IMAGE] Fetching fallback from Picsum...`);
    const response = await axios.get(fallbackUrl, {
      responseType: 'arraybuffer',
      timeout: 20000,
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

  throw new Error('All image generation engines failed.');
}

module.exports = { fetchImageBuffer };