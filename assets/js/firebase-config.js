/*
 * Firebase setup for the optional News CMS.
 *
 * The values below are public web-app configuration, not credentials. Replace
 * the placeholders with the configuration from the Firebase console. Security
 * is enforced by Firestore and Storage Rules, never by this file.
 */
const FIREBASE_SDK_VERSION = '11.0.2';

export const firebaseConfig = Object.freeze({
  apiKey: 'REPLACE_WITH_FIREBASE_API_KEY',
  authDomain: 'REPLACE_WITH_FIREBASE_AUTH_DOMAIN',
  projectId: 'REPLACE_WITH_FIREBASE_PROJECT_ID',
  storageBucket: 'REPLACE_WITH_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'REPLACE_WITH_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'REPLACE_WITH_FIREBASE_APP_ID'
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
