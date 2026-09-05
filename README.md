# 🚀 WordPress AI SEO Autopilot (Daily 2 Posts)

A completely autonomous, professional SEO content machine built for WordPress. It automatically generates 1500+ word, deeply structured, human-like articles across 5 niches, includes relevant **in-article contextual images** + **featured image**, injects **FAQ JSON-LD Schema markup**, configures **Yoast SEO metadata**, and auto-publishes twice daily via GitHub Actions.

---

## 🌟 Key Features

1. **Multi-Niche Rotation**:
   - Health and Wellness
   - Technology and AI
   - Finance
   - Education
   - Travel
2. **True 10/10 SEO Optimization**:
   - Semantic `H2`, `H3` hierarchy with styled Key Takeaways callout box.
   - Comparison tables (`<table>`) and bulleted takeaways.
   - **Contextual In-Article Images (2-3 per post)** embedded automatically with Focus Keyword alt text and captions.
   - **Google Rich Snippet FAQ Schema**: Valid JSON-LD `<script type="application/ld+json">` automatically appended.
   - **Yoast SEO Integration**: Automatically populates `_yoast_wpseo_title`, `_yoast_wpseo_metadesc`, and `_yoast_wpseo_focuskw`.
3. **Automated Zero-Cost Scheduler**:
   - Runs on **GitHub Actions** twice daily (11:00 AM & 11:00 PM PKT / 06:00 & 18:00 UTC).
   - Zero server hosting required.

---

## 🛠️ Quick Setup Guide (Easiest Way)

### 1. WordPress REST API Credentials
1. Log in to your WordPress Admin Dashboard (`yourwebsite.com/wp-admin`).
2. Go to **Users** -> **Profile** (or **All Users** -> edit your administrator user).
3. Scroll down to **Application Passwords**.
4. Type an Application Name (e.g. `SEO Autopilot`) and click **Add New Application Password**.
5. Copy the generated password (e.g., `xxxx xxxx xxxx xxxx`).

### 2. Get Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Click **Get API key** and create a new key.

### 3. Local Testing
Create a `.env` file in this directory (copy from `.env.example`):
```env
GEMINI_API_KEY=your_gemini_api_key
WP_SITE_URL=https://yourwebsite.com
WP_USERNAME=your_admin_username
WP_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

Test running in dry-run mode (does not post to WP):
```bash
npm run dry-run
```

Test posting as a draft (so you can preview it in WP admin before making it live):
```bash
node src/index.js --draft
```

### 4. Deploy to GitHub (Automate 2x Daily)
1. Push this project folder to your GitHub repository.
2. In your GitHub repository, go to **Settings** -> **Secrets and variables** -> **Actions**.
3. Add the following **Repository secrets**:
   - `GEMINI_API_KEY`: Your Google Gemini API Key
   - `WP_SITE_URL`: `https://yourwebsite.com`
   - `WP_USERNAME`: Your WordPress username
   - `WP_APP_PASSWORD`: Your generated WordPress Application Password
4. Go to the **Actions** tab in your GitHub repository:
   - You will see the **WordPress AI SEO Autopilot** workflow.
   - Click **Run workflow** to test it anytime manually!
   - From then on, it will automatically publish 2 articles every single day.
