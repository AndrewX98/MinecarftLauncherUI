/* ============================================================
   news.js: News page
   ============================================================ */
const newsGrid = document.getElementById('news-grid');
const newsStatus = document.getElementById('news-status');
const newsMore = document.getElementById('news-more');
const NEWS_URL = 'https://www.minecraft.net/content/minecraftnet/language-masters/en-us/jcr:content/root/'
  + 'container/image_grid_a_copy_64.articles.page-$PAGE.json';

let newsLoaded = false;
let newsPage = 1;
let newsLoading = false;

async function loadNews() {
  if (newsLoading) return;
  newsLoading = true;
  showStatus(newsStatus, 'Loading articles...');
  try {
    const url = NEWS_URL.replace('$PAGE', newsPage);
    let text;
    if (window.launcher && window.launcher.get) {
      try {
        text = await window.launcher.get(url);
      } catch (e) {
        text = null;
      }
    }
    if (text === null || text === undefined) {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      text = await resp.text();
    }
    renderNews(JSON.parse(text));
    newsPage += 1;
    newsLoaded = true;
    showStatus(newsStatus, '');
  } catch (err) {
    showStatus(newsStatus, 'Could not load news: ' + err.message);
  } finally {
    newsLoading = false;
  }
}

function renderNews(json) {
  const arr = json.article_grid || [];
  arr.forEach((e) => {
    const t = e.preferred_tile || e.default_tile;
    if (!t) return;
    const rawImg = (t.image && (t.image.imageURL || t.image.url)) || '';
    const src = rawImg ? 'https://www.minecraft.net' + rawImg : 'Resources/artwork0.png';
    const card = document.createElement('div');
    card.className = 'news-card';
    card.innerHTML =
      '<img alt="" src="' + src + '" loading="lazy"/>' +
      '<div class="desc"><div class="n-title"></div><div class="n-text"></div></div>';
    card.querySelector('.n-title').textContent = t.title || t.text || '';
    card.querySelector('.n-text').textContent = t.sub_header || '';
    card.addEventListener('click', () => {
      window.open('https://minecraft.net' + (e.article_url || e.url || ''), '_blank');
    });
    newsGrid.appendChild(card);
  });
}

newsMore.addEventListener('click', loadNews);