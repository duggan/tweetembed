import type { Archive, Tweet } from "../archive/types.js";
import { linkifyText } from "./linkify.js";
import {
  embedTweetMedia, embedTweetMediaRaw, embedAvatar, embedAvatarRaw,
  revokeMediaURLs, type RenderMedia, type RawMedia,
} from "./media.js";
import { getLogoSVG } from "./logo.js";
import { tweetCSS } from "./styles.js";

let styleInjected = false;

/** Inject the tweet card CSS into the document (once). */
export function injectStyles(): void {
  if (styleInjected) return;
  const style = document.createElement("style");
  style.textContent = tweetCSS;
  document.head.appendChild(style);
  styleInjected = true;
}

interface RenderResult {
  element: HTMLElement;
  cleanup: () => void;
}

/** Render a tweet card into a DOM element. Returns the element and a cleanup function. */
export async function renderTweet(
  archive: Archive,
  tweet: Tweet,
  theme: string,
  logo: string,
): Promise<RenderResult> {
  const media = await embedTweetMedia(archive.files, tweet);
  const avatarURL = await embedAvatar(archive.files, archive.profile.avatarMediaUrl);

  const card = document.createElement("div");
  card.className = "tweet-card" + (theme === "dark" ? " dark" : "");

  // Header
  const header = document.createElement("div");
  header.className = "tweet-header";

  if (avatarURL) {
    const avatar = document.createElement("img");
    avatar.className = "avatar";
    avatar.src = avatarURL;
    avatar.alt = "";
    header.appendChild(avatar);
  }

  const author = document.createElement("div");
  author.className = "tweet-author";
  const displayName = document.createElement("span");
  displayName.className = "display-name";
  displayName.textContent = archive.account.accountDisplayName;
  const username = document.createElement("span");
  username.className = "username tweet-meta";
  username.textContent = `@${archive.account.username}`;
  author.appendChild(displayName);
  author.appendChild(username);
  header.appendChild(author);

  const logoDiv = document.createElement("div");
  logoDiv.className = "tweet-logo";
  logoDiv.innerHTML = getLogoSVG(logo, theme);
  header.appendChild(logoDiv);

  card.appendChild(header);

  // Reply indicator
  if (tweet.in_reply_to_screen_name) {
    const reply = document.createElement("div");
    reply.className = "reply-indicator";
    reply.innerHTML = `Replying to <a href="https://twitter.com/${escapeAttr(tweet.in_reply_to_screen_name)}">@${escapeHTML(tweet.in_reply_to_screen_name)}</a>`;
    card.appendChild(reply);
  }

  // Tweet text
  const textDiv = document.createElement("div");
  textDiv.className = "tweet-text";
  textDiv.innerHTML = linkifyText(tweet);
  card.appendChild(textDiv);

  // Media
  if (media.length === 1) {
    const mediaDiv = document.createElement("div");
    mediaDiv.className = "tweet-media";
    mediaDiv.appendChild(createMediaElement(media[0]));
    card.appendChild(mediaDiv);
  } else if (media.length > 1) {
    const grid = document.createElement("div");
    grid.className = `media-grid count-${media.length}`;
    for (const m of media) {
      grid.appendChild(createMediaElement(m));
    }
    card.appendChild(grid);
  }

  // Timestamp
  const tweetURL = `https://twitter.com/${archive.account.username}/status/${tweet.id_str}`;
  const timestamp = document.createElement("div");
  timestamp.className = "tweet-timestamp tweet-meta";
  const tsLink = document.createElement("a");
  tsLink.href = tweetURL;
  tsLink.textContent = formatTimestamp(tweet.created_at);
  timestamp.appendChild(tsLink);
  card.appendChild(timestamp);

  // Stats
  if (tweet.retweet_count !== "0" || tweet.favorite_count !== "0") {
    const stats = document.createElement("div");
    stats.className = "tweet-stats tweet-meta";
    if (tweet.retweet_count !== "0") {
      const rt = document.createElement("div");
      rt.innerHTML = `<span>${escapeHTML(tweet.retweet_count)}</span> Retweets`;
      stats.appendChild(rt);
    }
    if (tweet.favorite_count !== "0") {
      const fav = document.createElement("div");
      fav.innerHTML = `<span>${escapeHTML(tweet.favorite_count)}</span> Likes`;
      stats.appendChild(fav);
    }
    card.appendChild(stats);
  }

  return {
    element: card,
    cleanup: () => revokeMediaURLs(media, avatarURL),
  };
}

/** Generate a self-contained HTML page for the tweet (base64 data URIs, no external deps). */
export async function renderTweetHTML(
  archive: Archive,
  tweet: Tweet,
  theme: string,
  logo: string,
): Promise<string> {
  const rawMedia = await embedTweetMediaRaw(archive.files, tweet);
  const rawAvatar = await embedAvatarRaw(archive.files, archive.profile.avatarMediaUrl);

  const avatarDataURI = rawAvatar
    ? `data:${rawAvatar.mime};base64,${uint8ToBase64(rawAvatar.data)}`
    : "";

  const mediaItems = rawMedia.map((m) => ({
    dataURI: `data:${m.mime};base64,${uint8ToBase64(m.data)}`,
    type: m.type,
  }));

  const tweetHTML = linkifyText(tweet);
  const tweetURL = `https://twitter.com/${archive.account.username}/status/${tweet.id_str}`;
  const timestamp = formatTimestamp(tweet.created_at);
  const logoSVG = getLogoSVG(logo, theme);

  const borderColor = theme === "dark" ? "#38444d" : "#e1e8ed";

  // Build the CSS with theme baked in (matching Go CLI output)
  const css = buildStandaloneCSS(theme, borderColor);

  // Build media HTML
  let mediaHTML = "";
  if (mediaItems.length === 1) {
    mediaHTML = `<div class="tweet-media">${mediaElementHTML(mediaItems[0])}</div>`;
  } else if (mediaItems.length > 1) {
    const items = mediaItems.map((m) => mediaElementHTML(m)).join("\n        ");
    mediaHTML = `<div class="media-grid count-${mediaItems.length}">\n        ${items}\n      </div>`;
  }

  // Build stats HTML
  let statsHTML = "";
  if (tweet.retweet_count !== "0" || tweet.favorite_count !== "0") {
    let inner = "";
    if (tweet.retweet_count !== "0") {
      inner += `<div><span>${escapeHTML(tweet.retweet_count)}</span> Retweets</div>`;
    }
    if (tweet.favorite_count !== "0") {
      inner += `<div><span>${escapeHTML(tweet.favorite_count)}</span> Likes</div>`;
    }
    statsHTML = `<div class="tweet-stats tweet-meta">${inner}</div>`;
  }

  // Reply indicator
  const replyHTML = tweet.in_reply_to_screen_name
    ? `<div class="reply-indicator">Replying to <a href="https://twitter.com/${escapeAttr(tweet.in_reply_to_screen_name)}">@${escapeHTML(tweet.in_reply_to_screen_name)}</a></div>`
    : "";

  // Avatar
  const avatarHTML = avatarDataURI
    ? `<img class="avatar" src="${avatarDataURI}" alt="">`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${css}
</style>
</head>
<body>
<div class="tweet-card">
  <div class="tweet-header">
    ${avatarHTML}
    <div class="tweet-author">
      <span class="display-name">${escapeHTML(archive.account.accountDisplayName)}</span>
      <span class="username tweet-meta">@${escapeHTML(archive.account.username)}</span>
    </div>
    <div class="tweet-logo">${logoSVG}</div>
  </div>

  ${replyHTML}

  <div class="tweet-text">${tweetHTML}</div>

  ${mediaHTML}

  <div class="tweet-timestamp tweet-meta">
    <a href="${escapeAttr(tweetURL)}">${escapeHTML(timestamp)}</a>
  </div>

  ${statsHTML}
</div>
</body>
</html>`;
}

function buildStandaloneCSS(theme: string, borderColor: string): string {
  const isDark = theme === "dark";
  const bg = isDark ? "#15202b" : "#ffffff";
  const text = isDark ? "#e7e9ea" : "#0f1419";
  const meta = isDark ? "#8b98a5" : "#536471";

  return `* { margin: 0; padding: 0; box-sizing: border-box; }

.tweet-card {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  width: 100%;
  max-width: 600px;
  border-radius: 16px;
  padding: 16px;
  line-height: 1.5;
  text-decoration: none;
  background: ${bg};
  color: ${text};
  border: 1px solid ${borderColor};
}

.tweet-card a { color: #1d9bf0; }
.tweet-meta { color: ${meta}; }
.reply-indicator { color: ${meta}; }
.tweet-stats { color: ${meta}; }
.tweet-stats span { color: ${text}; }

.tweet-header { display: flex; align-items: center; margin-bottom: 4px; }
.avatar { width: 48px; height: 48px; border-radius: 50%; margin-right: 12px; flex-shrink: 0; }
.tweet-author { display: flex; flex-direction: column; line-height: 1.3; }
.display-name { font-weight: 700; font-size: 15px; }
.username { font-size: 15px; }
.tweet-logo { margin-left: auto; flex-shrink: 0; }
.tweet-logo svg { width: 24px; height: 24px; }
.reply-indicator { font-size: 13px; margin-bottom: 4px; }
.tweet-text { font-size: 15px; margin-bottom: 12px; word-wrap: break-word; overflow-wrap: break-word; }
.tweet-text a { text-decoration: none; }
.tweet-text a:hover { text-decoration: underline; }
.tweet-media { border-radius: 16px; overflow: hidden; margin-bottom: 12px; }
.tweet-media img { width: 100%; display: block; }
.tweet-media video { width: 100%; display: block; }
.media-grid { display: grid; gap: 2px; border-radius: 16px; overflow: hidden; margin-bottom: 12px; }
.media-grid.count-2 { grid-template-columns: 1fr 1fr; }
.media-grid.count-3 { grid-template-columns: 1fr 1fr; }
.media-grid.count-4 { grid-template-columns: 1fr 1fr; }
.media-grid img { width: 100%; height: 100%; object-fit: cover; display: block; }
.media-grid.count-3 > *:first-child { grid-row: 1 / 3; }
.tweet-timestamp { font-size: 15px; padding-top: 12px; border-top: 1px solid ${borderColor}; }
.tweet-timestamp a { text-decoration: none; }
.tweet-timestamp a:hover { text-decoration: underline; }
.tweet-stats { display: flex; gap: 20px; font-size: 14px; padding-top: 12px; margin-top: 12px; border-top: 1px solid ${borderColor}; }
.tweet-stats span { font-weight: 700; }`;
}

function mediaElementHTML(m: { dataURI: string; type: string }): string {
  if (m.type === "photo") {
    return `<img src="${m.dataURI}" alt="">`;
  } else if (m.type === "animated_gif") {
    return `<video autoplay loop muted playsinline src="${m.dataURI}"></video>`;
  } else {
    return `<video controls playsinline src="${m.dataURI}"></video>`;
  }
}

function uint8ToBase64(data: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

function createMediaElement(m: RenderMedia): HTMLElement {
  if (m.type === "photo") {
    const img = document.createElement("img");
    img.src = m.url;
    img.alt = "";
    return img;
  } else if (m.type === "animated_gif") {
    const video = document.createElement("video");
    video.src = m.url;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    return video;
  } else {
    // video
    const video = document.createElement("video");
    video.src = m.url;
    video.controls = true;
    video.playsInline = true;
    return video;
  }
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;

  const hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  return `${hour12}:${minutes} ${ampm} \u00B7 ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function escapeHTML(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHTML(s);
}
