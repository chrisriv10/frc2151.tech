let staticPostsPromise;

/** Load posts that are published with the static site, independently of Firebase. */
export function getStaticPosts() {
  if (!staticPostsPromise) {
    staticPostsPromise = fetch('assets/data/news-posts.json', { cache: 'no-cache' })
      .then((response) => {
        if (!response.ok) throw new Error(`Static news request failed: ${response.status}`);
        return response.json();
      })
      .then((posts) => Array.isArray(posts) ? posts : [])
      .catch((error) => {
        console.warn('Unable to load static news posts.', error);
        return [];
      });
  }
  return staticPostsPromise;
}

export async function getStaticPostById(id) {
  const posts = await getStaticPosts();
  return posts.find((post) => post.id === id) || null;
}
