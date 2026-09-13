import { getFirebase } from './firebase-config.js';
import { safeImageUrl } from './markdown.js';

const emptyMessage = 'Team news will appear here as updates are published.';

export function timestampToDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatPublishedDate(value) {
  const date = timestampToDate(value);
  if (!date) return 'Date to be announced';
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(date);
}

function postFromSnapshot(snapshot) {
  return { id: snapshot.id, ...snapshot.data() };
}

function createState(message, kind = 'empty') {
  const wrapper = document.createElement('div');
  wrapper.className = `news-state news-state-${kind}`;
  const heading = document.createElement('h3');
  heading.textContent = kind === 'error' ? 'News is temporarily unavailable' : kind === 'loading' ? 'Loading news' : 'No published news yet';
  const text = document.createElement('p');
  text.textContent = message;
  wrapper.append(heading, text);
  return wrapper;
}

function createDate(post) {
  const time = document.createElement('time');
  const date = timestampToDate(post.publishedAt);
  if (date) time.dateTime = date.toISOString();
  time.textContent = formatPublishedDate(post.publishedAt);
  return time;
}

export function createPostCard(post, headingTag = 'h3') {
  const card = document.createElement('article');
  card.className = 'news-card';

  const coverImageUrl = safeImageUrl(post.coverImageUrl);
  if (coverImageUrl) {
    const image = document.createElement('img');
    image.className = 'news-card-image';
    image.src = coverImageUrl;
    image.alt = `${post.title || 'News'} featured image`;
    image.loading = 'lazy';
    image.referrerPolicy = 'no-referrer';
    card.append(image);
  }

  const content = document.createElement('div');
  content.className = 'news-card-content';
  const heading = document.createElement(headingTag);
  heading.textContent = post.title || 'Untitled news post';
  content.append(heading);

  const meta = document.createElement('p');
  meta.className = 'news-card-meta';
  meta.append(createDate(post));
  if (post.author) {
    const author = document.createElement('span');
    author.textContent = ` · By ${post.author}`;
    meta.append(author);
  }
  content.append(meta);

  if (post.excerpt) {
    const excerpt = document.createElement('p');
    excerpt.className = 'news-card-excerpt';
    excerpt.textContent = post.excerpt;
    content.append(excerpt);
  }

  const actions = document.createElement('ul');
  actions.className = 'actions';
  const actionItem = document.createElement('li');
  const link = document.createElement('a');
  link.className = 'button';
  link.href = `post.html?id=${encodeURIComponent(post.id)}`;
  link.textContent = 'Read More';
  actionItem.append(link);
  actions.append(actionItem);
  content.append(actions);
  card.append(content);
  return card;
}

async function getPublishedPosts(limitCount) {
  const firebase = await getFirebase();
  if (!firebase) return [];
  const { collection, getDocs, limit, orderBy, query, where } = firebase.firestoreSdk;
  const constraints = [where('status', '==', 'published'), orderBy('publishedAt', 'desc')];
  if (limitCount) constraints.push(limit(limitCount));
  const snapshot = await getDocs(query(collection(firebase.db, 'posts'), ...constraints));
  return snapshot.docs.map(postFromSnapshot);
}

export async function loadLatestNews() {
  const target = document.querySelector('[data-news-latest]');
  if (!target) return;
  target.replaceChildren(createState('Loading the latest team update…', 'loading'));
  try {
    const posts = await getPublishedPosts(1);
    target.replaceChildren(posts.length ? createPostCard(posts[0], 'h3') : createState(emptyMessage));
  } catch (error) {
    console.error('Unable to load the latest news post.', error);
    target.replaceChildren(createState('Please check back soon for the latest team update.', 'error'));
  }
}

export async function loadNewsList() {
  const target = document.querySelector('[data-news-list]');
  if (!target) return;
  target.replaceChildren(createState('Loading published news…', 'loading'));
  try {
    const posts = await getPublishedPosts();
    if (!posts.length) {
      target.replaceChildren(createState('There are no published posts yet. Check back soon!'));
      return;
    }
    const fragment = document.createDocumentFragment();
    posts.forEach((post) => fragment.append(createPostCard(post, 'h2')));
    target.replaceChildren(fragment);
  } catch (error) {
    console.error('Unable to load published news.', error);
    target.replaceChildren(createState('Please refresh the page or check back soon.', 'error'));
  }
}

if (document.querySelector('[data-news-latest]')) loadLatestNews();
if (document.querySelector('[data-news-list]')) loadNewsList();
