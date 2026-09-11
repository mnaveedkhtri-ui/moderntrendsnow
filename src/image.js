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
  // Use Pollinations AI for highly relevant, context-aware images
  const enhancedQuery = `${searchQuery}, 8k resolution, ultra detailed, sharp focus, photorealistic, cinematic lighting`;
  const query = encodeURIComponent(enhancedQuery.substring(0, 800)); 
  
  // Request 1024x1024 (Square) to guarantee the highest quality AI generation.
  // Our sharp processor will cleanly CROP the top and bottom to make it 1024x576 (16:9).
  const primaryUrl = `https://image.pollinations.ai/prompt/${query}?width=1024&height=1024&model=flux&seed=${seed}&nologo=true`;

  console.log(`[IMAGE] Generating AI Image via Pollinations for perfect context match...`);
  try {
    const primaryRes = await axios.get(primaryUrl, {
      responseType: 'arraybuffer',
      timeout: 60000, 
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    if (primaryRes.data && primaryRes.data.length > 5000) {
      console.log(`[IMAGE] AI Image generated, maintaining native crisp resolution...`);
      // Dynamic extraction to perfectly crop center to 16:9 regardless of AI output size
      const imageBuffer = Buffer.from(primaryRes.data);
      const metadata = await sharp(imageBuffer).metadata();
      const actualWidth = metadata.width;
      const actualHeight = metadata.height;
      
      const targetHeight = Math.floor(actualWidth * (9 / 16));
      const topOffset = Math.floor((actualHeight - targetHeight) / 2);
      
      const processedBuffer = await sharp(imageBuffer)
        .extract({ left: 0, top: topOffset, width: actualWidth, height: targetHeight })
        .jpeg({ quality: 100, chromaSubsampling: '4:4:4' })
        .toBuffer();
        
      return {
        buffer: processedBuffer,
        contentType: 'image/jpeg'
      };
    }
  } catch (primaryErr) {
    console.warn(`[IMAGE] Pollinations failed for "${searchQuery}", trying fallback...`);
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