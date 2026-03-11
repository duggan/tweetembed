import type { Archive, Tweet, VideoInfo } from "../archive/types.js";

export interface RenderMedia {
  url: string;
  type: string;
}

/** Read and create blob URLs for all media in a tweet. */
export async function embedTweetMedia(
  archive: Archive,
  tweet: Tweet,
): Promise<RenderMedia[]> {
  const raw = await embedTweetMediaRaw(archive, tweet);
  return raw.map((r) => {
    const blob = new Blob([r.data], { type: r.mime });
    return { url: URL.createObjectURL(blob), type: r.type };
  });
}

export interface RawMedia {
  data: Uint8Array;
  mime: string;
  type: string;
}

/** Read raw media bytes for all media in a tweet. */
export async function embedTweetMediaRaw(
  archive: Archive,
  tweet: Tweet,
): Promise<RawMedia[]> {
  const entities =
    tweet.extended_entities?.media ?? tweet.entities.media ?? [];

  const results: RawMedia[] = [];
  for (const m of entities) {
    let data: Uint8Array | null = null;
    let filename = "";

    if ((m.type === "video" || m.type === "animated_gif") && m.video_info) {
      const result = await findVideoData(archive, tweet.id_str, m.video_info);
      if (result) {
        data = result.data;
        filename = result.filename;
      }
    }

    if (!data) {
      filename = mediaFilename(tweet.id_str, m.media_url_https);
      try {
        data = await archive.files.readFile(`${archive.tweetMediaDir}/${filename}`);
      } catch {
        console.warn(`media file not found: ${filename}`);
        continue;
      }
    }

    results.push({ data, mime: mimeFromExt(filename), type: m.type });
  }

  return results;
}

/** Read and create a blob URL for the profile avatar. */
export async function embedAvatar(
  archive: Archive,
  avatarURL: string,
): Promise<string> {
  const raw = await embedAvatarRaw(archive, avatarURL);
  if (!raw) return "";
  const blob = new Blob([raw.data], { type: raw.mime });
  return URL.createObjectURL(blob);
}

export interface RawAvatar {
  data: Uint8Array;
  mime: string;
}

/** Read raw avatar bytes. */
export async function embedAvatarRaw(
  archive: Archive,
  avatarURL: string,
): Promise<RawAvatar | null> {
  const basename = urlBasename(avatarURL);
  if (!basename) return null;

  const matches = archive.files.glob(`${archive.profileMediaDir}/*${basename}*`);
  if (matches.length > 0) {
    try {
      const data = await archive.files.readFile(matches[0]);
      return { data, mime: mimeFromExt(matches[0]) };
    } catch {
      // fall through
    }
  }

  console.warn(`avatar file not found for ${avatarURL}`);
  return null;
}

/** Revoke blob URLs to free memory. */
export function revokeMediaURLs(media: RenderMedia[], avatarURL: string): void {
  for (const m of media) {
    if (m.url.startsWith("blob:")) {
      URL.revokeObjectURL(m.url);
    }
  }
  if (avatarURL.startsWith("blob:")) {
    URL.revokeObjectURL(avatarURL);
  }
}

async function findVideoData(
  archive: Archive,
  tweetID: string,
  vi: VideoInfo,
): Promise<{ data: Uint8Array; filename: string } | null> {
  for (const v of vi.variants) {
    if (v.content_type === "video/mp4") {
      const basename = urlBasename(v.url);
      const filename = `${tweetID}-${basename}`;
      try {
        const data = await archive.files.readFile(`${archive.tweetMediaDir}/${filename}`);
        return { data, filename };
      } catch {
        // try next variant
      }
    }
  }
  return null;
}

function mediaFilename(tweetID: string, mediaURL: string): string {
  return `${tweetID}-${urlBasename(mediaURL)}`;
}

function urlBasename(rawURL: string): string {
  try {
    const u = new URL(rawURL);
    const parts = u.pathname.split("/");
    return parts[parts.length - 1] || "";
  } catch {
    // If it's not a full URL, try treating as a path
    const parts = rawURL.split("/");
    return parts[parts.length - 1] || "";
  }
}

function mimeFromExt(filename: string): string {
  const idx = filename.lastIndexOf(".");
  if (idx < 0) return "application/octet-stream";
  const ext = filename.slice(idx).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".mp4":
      return "video/mp4";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}
