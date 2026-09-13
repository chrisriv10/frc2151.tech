# Monty Pythons - FRC Team 2151

Official website for **FRC Team 2151: Monty Pythons** from Proviso Mathematics and Science Academy in Forest Park, IL.

Canonical website: [https://frc2151.tech/](https://frc2151.tech/)

## About

FIRST Robotics Competition team dedicated to engineering, programming, leadership, and inspiring the next generation of innovators.

## Pages

- **Home** (`index.html`) - Hero, About Us and robot spotlights, departments, Social Media, latest News, and contact form
- **About** (`about.html`) - Team history, values, and achievements
- **Our Robot** (`monty.html`) - Monty's details for the 2026 REBUILT season and upcoming SHOUT Robotics Competition
- **Sponsors** (`sponsors.html`) - Sponsor recognition and partnership info
- **News** (`news.html`) - Published team updates and full article views via `post.html?id=...`

The public pages share responsive mobile navigation, branded gold accents, accessible focus states, and layouts tuned for common phone widths. Sponsor sections include contribution, funding, and benefits cards with team photography. The About page includes a responsive team-photo carousel, and the Home page includes a live Behold Instagram feed for [@montypythons2151](https://www.instagram.com/montypythons2151/). News is powered by the optional Firebase CMS described below.

## Contact

- **Email:** pmsarobotics@gmail.com
- **Phone:** (708) 338-4100
- **Address:** 8601 Roosevelt Road, Forest Park, IL 60130
- **GitHub:** [Team-2151-Progrraming-Room](https://github.com/Team-2151-Progrraming-Room)
- **Twitter/X:** [@frcteam2151](https://x.com/frcteam2151)
- **Instagram:** [@montypythons2151](https://www.instagram.com/montypythons2151/)
- **YouTube:** [PMSA Robotics](https://www.youtube.com/@PMSARobotics)

## Stack

- HTML/CSS/JS
- Hosted on GitHub Pages with the custom domain [frc2151.tech](https://frc2151.tech)

## News CMS setup

The public News page and homepage preview are backed by the `frc-2151` Firebase project configured in `assets/js/firebase-config.js`. The static site remains deployable on GitHub Pages, and the Firebase web configuration is safe to expose in browser code; never commit service-account keys, private API keys, or other server credentials.

1. Create or select a Firebase project at [Firebase Console](https://console.firebase.google.com/).
2. Register a Web app and copy its configuration into `assets/js/firebase-config.js` if you are creating a different project. The repository is currently configured for the `frc-2151` project.
3. Enable Google Authentication, Cloud Firestore, and Firebase Storage. Add `frc2151.tech` (and your local development host) under Authentication → Settings → Authorized domains.
4. Deploy `firestore.rules`, `storage.rules`, and `firestore.indexes.json` with the Firebase CLI, or copy the rules into the Firebase console. The published-post query uses the `posts` composite index declared in `firestore.indexes.json`.
5. Sign in once at `admin.html`, copy the signed-in account’s Firebase UID, and manually create an `admins/{uid}` document in Firestore. The document may contain any non-sensitive notes; its existence is the authorization allowlist. Admin documents cannot be created from the website.
6. Return to `admin.html` to create drafts, upload images under `news/<post-id>/`, publish, edit, unpublish, or delete posts. Public pages query only `status == "published"`; drafts are blocked by Firestore Rules as well as by the UI.
7. For local testing, serve the repository from an HTTP server (for example `python -m http.server 8000`) and add `localhost` to Firebase Authorized domains. Open `http://localhost:8000/` and test the public News page, `post.html?id=...`, and the admin workflow.

The CMS uses Firebase Authentication for sign-in, Firestore for post metadata and Markdown, and Firebase Storage for images. Article Markdown is rendered through DOM APIs with protocol-checked links and images; post content is never inserted as unsanitized HTML. If Firebase is not configured or temporarily unavailable, public pages show friendly empty/error states and the rest of the site continues to work.
