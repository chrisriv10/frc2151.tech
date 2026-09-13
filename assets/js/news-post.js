import { getFirebase } from './firebase-config.js';
import { formatPublishedDate, timestampToDate } from './news.js';
import { renderMarkdown, safeImageUrl } from './markdown.js';

const root = document.querySelector('[data-article-root]');

function state(title, message, kind = 'empty') {
  root.replaceChildren();
  const wrapper = document.createElement('div');
  wrapper.className = `news-state news-state-${kind}`;
  const heading = document.createElement('h1');
  heading.textContent = title;
  const text = document.createElement('p');
  text.textContent = message;
  const link = document.createElement('a');
  link.className = 'button';
  link.href = 'news.html';
  link.textContent = 'Back to News';
  wrapper.append(heading, text, link);
  root.append(wrapper);
}

function setArticleMetadata(post, id) {
  const title = post.title || 'News Article';
  document.title = `${title} | FRC 2151 Monty Pythons`;
  const description = document.querySelector('meta[name="description"]');
  if (description && post.excerpt) description.content = post.excerpt;
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.href = `https://frc2151.tech/post.html?id=${encodeURIComponent(id)}`;
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.content = document.title;
  const ogDescription = document.querySelector('meta[property="og:description"]');
  if (ogDescription && post.excerpt) ogDescription.content = post.excerpt;
  const cover = safeImageUrl(post.coverImageUrl);
  const ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage && cover) ogImage.content = cover;
  const twitterImage = document.querySelector('meta[name="twitter:image"]');
  if (twitterImage && cover) twitterImage.content = cover;
  const schema = document.createElement('script');
  schema.type = 'application/ld+json';
  const date = timestampToDate(post.publishedAt);
  schema.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: title,
    description: post.excerpt || undefined,
    datePublished: date ? date.toISOString() : undefined,
    author: post.author ? { '@type': 'Person', name: post.author } : undefined,
    image: cover || undefined,
    mainEntityOfPage: `https://frc2151.tech/post.html?id=${encodeURIComponent(id)}`,
    publisher: { '@type': 'Organization', name: 'FRC Team 2151 — Monty Pythons', url: 'https://frc2151.tech/' }
  });
  document.head.append(schema);
}

function renderArticle(post, id) {
  setArticleMetadata(post, id);
  root.replaceChildren();
  const article = document.createElement('article');
  article.className = 'news-article';
  const heading = document.createElement('h1');
  heading.className = 'major';
  heading.textContent = post.title || 'News Article';
  article.append(heading);

  const meta = document.createElement('p');
  meta.className = 'news-article-meta';
  const date = document.createElement('time');
  const publishedDate = timestampToDate(post.publishedAt);
  if (publishedDate) date.dateTime = publishedDate.toISOString();
  date.textContent = formatPublishedDate(post.publishedAt);
  meta.append(date);
  if (post.author) {
    const author = document.createElement('span');
    author.textContent = ` · By ${post.author}`;
    meta.append(author);
  }
  article.append(meta);

  const cover = safeImageUrl(post.coverImageUrl);
  if (cover) {
    const figure = document.createElement('figure');
    figure.className = 'news-article-cover';
    const image = document.createElement('img');
    image.src = cover;
    image.alt = `${post.title || 'News'} featured image`;
    image.fetchPriority = 'high';
    figure.append(image);
    article.append(figure);
  }

  const body = document.createElement('div');
  body.className = 'news-article-body';
  renderMarkdown(body, post.bodyMarkdown || '');
  article.append(body);

  const back = document.createElement('p');
  back.className = 'news-article-back';
  const link = document.createElement('a');
  link.className = 'button';
  link.href = 'news.html';
  link.textContent = 'Back to News';
  back.append(link);
  article.append(back);
  root.append(article);
}

async function loadArticle() {
  if (!root) return;
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id || !/^[A-Za-z0-9_-]{1,150}$/.test(id)) {
    state('Article not found', 'This news article could not be found.');
    return;
  }

  try {
    const firebase = await getFirebase();
    if (!firebase) {
      state('News is being prepared', 'Published articles will appear here once the news service is configured.');
      return;
    }
    const { doc, getDoc } = firebase.firestoreSdk;
    const snapshot = await getDoc(doc(firebase.db, 'posts', id));
    if (!snapshot.exists() || snapshot.data().status !== 'published') {
      state('Article not found', 'This news article may have been unpublished or removed.');
      return;
    }
    renderArticle({ id: snapshot.id, ...snapshot.data() }, id);
  } catch (error) {
    console.error('Unable to load news article.', error);
    state('Unable to load article', 'Please refresh the page or try again later.', 'error');
  }
}

loadArticle();
