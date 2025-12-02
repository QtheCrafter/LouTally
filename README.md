# Lou Groza Award Vote Tracker

GitHub Pages static site that polls the Lou Groza Award finalists page and charts the publicly visible vote totals for the three 2025 finalists.

## Features

- Calls the Lou Groza TotalPoll AJAX endpoint every 60 seconds to simulate pressing the “Results” button.
- Parses the `totalpoll-question-choices-item-votes-text` elements and plots the vote percentages using Chart.js.
- Displays a compact table and bar chart snapshot alongside timestamps and status messaging.
- Includes a manual refresh button for on-demand updates.

## Getting Started

1. **Clone and install dependencies**  
   This project is completely static, so there are no build steps or dependencies. Serve the repository with any static file server for local testing. On Windows 11 PowerShell you can run:
   ```powershell
   cd C:\Users\quint\source\repos\LouTally
   python -m http.server 8000
   ```
   Then open <http://localhost:8000/> in your browser.

2. **GitHub Pages**  
   - Create a repository on GitHub and push this code.  
   - Under the repository settings, enable GitHub Pages (Deploy from branch, `main`, `/root`).  
   - Your live site will be available at `https://<your-username>.github.io/<repo-name>/`.

## CORS Proxy

Browsers block cross-origin requests to third-party sites. The script uses the public proxy at `https://corsproxy.io/`. Replace the `PROXY_PREFIX` constant in `script.js` if you prefer a different or self-hosted proxy.

## Customization

- Update the `FINALIST_LABELS` array and table rows in `index.html` if the finalists change.
- Adjust the `REFRESH_INTERVAL_MS` constant in `script.js` to fetch more or less frequently.
- Tweak colors in `styles.css` to match your preferred theme.

## Limitations

- If the upstream website restructures its markup, hides results server-side, or rate-limits proxy access, the script will show an error message.
- The solution does not submit any voting actions; it only reads publicly available totals.
- The totals returned by the poll endpoint are percentages, not raw vote counts.

