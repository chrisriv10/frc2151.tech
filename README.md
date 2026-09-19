<p align="center">
  <img src="assets/css/images/2151Logo.png" alt="FRC Team 2151 — Monty Pythons" width="180" />
</p>

<p align="center">
  <strong>FRC Team 2151 — Monty Pythons</strong><br/>
  <em>Official team website for Proviso Mathematics and Science Academy · Forest Park, IL.</em>
</p>

<p align="center">
  <a href="https://frc2151.tech/"><img src="https://img.shields.io/website?url=https%3A%2F%2Ffrc2151.tech&style=flat-square&label=frc2151.tech" alt="Live Site" /></a>
  <a href="./LICENSE.txt"><img src="https://img.shields.io/badge/License-CC_BY_3.0-blue?style=flat-square" alt="CC BY 3.0" /></a>
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white" alt="HTML5" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black" alt="Firebase" />
</p>

---

**Live:** https://frc2151.tech/

## Pages

Home (`index.html`) · About (`about.html`) · Robot (`monty.html`) · Sponsors (`sponsors.html`) · News (`news.html`)

## Stack

HTML5, CSS3, vanilla JS · GitHub Pages (`CNAME` → `frc2151.tech`) · Firebase Auth / Firestore / Storage for News

## News Admin

Sign in at `admin.html` with Google. Posts live in Firestore `posts` (`status == "published"` is public), images in Storage `news/<post-id>/`. Rules in `firestore.rules`, `storage.rules`, `firestore.indexes.json`. Local test: `python -m http.server 8000` + allow `localhost` in Firebase Auth domains.

## Links

[Instagram](https://www.instagram.com/montypythons2151/) · [YouTube](https://www.youtube.com/@PMSARobotics) · [X](https://x.com/frcteam2151) · [GitHub](https://github.com/Team-2151-Progrraming-Room)

## License

CC BY 3.0 — see [LICENSE.txt](LICENSE.txt).
