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
  // Append quality modifiers to ensure the AI generates a sharp image
  const enhancedQuery = `${searchQuery}, 8k resolution, ultra detailed, sharp focus, photorealistic, professional photography`;
  const query = encodeURIComponent(enhancedQuery.substring(0, 800)); // Cap length just in case
  
  // Use Pollinations AI. 
  // CRITICAL: We use 1024x1024 because the free tier models (sana/flux) natively output square images.
  // Forcing them to 1920x1080 causes severe compression and blurriness. 
  // Square images are perfectly fine for WordPress featured images and in-article content.
  const primaryUrl = `https://image.pollinations.ai/prompt/${query}?width=1024&height=1024&model=flux&seed=${seed}&nologo=true`;

  console.log(`[IMAGE] Generating AI Image via Pollinations...`);
  
  try {
    const primaryRes = await axios.get(primaryUrl, {
      responseType: 'arraybuffer',
      timeout: 45000, // AI generation can take a while
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    if (primaryRes.data && primaryRes.data.length > 5000) {
      return {
        buffer: Buffer.from(primaryRes.data),
        contentType: primaryRes.headers['content-type'] || 'image/jpeg'
      };
    }
  } catch (primaryErr) {
    console.warn(`[IMAGE] Pollinations failed, trying fallback...`);
  }

  // Engine 2: Picsum Fallback (Random High Quality Professional Photo)
  try {
    const fallbackUrl = `https://picsum.photos/seed/${seed}/1024/1024`;
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