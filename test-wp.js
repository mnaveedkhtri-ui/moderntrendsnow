const { processInArticleImages } = require('./src/wordpress');

const mockHtml = `<p>Test</p>
<!-- IN_ARTICLE_IMAGE: {"keyword": "neon cyberpunk office", "alt": "test alt", "caption": "test cap"} -->
<p>End</p>`;

async function test() {
  const result = await processInArticleImages(mockHtml);
  console.log(result);
}
test();
