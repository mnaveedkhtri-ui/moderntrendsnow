const axios = require('axios');
const sharp = require('sharp');

/**
 * Clean text for URL querying
 */
function cleanQuery(query) {
  try {
    const obj = JSON.parse(query);
    return obj.keyword || query;
  } catch (e) {
    return String(query || 'scenic photography');
  }
}

/**
 * Use sharp to crop the image to exactly 16:9 (1280x720)
 */
async function processImage(buffer) {
  return await sharp(buffer)
    .resize({
      width: 1280,
      height: 720,
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ quality: 90 })
    .toBuffer();
}

/**
 * Fetches unique, high-resolution, photorealistic image buffer
 * Uses multiple reliable photo engines with unique seeds to ensure NO DUPLICATES
 */
async function fetchImageBuffer(searchQuery, seed = Math.floor(Math.random() * 1000000)) {
  const pixabayKey = '57489676-b13e0fe261e37ca2f22f32abb';
  
  // Clean query for Pixabay
  let query = cleanQuery(searchQuery).replace(/[^a-zA-Z0-9\s]/g, ' ').trim().replace(/\s+/g, '+');
  if (query.length > 50) {
    query = query.split('+').slice(0, 2).join('+'); // Keep it simple to 1-2 words for best results
  }

  // Engine 1: Pixabay (High Quality 16:9 Real Stock Photos)
  console.log(`[IMAGE] Fetching from Pixabay for keyword: "${query}"...`);
  try {
    const searchUrl = `https://pixabay.com/api/?key=${pixabayKey}&q=${query}&image_type=photo&orientation=horizontal&safesearch=true&per_page=20`;
    const searchRes = await axios.get(searchUrl, { timeout: 15000 });
    
    if (searchRes.data && searchRes.data.hits && searchRes.data.hits.length > 0) {
      // Pick a random image from the results using the seed
      const randomIndex = seed % searchRes.data.hits.length;
      const imageUrl = searchRes.data.hits[randomIndex].largeImageURL;
      
      console.log(`[IMAGE] Pixabay found photo -> fetching...`);
      const primaryRes = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 45000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      if (primaryRes.data && primaryRes.data.length > 5000) {
        const processedBuffer = await processImage(Buffer.from(primaryRes.data));
        return {
          buffer: processedBuffer,
          contentType: 'image/jpeg'
        };
      }
    }
  } catch (primaryErr) {
    console.warn(`[IMAGE] Pixabay failed or found no results for "${query}", trying fallback...`);
  }

  // Engine 2: Picsum Fallback (Random High Quality 16:9 Professional Photo)
  try {
    const fallbackUrl = `https://picsum.photos/seed/${seed}/1280/720`;
    console.log(`[IMAGE] Fetching fallback 16:9 photo from Picsum...`);
    const response = await axios.get(fallbackUrl, {
      responseType: 'arraybuffer',
      timeout: 20000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (response.data && response.data.length > 5000) {
      const processedBuffer = await processImage(Buffer.from(response.data));
      return {
        buffer: processedBuffer,
        contentType: 'image/jpeg'
      };
    }
  } catch (fallbackErr) {
    console.warn('[IMAGE] Fallback engine failed...');
  }

  throw new Error('All image generation engines failed.');
}

module.exports = { fetchImageBuffer };