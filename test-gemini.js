const fs = require('fs');
const { generateArticle } = require('./src/gemini');

async function test() {
  console.log('Testing Gemini output...');
  try {
    const article = await generateArticle({
      category: 'Technology',
      topic: 'Future of AI',
      existingPosts: []
    });
    console.log('Images found in HTML:', (article.content_html.match(/<!--\s*IN_ARTICLE_IMAGE:.*?-->/g) || []).length);
    console.log(article.content_html.substring(0, 500));
  } catch (err) {
    console.error(err);
  }
}
test();
