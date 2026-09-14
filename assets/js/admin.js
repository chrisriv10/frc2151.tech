import { firebaseConfigured, getFirebase } from './firebase-config.js';
import { renderMarkdown, safeImageUrl } from './markdown.js';
import { formatPublishedDate, timestampToDate } from './news.js';

const authPanel = document.querySelector('[data-auth-panel]');
const dashboard = document.querySelector('[data-dashboard]');
const editor = document.querySelector('[data-editor]');
const status = document.querySelector('[data-admin-status]');
const postList = document.querySelector('[data-post-list]');
const form = document.querySelector('[data-post-form]');
const saveStatus = document.querySelector('[data-save-status]');
const coverPreview = document.querySelector('[data-cover-preview]');
const preview = document.querySelector('[data-editor-preview]');
const uploadProgress = document.querySelector('[data-upload-progress]');
const uploadStatus = document.querySelector('[data-upload-status]');
const postSearch = document.querySelector('[data-post-search]');
const postFilter = document.querySelector('[data-post-filter]');
const membersPanel = document.querySelector('[data-members-panel]');
const memberForm = document.querySelector('[data-member-form]');
const memberList = document.querySelector('[data-member-list]');
const memberStatus = document.querySelector('[data-member-status]');

const state = { firebase: null, user: null, currentPost: null, posts: [], members: [], busy: false, search: '', filter: 'all', previewUrl: null };
const busyControls = document.querySelectorAll('[data-action="save-draft"], [data-action="publish"], [data-action="unpublish"], #post-cover, #post-body-image');

function setStatus(message, kind = '') {
  status.textContent = message;
  status.className = `admin-status ${kind ? `is-${kind}` : ''}`;
}

function setSaveStatus(message, kind = '') {
  saveStatus.textContent = message;
  saveStatus.className = `admin-save-status ${kind ? `is-${kind}` : ''}`;
}

function setMemberStatus(message, kind = '') {
  memberStatus.textContent = message;
  memberStatus.className = `admin-save-status ${kind ? `is-${kind}` : ''}`;
}

function setBusy(value) {
  state.busy = value;
  busyControls.forEach((control) => { control.disabled = value; });
  editor.setAttribute('aria-busy', String(value));
}

function withTimeout(promise, milliseconds, code) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(Object.assign(new Error(code), { code })), milliseconds);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

function authErrorMessage(error) {
  switch (error?.code) {
    case 'auth/unauthorized-domain':
      return 'This website is not authorized in Firebase. Add frc2151.tech under Authentication → Settings → Authorized domains.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in popup. Allow popups for frc2151.tech and try again.';
    case 'auth/popup-closed-by-user':
      return 'The Google sign-in window was closed before sign-in finished.';
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not enabled in Firebase Authentication.';
    case 'auth/network-request-failed':
      return 'Firebase could not reach the network. Check your connection and try again.';
    default:
      return 'Sign-in was not completed. Please try again.';
  }
}

function postErrorMessage(error) {
  switch (error?.code) {
    case 'permission-denied':
      return 'Firebase denied this change. Confirm your UID is in admins and that firestore.rules is published.';
    case 'failed-precondition':
      return 'Firebase needs its database index or setup completed. Check the Firestore console and try again.';
    case 'unavailable':
    case 'network-request-failed':
      return 'Firebase is temporarily unreachable. Check your connection and try again.';
    case 'save-timeout':
      return 'Saving took too long and was stopped. Check Firebase and try again.';
    case 'upload-timeout':
      return 'The image upload took too long and was stopped. Check Storage and try again.';
    default:
      return 'The post could not be saved. Please try again.';
  }
}

function memberErrorMessage(error) {
  if (error?.code === 'permission-denied') return 'Firebase denied this change. Publish the updated firestore.rules and confirm you are an authorized admin.';
  if (error?.code === 'unavailable' || error?.code === 'network-request-failed') return 'Firebase is temporarily unreachable. Check your connection and try again.';
  return 'The member list could not be updated. Please try again.';
}

function show(element, visible) { element.hidden = !visible; }

function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/[\s-]+/g, '-').replace(/^-|-$/g, '').slice(0, 160) || 'team-update';
}

function fileName(value) {
  return value.toLowerCase().replace(/[^a-z0-9._-]/g, '-').replace(/-+/g, '-').slice(-90) || 'image';
}

function dateLabel(value) {
  const date = timestampToDate(value);
  return date ? formatPublishedDate(date) : 'Not set';
}

function renderCoverPreview(url, file) {
  coverPreview.replaceChildren();
  const source = file ? URL.createObjectURL(file) : safeImageUrl(url);
  if (!source) return;
  const image = document.createElement('img');
  image.src = source;
  image.alt = 'Featured image preview';
  image.loading = 'lazy';
  coverPreview.append(image);
}

function renderEditorPreview() {
  if (state.previewUrl) {
    URL.revokeObjectURL(state.previewUrl);
    state.previewUrl = null;
  }
  preview.replaceChildren();
  const title = document.createElement('h1');
  title.className = 'major';
  title.textContent = form.elements.title.value.trim() || 'Your post title';
  preview.append(title);

  const meta = document.createElement('p');
  meta.className = 'news-article-meta';
  meta.textContent = 'Preview';
  const author = form.elements.author.value.trim();
  if (author) meta.append(document.createTextNode(` · By ${author}`));
  preview.append(meta);

  const coverFile = form.elements.coverImage.files[0];
  const coverUrl = coverFile ? (state.previewUrl = URL.createObjectURL(coverFile)) : safeImageUrl(state.currentPost?.coverImageUrl);
  if (coverUrl) {
    const figure = document.createElement('figure');
    figure.className = 'news-article-cover';
    const image = document.createElement('img');
    image.src = coverUrl;
    image.alt = 'Featured image preview';
    figure.append(image);
    preview.append(figure);
  }

  const excerpt = form.elements.excerpt.value.trim();
  if (excerpt) {
    const summary = document.createElement('p');
    summary.className = 'news-card-excerpt';
    summary.textContent = excerpt;
    preview.append(summary);
  }

  const body = document.createElement('div');
  body.className = 'news-article-body';
  renderMarkdown(body, form.elements.bodyMarkdown.value || 'Your article text will appear here.');
  preview.append(body);
}

function resetEditor() {
  if (state.previewUrl) {
    URL.revokeObjectURL(state.previewUrl);
    state.previewUrl = null;
  }
  form.reset();
  form.elements.postId.value = '';
  state.currentPost = null;
  document.querySelector('#editor-title').textContent = 'New Post';
  document.querySelector('[data-action="unpublish"]').hidden = true;
  coverPreview.replaceChildren();
  preview.replaceChildren();
  preview.hidden = true;
  document.querySelector('[data-action="toggle-preview"]').setAttribute('aria-pressed', 'false');
  setSaveStatus('');
}

function openEditor(post = null) {
  state.currentPost = post;
  show(dashboard, false);
  show(membersPanel, false);
  document.querySelector('[data-action="toggle-members"]').setAttribute('aria-expanded', 'false');
  show(editor, true);
  if (!post) {
    resetEditor();
    return;
  }
  document.querySelector('#editor-title').textContent = 'Edit Post';
  form.elements.postId.value = post.id;
  form.elements.title.value = post.title || '';
  form.elements.slug.value = post.slug || '';
  form.elements.author.value = post.author || '';
  form.elements.excerpt.value = post.excerpt || '';
  form.elements.bodyMarkdown.value = post.bodyMarkdown || '';
  document.querySelector('[data-action="unpublish"]').hidden = post.status !== 'published';
  renderCoverPreview(post.coverImageUrl, null);
  setSaveStatus('');
}

function closeEditor() {
  show(editor, false);
  show(dashboard, true);
  resetEditor();
}

function renderPostList() {
  postList.replaceChildren();
  const searchTerm = state.search.trim().toLowerCase();
  const posts = state.posts.filter((post) => {
    const matchesFilter = state.filter === 'all' || post.status === state.filter;
    const matchesSearch = !searchTerm || [post.title, post.excerpt, post.author].some((value) => String(value || '').toLowerCase().includes(searchTerm));
    return matchesFilter && matchesSearch;
  });
  if (!posts.length) {
    const empty = document.createElement('div');
    empty.className = 'admin-empty';
    empty.textContent = state.posts.length ? 'No posts match these filters.' : 'No posts yet. Create the first team update.';
    postList.append(empty);
    return;
  }
  posts.forEach((post) => {
    const row = document.createElement('article');
    row.className = 'admin-post-row';
    const details = document.createElement('div');
    details.className = 'admin-post-details';
    const title = document.createElement('h2');
    title.textContent = post.title || 'Untitled post';
    const meta = document.createElement('p');
    meta.className = 'admin-post-meta';
    const badge = document.createElement('span');
    badge.className = `status-badge status-${post.status === 'published' ? 'published' : 'draft'}`;
    badge.textContent = post.status === 'published' ? 'Published' : 'Draft';
    meta.append(badge, document.createTextNode(` Updated ${dateLabel(post.updatedAt)}`));
    if (post.status === 'published') meta.append(document.createTextNode(` · Published ${dateLabel(post.publishedAt)}`));
    details.append(title, meta);
    const actions = document.createElement('div');
    actions.className = 'admin-post-actions';
    const edit = document.createElement('button');
    edit.type = 'button'; edit.className = 'button small'; edit.textContent = 'Edit'; edit.dataset.editId = post.id;
    actions.append(edit);
    if (post.status === 'published') {
      const view = document.createElement('a');
      view.className = 'button small'; view.href = `post.html?id=${encodeURIComponent(post.id)}`; view.target = '_blank'; view.rel = 'noopener'; view.textContent = 'Preview';
      actions.append(view);
      const unpublish = document.createElement('button');
      unpublish.type = 'button'; unpublish.className = 'button small'; unpublish.textContent = 'Return to Draft'; unpublish.dataset.unpublishId = post.id;
      actions.append(unpublish);
    }
    const remove = document.createElement('button');
    remove.type = 'button'; remove.className = 'button small danger'; remove.textContent = 'Delete'; remove.dataset.deleteId = post.id;
    actions.append(remove);
    row.append(details, actions);
    postList.append(row);
  });
}

function renderMemberList() {
  memberList.replaceChildren();
  if (!state.members.length) {
    const empty = document.createElement('p');
    empty.className = 'admin-empty';
    empty.textContent = 'No additional admins have been added yet.';
    memberList.append(empty);
    return;
  }
  state.members.forEach((member) => {
    const row = document.createElement('div');
    row.className = 'admin-member-row';
    const details = document.createElement('div');
    details.className = 'admin-member-details';
    const label = document.createElement('strong');
    label.textContent = member.label || member.email || 'Team admin';
    const identifier = document.createElement('code');
    identifier.textContent = member.email || `UID: ${member.id}`;
    details.append(label, identifier);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'button small danger';
    remove.dataset.removeMemberId = member.id;
    remove.dataset.removeMemberKind = member.kind;
    if ((member.kind === 'uid' && member.id === state.user?.uid) || (member.kind === 'email' && member.email === state.user?.email?.toLowerCase())) {
      remove.disabled = true;
      remove.textContent = 'Current account';
      remove.title = 'You cannot remove the account currently signed in.';
    } else {
      remove.textContent = 'Remove';
    }
    row.append(details, remove);
    memberList.append(row);
  });
}

async function loadMembers() {
  if (!state.firebase || !state.user) return;
  memberList.replaceChildren();
  const loading = document.createElement('p');
  loading.className = 'admin-empty';
  loading.textContent = 'Loading members…';
  memberList.append(loading);
  try {
    const { collection, getDocs } = state.firebase.firestoreSdk;
    const [uidSnapshot, emailSnapshot] = await Promise.all([
      getDocs(collection(state.firebase.db, 'admins')),
      getDocs(collection(state.firebase.db, 'adminsByEmail'))
    ]);
    state.members = [
      ...uidSnapshot.docs.map((item) => ({ kind: 'uid', id: item.id, ...item.data() })),
      ...emailSnapshot.docs.map((item) => ({ kind: 'email', id: item.id, ...item.data() }))
    ].sort((a, b) => String(a.label || a.email || a.id).localeCompare(String(b.label || b.email || b.id)));
  } catch (error) {
    console.error('Unable to load admin members.', error);
    memberList.replaceChildren();
    const message = document.createElement('p');
    message.className = 'admin-error';
    message.textContent = memberErrorMessage(error);
    memberList.append(message);
    return;
  }
  renderMemberList();
}

async function addMember(event) {
  event.preventDefault();
  if (state.busy || !state.firebase || !state.user) return;
  if (!memberForm.reportValidity()) return;
  const values = Object.fromEntries(new FormData(memberForm));
  const email = values.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setMemberStatus('Enter a valid Google email address.', 'error');
    return;
  }
  state.busy = true;
  memberForm.querySelector('[data-action="add-member"]').disabled = true;
  setMemberStatus('Adding member…');
  try {
    const { doc, serverTimestamp, setDoc } = state.firebase.firestoreSdk;
    await withTimeout(setDoc(doc(state.firebase.db, 'adminsByEmail', email), {
      role: 'admin',
      email,
      label: values.label.trim() || null,
      addedBy: state.user.uid,
      addedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true }), 30000, 'save-timeout');
    memberForm.reset();
    setMemberStatus('Member added. They can sign in now.', 'success');
    await loadMembers();
  } catch (error) {
    console.error('Unable to add admin member.', error);
    setMemberStatus(memberErrorMessage(error), 'error');
  } finally {
    state.busy = false;
    memberForm.querySelector('[data-action="add-member"]').disabled = false;
  }
}

async function removeMember(kind, id) {
  const ownMember = (kind === 'uid' && id === state.user?.uid) || (kind === 'email' && id === state.user?.email?.toLowerCase());
  if (state.busy || ownMember) return;
  const member = state.members.find((item) => item.kind === kind && item.id === id);
  const name = member?.label || member?.email || id;
  if (!window.confirm(`Remove ${name} from News Admin? They will lose access immediately.`)) return;
  state.busy = true;
  setMemberStatus('Removing member…');
  try {
    const { deleteDoc, doc } = state.firebase.firestoreSdk;
    await withTimeout(deleteDoc(doc(state.firebase.db, kind === 'email' ? 'adminsByEmail' : 'admins', id)), 30000, 'save-timeout');
    setMemberStatus('Member removed.', 'success');
    await loadMembers();
  } catch (error) {
    console.error('Unable to remove admin member.', error);
    setMemberStatus(memberErrorMessage(error), 'error');
  } finally {
    state.busy = false;
  }
}

async function loadPosts() {
  const { collection, getDocs, orderBy, query } = state.firebase.firestoreSdk;
  try {
    const snapshot = await getDocs(query(collection(state.firebase.db, 'posts'), orderBy('updatedAt', 'desc')));
    state.posts = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    renderPostList();
  } catch (error) {
    console.error('Unable to load admin posts.', error);
    postList.replaceChildren();
    const message = document.createElement('p');
    message.className = 'admin-error';
    message.textContent = 'Posts could not be loaded. Check your Firebase connection and indexes.';
    postList.append(message);
  }
}

function uploadFile(file, path) {
  return new Promise((resolve, reject) => {
    const { ref, uploadBytesResumable, getDownloadURL } = state.firebase.storageSdk;
    const task = uploadBytesResumable(ref(state.firebase.storage, path), file, { contentType: file.type, cacheControl: 'public,max-age=31536000' });
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      callback(value);
    };
    const timeoutId = window.setTimeout(() => {
      task.cancel();
      finish(reject, Object.assign(new Error('upload-timeout'), { code: 'upload-timeout' }));
    }, 120000);
    uploadProgress.hidden = false;
    uploadProgress.value = 0;
    task.on('state_changed', (snapshot) => {
      uploadProgress.value = Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100);
      uploadStatus.textContent = `Uploading image… ${uploadProgress.value}%`;
    }, (error) => {
      finish(reject, error);
    }, async () => {
      try { finish(resolve, await getDownloadURL(task.snapshot.ref)); } catch (error) { finish(reject, error); }
    });
  }).finally(() => {
    uploadProgress.hidden = true;
    uploadProgress.value = 0;
  });
}

function validImage(file) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!file) return 'Choose an image first.';
  if (!allowed.includes(file.type)) return 'Use a JPG, PNG, WebP, or GIF image.';
  if (file.size > 10 * 1024 * 1024) return 'Images must be 10 MB or smaller.';
  return '';
}

async function savePost(desiredStatus) {
  if (state.busy) return;
  if (!form.reportValidity()) return;
  if (!state.firebase || !state.user) { setSaveStatus('You must be signed in to save a post.', 'error'); return; }
  const values = Object.fromEntries(new FormData(form));
  const title = values.title.trim();
  const bodyMarkdown = values.bodyMarkdown.trim();
  if (!title || !bodyMarkdown) { setSaveStatus('Add a title and article body before saving.', 'error'); return; }
  const { collection, doc, serverTimestamp, setDoc } = state.firebase.firestoreSdk;
  const postId = values.postId || doc(collection(state.firebase.db, 'posts')).id;
  const previous = state.currentPost || {};
  const coverFile = form.elements.coverImage.files[0];
  let coverImageUrl = previous.coverImageUrl || null;
  let coverImagePath = previous.coverImagePath || null;
  const imagePaths = Array.isArray(previous.imagePaths) ? [...previous.imagePaths] : [];
  setBusy(true);
  try {
    setSaveStatus(desiredStatus === 'published' ? 'Publishing…' : 'Saving draft…');
    if (coverFile) {
      const imageError = validImage(coverFile);
      if (imageError) { setSaveStatus(imageError, 'error'); return; }
      coverImagePath = `news/${postId}/cover-${Date.now()}-${fileName(coverFile.name)}`;
      coverImageUrl = await uploadFile(coverFile, coverImagePath);
      if (!imagePaths.includes(coverImagePath)) imagePaths.push(coverImagePath);
    }
    const payload = {
      title, slug: (values.slug.trim() || slugify(title)), author: values.author.trim(), excerpt: values.excerpt.trim(), bodyMarkdown,
      coverImageUrl, coverImagePath, imagePaths, status: desiredStatus,
      updatedAt: serverTimestamp(), updatedBy: state.user.uid,
      createdBy: previous.createdBy || state.user.uid,
      publishedAt: desiredStatus === 'published' ? (previous.publishedAt || serverTimestamp()) : null
    };
    if (!previous.id) payload.createdAt = serverTimestamp();
    await withTimeout(setDoc(doc(state.firebase.db, 'posts', postId), payload, { merge: true }), 30000, 'save-timeout');
    state.currentPost = { ...previous, ...payload, id: postId, publishedAt: desiredStatus === 'published' ? (previous.publishedAt || new Date()) : null };
    form.elements.postId.value = postId;
    document.querySelector('[data-action="unpublish"]').hidden = desiredStatus !== 'published';
    setSaveStatus(desiredStatus === 'published' ? 'Published successfully.' : 'Draft saved.', 'success');
    await loadPosts();
  } catch (error) {
    console.error('Unable to save news post.', error);
    setSaveStatus(postErrorMessage(error), 'error');
  } finally {
    setBusy(false);
  }
}

async function deletePost(post) {
  if (!window.confirm(`Delete “${post.title || 'Untitled post'}”? This cannot be undone.`)) return;
  try {
    const { deleteDoc, doc } = state.firebase.firestoreSdk;
    await deleteDoc(doc(state.firebase.db, 'posts', post.id));
    const paths = Array.isArray(post.imagePaths) ? post.imagePaths : [post.coverImagePath];
    for (const path of paths.filter(Boolean)) {
      try { await state.firebase.storageSdk.deleteObject(state.firebase.storageSdk.ref(state.firebase.storage, path)); } catch (error) { console.warn('Image cleanup skipped.', error); }
    }
    setStatus('Post deleted.', 'success');
    await loadPosts();
  } catch (error) {
    console.error('Unable to delete post.', error);
    setStatus('The post could not be deleted.', 'error');
  }
}

async function returnToDraft(post) {
  if (state.busy) return;
  if (!window.confirm(`Return “${post.title || 'Untitled post'}” to drafts? It will no longer be visible publicly.`)) return;
  state.busy = true;
  postList.setAttribute('aria-busy', 'true');
  setStatus('Returning post to drafts…');
  try {
    const { doc, serverTimestamp, updateDoc } = state.firebase.firestoreSdk;
    await withTimeout(updateDoc(doc(state.firebase.db, 'posts', post.id), {
      status: 'draft', publishedAt: null, updatedAt: serverTimestamp(), updatedBy: state.user.uid
    }), 30000, 'save-timeout');
    setStatus('Post returned to drafts.', 'success');
    await loadPosts();
  } catch (error) {
    console.error('Unable to unpublish news post.', error);
    setStatus(postErrorMessage(error), 'error');
  } finally {
    state.busy = false;
    postList.removeAttribute('aria-busy');
  }
}

function insertMarkdown(value) {
  const textarea = form.elements.bodyMarkdown;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.slice(start, end) || 'text';
  const replacement = value.replace(/bold|italic|Heading|List item|Quote|text/g, selected);
  textarea.setRangeText(replacement, start, end, 'end');
  textarea.focus();
  if (!preview.hidden) renderEditorPreview();
}

async function initialize() {
  if (!firebaseConfigured) {
    setStatus('News Admin is not configured yet. Add the Firebase web config to enable admin access.', 'warning');
    document.querySelector('[data-action="google-login"]').disabled = true;
    return;
  }
  try {
    state.firebase = await getFirebase();
    const { onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider } = state.firebase.authSdk;
    document.querySelector('[data-action="google-login"]').addEventListener('click', async () => {
      try {
        setStatus('Opening secure sign-in…');
        await signInWithPopup(state.firebase.auth, new GoogleAuthProvider());
      } catch (error) {
        console.error('Admin sign-in failed.', error);
        if (!state.user) document.querySelector('[data-action="logout"]').hidden = true;
        setStatus(authErrorMessage(error), 'error');
      }
    });
    document.querySelector('[data-action="logout"]').addEventListener('click', () => signOut(state.firebase.auth));
    onAuthStateChanged(state.firebase.auth, async (user) => {
      state.user = user;
      if (!user) {
        show(authPanel, true); show(dashboard, false); show(editor, false); show(membersPanel, false);
        document.querySelector('[data-action="toggle-members"]').setAttribute('aria-expanded', 'false');
        document.querySelector('[data-action="logout"]').hidden = true;
        setStatus('Sign in to manage team news.');
        return;
      }
      try {
        const { doc, getDoc } = state.firebase.firestoreSdk;
        const adminDoc = await getDoc(doc(state.firebase.db, 'admins', user.uid));
        const emailKey = user.email?.trim().toLowerCase();
        const emailAdminDoc = emailKey ? await getDoc(doc(state.firebase.db, 'adminsByEmail', emailKey)) : null;
        if (!adminDoc.exists() && !emailAdminDoc?.exists()) {
          setStatus('This account is not authorized for News Admin access.', 'error');
          await signOut(state.firebase.auth);
          return;
        }
        show(authPanel, false); show(dashboard, true); show(editor, false); show(membersPanel, false);
        document.querySelector('[data-action="toggle-members"]').setAttribute('aria-expanded', 'false');
        document.querySelector('[data-action="logout"]').hidden = false;
        setStatus(`Signed in as ${user.email || user.displayName || 'authorized admin'}.`, 'success');
        await loadPosts();
      } catch (error) {
        console.error('Admin authorization check failed.', error);
        setStatus('Authorization could not be verified. Please try again.', 'error');
      }
    });
  } catch (error) {
    console.error('Firebase failed to initialize.', error);
    setStatus('The news service is temporarily unavailable.', 'error');
  }
}

document.querySelector('[data-action="new-post"]').addEventListener('click', () => openEditor());
document.querySelector('[data-action="toggle-members"]').addEventListener('click', async (event) => {
  const isHidden = membersPanel.hidden;
  show(membersPanel, isHidden);
  event.currentTarget.setAttribute('aria-expanded', String(isHidden));
  if (isHidden) await loadMembers();
});
document.querySelector('[data-action="close-members"]').addEventListener('click', () => {
  show(membersPanel, false);
  document.querySelector('[data-action="toggle-members"]').setAttribute('aria-expanded', 'false');
});
memberForm.addEventListener('submit', addMember);
memberList.addEventListener('click', (event) => {
  const id = event.target.dataset.removeMemberId;
  const kind = event.target.dataset.removeMemberKind;
  if (id && kind) removeMember(kind, id);
});
document.querySelector('[data-action="close-editor"]').addEventListener('click', closeEditor);
document.querySelector('[data-action="save-draft"]').addEventListener('click', () => savePost('draft'));
document.querySelector('[data-action="publish"]').addEventListener('click', () => savePost('published'));
document.querySelector('[data-action="unpublish"]').addEventListener('click', () => savePost('draft'));
document.querySelector('#post-title').addEventListener('input', (event) => {
  if (!form.elements.postId.value || !form.elements.slug.value) form.elements.slug.value = slugify(event.target.value);
});
document.querySelector('[data-action="toggle-preview"]').addEventListener('click', (event) => {
  const isHidden = preview.hidden;
  if (isHidden) renderEditorPreview();
  preview.hidden = !isHidden;
  event.currentTarget.setAttribute('aria-pressed', String(isHidden));
});
document.querySelectorAll('[data-markdown]').forEach((button) => button.addEventListener('click', () => insertMarkdown(button.dataset.markdown)));
form.addEventListener('input', () => { if (!preview.hidden) renderEditorPreview(); });
postSearch.addEventListener('input', (event) => { state.search = event.target.value; renderPostList(); });
postFilter.addEventListener('change', (event) => { state.filter = event.target.value; renderPostList(); });
form.elements.coverImage.addEventListener('change', (event) => {
  const file = event.target.files[0];
  const error = file && validImage(file);
  if (error) { setSaveStatus(error, 'error'); event.target.value = ''; coverPreview.replaceChildren(); return; }
  renderCoverPreview('', file);
  if (!preview.hidden) renderEditorPreview();
});
document.querySelector('#post-body-image').addEventListener('change', async (event) => {
  if (state.busy) return;
  const file = event.target.files[0];
  event.target.value = '';
  const error = validImage(file);
  if (error) { uploadStatus.textContent = error; return; }
  const postId = form.elements.postId.value;
  if (!postId) { uploadStatus.textContent = 'Save a draft first, then add body images.'; return; }
  setBusy(true);
  try {
    const path = `news/${postId}/body-${Date.now()}-${fileName(file.name)}`;
    const url = await uploadFile(file, path);
    if (!state.currentPost.imagePaths) state.currentPost.imagePaths = [];
    state.currentPost.imagePaths.push(path);
    form.elements.bodyMarkdown.value += `${form.elements.bodyMarkdown.value.trim() ? '\n\n' : ''}![${file.name.replace(/\.[^.]+$/, '')}](${url})`;
    if (!preview.hidden) renderEditorPreview();
    uploadStatus.textContent = 'Image uploaded and added to the article. Save the post to keep the change.';
  } catch (error) {
    console.error('Body image upload failed.', error);
    uploadStatus.textContent = `${postErrorMessage(error)} Image upload failed.`;
  } finally {
    setBusy(false);
  }
});
postList.addEventListener('click', (event) => {
  const editId = event.target.dataset.editId;
  const deleteId = event.target.dataset.deleteId;
  const unpublishId = event.target.dataset.unpublishId;
  if (editId) openEditor(state.posts.find((post) => post.id === editId));
  if (deleteId) {
    const post = state.posts.find((item) => item.id === deleteId);
    if (post) deletePost(post);
  }
  if (unpublishId) {
    const post = state.posts.find((item) => item.id === unpublishId);
    if (post) returnToDraft(post);
  }
});

initialize();
