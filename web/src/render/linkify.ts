import type { Tweet } from "../archive/types.js";

interface Replacement {
  start: number;
  end: number;
  html: string;
}

function parseIndices(indices: string[]): [number, number] {
  if (indices.length < 2) return [0, 0];
  return [parseInt(indices[0], 10), parseInt(indices[1], 10)];
}

function escapeHTML(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Linkify tweet text by replacing mentions, hashtags, URLs with HTML links
 * and removing media URLs.
 *
 * JavaScript strings are natively UTF-16, so Twitter's entity indices
 * map directly to String.prototype.slice() positions.
 */
export function linkifyText(tweet: Tweet): string {
  let text = tweet.full_text;

  const reps: Replacement[] = [];

  for (const m of tweet.entities.user_mentions) {
    const [start, end] = parseIndices(m.indices);
    reps.push({
      start,
      end,
      html: `<a href="https://twitter.com/${escapeHTML(m.screen_name)}">@${escapeHTML(m.screen_name)}</a>`,
    });
  }

  for (const h of tweet.entities.hashtags) {
    const [start, end] = parseIndices(h.indices);
    reps.push({
      start,
      end,
      html: `<a href="https://twitter.com/hashtag/${escapeHTML(h.text)}">#${escapeHTML(h.text)}</a>`,
    });
  }

  for (const u of tweet.entities.urls) {
    const [start, end] = parseIndices(u.indices);
    reps.push({
      start,
      end,
      html: `<a href="${escapeHTML(u.expanded_url)}">${escapeHTML(u.display_url)}</a>`,
    });
  }

  // Remove media URLs from text (they'll be shown as embedded media)
  if (tweet.entities.media) {
    for (const m of tweet.entities.media) {
      const [start, end] = parseIndices(m.indices);
      reps.push({ start, end, html: "" });
    }
  }

  // Sort by start index descending so replacements don't shift indices
  reps.sort((a, b) => b.start - a.start);

  for (const r of reps) {
    if (r.start < 0 || r.end > text.length || r.start >= r.end) {
      continue;
    }
    text = text.slice(0, r.start) + r.html + text.slice(r.end);
  }

  text = text.trim();
  text = text.replace(/\n/g, "<br>");
  return text;
}
