const axios = require('axios');
const dotenv = require('dotenv');
const { fetchImageBuffer } = require('./image');
dotenv.config();

function getAuthHeader() {
  const user = process.env.WP_USERNAME;
  const appPassword = process.env.WP_APP_PASSWORD; // Generated from Users -> Profile -> Application Passwords
  if (!user || !appPassword) {
    throw new Error('WP_USERNAME or WP_APP_PASSWORD missing in environment.');
  }
  const token = Buffer.from(user + ':' + appPassword).toString('base64');
  return 'Basic ' + token;
}

function getBaseUrl() {
  let url = process.env.WP_SITE_URL || '';
  if (!url) throw new Error('WP_SITE_URL missing in environment (e.g. https://yourwebsite.com)');
  return url.replace(/\/$/, '');
}

/**
 * Fetch published posts from WordPress for contextual Internal Linking
 */
async function getExistingPosts(limit = 20) {
  const baseUrl = getBaseUrl();
  try {
    const res = await axios.get(baseUrl + '/wp-json/wp/v2/posts?status=publish&per_page=' + limit + '&_fields=id,title,link', {
      timeout: 15000
    });
    if (res.data && Array.isArray(res.data)) {
      return res.data.map(p => ({
        id: p.id,
        title: p.title?.rendered || '',
        link: p.link
      }));
    }
  } catch (err) {
    console.warn('[WP] Could not fetch existing posts for internal linking:', err.message);
  }
  return [];
}

/**
 * Upload an image buffer to WordPress Media Library
 */
async function uploadMedia({ buffer, filename, altText, caption }) {
  const baseUrl = getBaseUrl();
  const auth = getAuthHeader();

  console.log('[WP] Uploading media file: ' + filename + '...');
  const response = await axios.post(baseUrl + '/wp-json/wp/v2/media', buffer, {
    headers: {
      'Authorization': auth,
      'Content-Type': 'image/jpeg',
      'Content-Disposition': 'attachment; filename="' + filename + '"'
    },
    timeout: 60000
  });

  const mediaId = response.data.id;
  const sourceUrl = response.data.source_url;

  // Update alt text and caption
  try {
    await axios.post(baseUrl + '/wp-json/wp/v2/media/' + mediaId, {
      alt_text: altText,
      caption: caption || altText,
      description: altText
    }, {
      headers: { 'Authorization': auth }
    });
  } catch (updateErr) {
    console.warn('[WP] Could not set alt text for media ' + mediaId + ':', updateErr.message);
  }

  return { mediaId, sourceUrl };
}

/**
 * Get or create Category ID by name
 */
async function getOrCreateCategory(categoryName) {
  const baseUrl = getBaseUrl();
  const auth = getAuthHeader();

  try {
    const listResp = await axios.get(baseUrl + '/wp-json/wp/v2/categories?search=' + encodeURIComponent(categoryName), {
      headers: { 'Authorization': auth }
    });
    if (listResp.data && listResp.data.length > 0) {
      return listResp.data[0].id;
    }

    // Create if not exists
    const createResp = await axios.post(baseUrl + '/wp-json/wp/v2/categories', {
      name: categoryName
    }, {
      headers: { 'Authorization': auth }
    });
    return createResp.data.id;
  } catch (err) {
    console.warn('[WP] Error getting category ' + categoryName + ':', err.message);
    return null;
  }
}

/**
 * Process in-article image placeholders and replace with real WP media figures
 */
async function processInArticleImages(contentHtml) {
  const regex = /<!--\s*IN_ARTICLE_IMAGE:\s*(\{.*?\})\s*-->/g;
  let match;
  let matches = [];

  while ((match = regex.exec(contentHtml)) !== null) {
    matches.push({ fullMatch: match[0], jsonStr: match[1] });
  }

  console.log('[WP] Found ' + matches.length + ' in-article image markers to process.');

  let updatedHtml = contentHtml;
  let index = 1;

  for (const item of matches) {
    try {
      const meta = JSON.parse(item.jsonStr);
      const query = meta.keyword || 'high resolution editorial photography';
      const alt = meta.alt || query;
      const caption = meta.caption || alt;
      const seed = Math.floor(Math.random() * 900000) + (index * 777);

      console.log('[WP] Generating & uploading in-article image ' + index + ' (Unique Seed: ' + seed + '): "' + query + '"...');
      const imgData = await fetchImageBuffer(query, seed);
      const filename = 'in-post-' + Date.now() + '-' + index + '.jpg';
      const uploaded = await uploadMedia({
        buffer: imgData.buffer,
        filename,
        altText: alt,
        caption: caption
      });

      const figureHtml = '\n<figure class="wp-block-image size-large">\n  <img src="' + uploaded.sourceUrl + '" alt="' + alt + '" class="wp-image-' + uploaded.mediaId + '" loading="lazy" />\n  <figcaption>' + caption + '</figcaption>\n</figure>';

      updatedHtml = updatedHtml.replace(item.fullMatch, figureHtml);
      index++;
    } catch (err) {
      console.warn('[WP] Failed to process in-article image:', err.message);
      updatedHtml = updatedHtml.replace(item.fullMatch, '');
    }
  }

  return updatedHtml;
}

/**
 * Create a new Post in WordPress with Yoast SEO Meta
 */
async function createPost({ title, contentHtml, categoryName, tags, featuredMediaId, yoastMeta, status = 'publish' }) {
  const baseUrl = getBaseUrl();
  const auth = getAuthHeader();

  const categoryId = await getOrCreateCategory(categoryName);

  const postPayload = {
    title: title,
    content: contentHtml,
    status: status,
    featured_media: featuredMediaId || 0,
    categories: categoryId ? [categoryId] : [],
    meta: {
      _yoast_wpseo_title: yoastMeta.meta_title,
      _yoast_wpseo_metadesc: yoastMeta.meta_description,
      _yoast_wpseo_focuskw: yoastMeta.focus_keyword
    }
  };

  console.log('[WP] Publishing post "' + title + '" (Status: ' + status + ')...');
  const response = await axios.post(baseUrl + '/wp-json/wp/v2/posts', postPayload, {
    headers: {
      'Authorization': auth,
      'Content-Type': 'application/json'
    },
    timeout: 60000
  });

  return response.data;
}

module.exports = {
  getExistingPosts,
  uploadMedia,
  getOrCreateCategory,
  processInArticleImages,
  createPost
};
