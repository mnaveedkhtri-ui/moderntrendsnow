const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { generateArticle } = require('./gemini');
const { fetchImageBuffer } = require('./image');
const { getExistingPosts, uploadMedia, processInArticleImages, createPost } = require('./wordpress');
const { getNextTopicFromSheet } = require('./sheets');

dotenv.config();

const STATE_FILE = path.join(__dirname, '..', 'config', 'state.json');
const TOPICS_FILE = path.join(__dirname, '..', 'config', 'topics.json');

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch (e) {}
  }
  return { lastCategoryIndex: -1, postedTopics: [] };
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

async function runAutopilot() {
  console.log('====================================================');
  console.log('🚀 STARTING WORDPRESS AI SEO AUTOPILOT RUN');
  console.log('====================================================');

  const topicsData = JSON.parse(fs.readFileSync(TOPICS_FILE, 'utf8'));
  const categories = topicsData.categories;
  const state = loadState();

  // Try Google Sheet first (User's researched keywords)
  let chosenTopic = null;
  let categoryName = null;
  const sheetItem = await getNextTopicFromSheet();

  if (sheetItem && sheetItem.keyword) {
    chosenTopic = sheetItem.keyword;
    categoryName = sheetItem.category || 'General';
    console.log(`[AUTOPILOT] 🎯 Using High-Value Keyword from Google Sheet: "${chosenTopic}"`);
  } else {
    // Fallback to internal niche rotation
    const nextCatIndex = (state.lastCategoryIndex + 1) % categories.length;
    const currentCategory = categories[nextCatIndex];
    categoryName = currentCategory.name;
    chosenTopic = currentCategory.subtopics.find(t => !state.postedTopics.includes(t));
    if (!chosenTopic) {
      chosenTopic = currentCategory.subtopics[Math.floor(Math.random() * currentCategory.subtopics.length)];
    }
    state.lastCategoryIndex = nextCatIndex;
    console.log(`[AUTOPILOT] Niche: "${categoryName}"`);
    console.log(`[AUTOPILOT] Target Topic: "${chosenTopic}"`);
  }

  // Fetch existing posts for contextual INTERNAL LINKING
  console.log('[AUTOPILOT] Fetching existing published posts for Internal Linking...');
  const existingPosts = await getExistingPosts(15);
  console.log(`[AUTOPILOT] Found ${existingPosts.length} published posts to weave into internal links.`);

  // Step 1: Generate Deep SEO Content via Gemini
  console.log('[AUTOPILOT] Generating 1800-2400 words complete SEO article with Gemini...');
  const articleData = await generateArticle({
    category: categoryName,
    topic: chosenTopic,
    existingPosts: existingPosts
  });

  console.log(`[AUTOPILOT] Article Generated: "${articleData.title}"`);
  console.log(`[AUTOPILOT] Focus Keyword: "${articleData.focus_keyword}"`);
  console.log(`[AUTOPILOT] Yoast Meta Title: "${articleData.meta_title}"`);

  const isDryRun = process.argv.includes('--dry-run');
  if (isDryRun) {
    console.log('[AUTOPILOT] Dry run enabled. Skipping WordPress upload.');
    console.log('[AUTOPILOT] Sample HTML Output preview (first 500 chars):');
    console.log(articleData.content_html.substring(0, 500) + '...');
    return;
  }

  // Step 2: Upload Featured Cover Image
  console.log('[AUTOPILOT] Generating and uploading Featured Cover Image...');
  const coverImageSearch = articleData.featured_image_search || articleData.focus_keyword;
  const coverImageData = await fetchImageBuffer(coverImageSearch);
  const coverFilename = `${articleData.slug}-featured.jpg`;

  const uploadedCover = await uploadMedia({
    buffer: coverImageData.buffer,
    filename: coverFilename,
    altText: articleData.featured_image_alt || articleData.focus_keyword,
    caption: articleData.title
  });

  console.log(`[AUTOPILOT] Featured image uploaded successfully! Media ID: ${uploadedCover.mediaId}`);

  // Step 3: Process In-Article Images
  console.log('[AUTOPILOT] Processing in-article contextual images...');
  const finalContentHtml = await processInArticleImages(articleData.content_html);

  // Step 4: Publish to WordPress with Yoast SEO Meta
  const postStatus = process.argv.includes('--draft') ? 'draft' : 'publish';
  const postResult = await createPost({
    title: articleData.title,
    slug: articleData.slug,
    contentHtml: finalContentHtml,
    categoryName: categoryName,
    tags: articleData.tags,
    featuredMediaId: uploadedCover.mediaId,
    yoastMeta: {
      meta_title: articleData.meta_title,
      meta_description: articleData.meta_description,
      focus_keyword: articleData.focus_keyword
    },
    status: postStatus
  });

  console.log('[AUTOPILOT] ✅ Post successfully created!');
  console.log(`[AUTOPILOT] URL: ${postResult.link}`);

  // Update state
  if (!state.postedTopics.includes(chosenTopic)) {
    state.postedTopics.push(chosenTopic);
  }
  saveState(state);

  console.log('====================================================');
  console.log('🎉 AUTOPILOT COMPLETED SUCCESSFULLY');
  console.log('====================================================');
}

runAutopilot().catch(err => {
  console.error('[AUTOPILOT ERROR]:', err.response?.data || err.message || err);
  process.exit(1);
});
