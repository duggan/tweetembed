export const tweetCSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }

.tweet-card {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  width: 100%;
  max-width: 600px;
  border-radius: 16px;
  padding: 16px;
  line-height: 1.5;
  text-decoration: none;

  --bg: #ffffff;
  --text: #0f1419;
  --meta: #536471;
  --border: #e1e8ed;
  --link: #1d9bf0;

  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
}

.tweet-card.dark {
  --bg: #15202b;
  --text: #e7e9ea;
  --meta: #8b98a5;
  --border: #38444d;
}

.tweet-card a { color: var(--link); }
.tweet-meta { color: var(--meta); }
.reply-indicator { color: var(--meta); }
.tweet-stats { color: var(--meta); }
.tweet-stats span { color: var(--text); }

.tweet-header {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  margin-right: 12px;
  flex-shrink: 0;
}

.tweet-author {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.display-name {
  font-weight: 700;
  font-size: 15px;
}

.username {
  font-size: 15px;
}

.tweet-logo {
  margin-left: auto;
  flex-shrink: 0;
}

.tweet-logo svg {
  width: 24px;
  height: 24px;
}

.reply-indicator {
  font-size: 13px;
  margin-bottom: 4px;
}

.tweet-text {
  font-size: 15px;
  margin-bottom: 12px;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.tweet-text a {
  text-decoration: none;
}

.tweet-text a:hover {
  text-decoration: underline;
}

.tweet-media {
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 12px;
}

.tweet-media img {
  width: 100%;
  display: block;
}

.tweet-media video {
  width: 100%;
  display: block;
}

.media-grid {
  display: grid;
  gap: 2px;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 12px;
}

.media-grid.count-2 { grid-template-columns: 1fr 1fr; }
.media-grid.count-3 { grid-template-columns: 1fr 1fr; }
.media-grid.count-4 { grid-template-columns: 1fr 1fr; }

.media-grid img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.media-grid.count-3 > *:first-child { grid-row: 1 / 3; }

.tweet-timestamp {
  font-size: 15px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.tweet-timestamp a {
  text-decoration: none;
}

.tweet-timestamp a:hover {
  text-decoration: underline;
}

.tweet-stats {
  display: flex;
  gap: 20px;
  font-size: 14px;
  padding-top: 12px;
  margin-top: 12px;
  border-top: 1px solid var(--border);
}

.tweet-stats span {
  font-weight: 700;
}
`;
