# Aryan Sharma · Portfolio

Static portfolio site: plain HTML, CSS and JavaScript, no build step.

- `index.html`, `styles.css`, `app.js` – page, styles, live GitHub and LeetCode data, touch and cursor motion
- `preview.js` – 5-second canvas previews that play when a project card is hovered or tapped
- `three-scenes.js` – Three.js scenes: hero neural network, LeetCode submission skyline, 3D badge vault
- `data/` – LeetCode snapshot used when the free live API is rate-limited
- `vercel.json` – tells Vercel to serve the folder as-is

Run locally: `python -m http.server 5173`, then open http://127.0.0.1:5173

Refresh the LeetCode snapshot by re-running the GraphQL queries that produced `data/leetcode.json` and `data/badges.json`.
