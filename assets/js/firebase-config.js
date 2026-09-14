/*
 * Firebase setup for the optional News Admin page.
 *
 * These values are public web-app configuration, not credentials. Security is
 * enforced by Firestore and Storage Rules, never by this file.
 */
const FIREBASE_SDK_VERSION = '11.0.2';

export const firebaseConfig = Object.freeze({
  apiKey: 'AIzaSyCPcFbW_71hgnyHrdJUwDD_CaDxfOEYdNI',
  authDomain: 'frc-2151.firebaseapp.com',
  projectId: 'frc-2151',
  storageBucket: 'frc-2151.firebasestorage.app',
  messagingSenderId: '632295957569',
  appId: '1:632295957569:web:95f18cf8410805989912c0',
  measurementId: 'G-VB35BQH0YV'
});

export const firebaseConfigured = Object.values(firebaseConfig).every(
  (value) => value && !value.startsWith('REPLACE_WITH_')
);

let firebasePromise;

/** Load Firebase only when configured, keeping the public site usable before setup. */
export function getFirebase() {
  if (!firebaseConfigured) return Promise.resolve(null);
  if (firebasePromise) return firebasePromise;

  const base = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
  firebasePromise = Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
    import(`${base}/firebase-firestore.js`),
    import(`${base}/firebase-storage.js`)
  ]).then(([appSdk, authSdk, firestoreSdk, storageSdk]) => {
    const app = appSdk.initializeApp(firebaseConfig);
    return {
      app,
      auth: authSdk.getAuth(app),
      db: firestoreSdk.getFirestore(app),
      storage: storageSdk.getStorage(app),
      authSdk,
      firestoreSdk,
      storageSdk
    };
  });

  return firebasePromise;
}
