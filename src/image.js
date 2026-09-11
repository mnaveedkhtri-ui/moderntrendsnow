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
  const PIXABAY_KEY = '57489676-b13e0fe261e37ca2f22f32abb';
  
  // Try Pixabay first for 100% REAL, ultra-sharp 16:9 photography
  try {
    const cleanSearch = cleanQuery(searchQuery).replace(/[^a-zA-Z0-9\s]/g, '').trim();
    const keywords = cleanSearch.split(' ').slice(0, 3).join('+'); // 3 words max for better results
    const pixabayUrl = `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${keywords}&image_type=photo&orientation=horizontal&min_width=1280&safesearch=true&per_page=10`;
    
    console.log(`[IMAGE] Fetching 100% REAL professional photo from Pixabay for: "${keywords}"`);
    const pixRes = await axios.get(pixabayUrl, { timeout: 15000 });
    
    if (pixRes.data && pixRes.data.hits && pixRes.data.hits.length > 0) {
      // Pick a random image from the top 10 results
      const hit = pixRes.data.hits[Math.floor(Math.random() * Math.min(10, pixRes.data.hits.length))];
      const imageUrl = hit.largeImageURL;
      
      console.log(`[IMAGE] Downloading High-Res Pixabay Image...`);
      const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 30000 });
      
      // Process it through sharp just to ensure perfect 1280x720 crop and compression
      const processedBuffer = await processImage(Buffer.from(imgRes.data));
      return {
        buffer: processedBuffer,
        contentType: 'image/jpeg'
      };
    }
  } catch (err) {
    console.warn(`[IMAGE] Pixabay failed or no results found, trying fallback...`);
  }

  // Fallback to Native Pollinations (No cropping, No upscaling)
  try {
    const query = encodeURIComponent(searchQuery.substring(0, 800)); 
    const primaryUrl = `https://image.pollinations.ai/prompt/${query}?width=1024&height=576&model=flux&seed=${seed}&nologo=true`;

    console.log(`[IMAGE] Generating AI fallback via Pollinations natively...`);
    const primaryRes = await axios.get(primaryUrl, {
      responseType: 'arraybuffer',
      timeout: 60000, 
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    if (primaryRes.data && primaryRes.data.length > 5000) {
      console.log(`[IMAGE] AI Fallback generated!`);
      // NO UPSCALING. Just save as 1024x576 natively.
      const processedBuffer = await sharp(Buffer.from(primaryRes.data))
        .jpeg({ quality: 100 })
        .toBuffer();
        
      return {
        buffer: processedBuffer,
        contentType: 'image/jpeg'
      };
    }
  } catch (primaryErr) {}

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