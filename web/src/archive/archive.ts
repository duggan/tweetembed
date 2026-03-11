import type { Archive, Account, Profile, Tweet, FileReader } from "./types.js";

interface ArchiveFormat {
  tweetFile: string;
  accountFile: string;
  profileFile: string;
  tweetMediaDir: string;
  profileMediaDir: string;
  wrapped: boolean;
}

const oldFormat: ArchiveFormat = {
  tweetFile: "tweet.js",
  accountFile: "account.js",
  profileFile: "profile.js",
  tweetMediaDir: "tweet_media",
  profileMediaDir: "profile_media",
  wrapped: false,
};

const newFormat: ArchiveFormat = {
  tweetFile: "data/tweets.js",
  accountFile: "data/account.js",
  profileFile: "data/profile.js",
  tweetMediaDir: "data/tweets_media",
  profileMediaDir: "data/profile_media",
  wrapped: true,
};

function detectFormat(files: FileReader): ArchiveFormat {
  const names = files.filenames();
  return names.some((n) => n === "tweet.js") ? oldFormat : newFormat;
}

/** Load tweet, account, and profile data from the archive FileReader. */
export async function loadArchive(files: FileReader): Promise<Archive> {
  const f = detectFormat(files);

  const [tweets, account, profile] = await Promise.all([
    loadTweets(files, f),
    loadAccount(files, f.accountFile),
    loadProfile(files, f.profileFile),
  ]);

  const tweetMap = new Map<string, Tweet>();
  for (const t of tweets) {
    tweetMap.set(t.id_str, t);
  }

  return {
    files,
    account,
    profile,
    tweetMap,
    tweetMediaDir: f.tweetMediaDir,
    profileMediaDir: f.profileMediaDir,
  };
}

/** Look up a tweet by ID. */
export function findTweet(archive: Archive, id: string): Tweet | undefined {
  return archive.tweetMap.get(id);
}

/** Strip the "window.YTD.*.part0 = " prefix from a .js data file. */
export function stripJSPrefix(text: string): string {
  const idx = text.indexOf("[");
  return idx < 0 ? text : text.slice(idx);
}

async function loadTweets(files: FileReader, f: ArchiveFormat): Promise<Tweet[]> {
  const data = await files.readFile(f.tweetFile);
  const text = new TextDecoder().decode(data);
  const raw = stripJSPrefix(text);

  if (f.wrapped) {
    const wrappers: Array<{ tweet: Tweet }> = JSON.parse(raw);
    return wrappers.map((w) => w.tweet);
  }

  const parsed: Tweet[] = JSON.parse(raw);
  return parsed;
}

async function loadAccount(files: FileReader, filename: string): Promise<Account> {
  const data = await files.readFile(filename);
  const text = new TextDecoder().decode(data);
  const raw = stripJSPrefix(text);
  const wrappers: Array<{ account: Account }> = JSON.parse(raw);
  if (wrappers.length === 0) {
    throw new Error(`no account data in ${filename}`);
  }
  return wrappers[0].account;
}

async function loadProfile(files: FileReader, filename: string): Promise<Profile> {
  const data = await files.readFile(filename);
  const text = new TextDecoder().decode(data);
  const raw = stripJSPrefix(text);
  const wrappers: Array<{ profile: Profile }> = JSON.parse(raw);
  if (wrappers.length === 0) {
    throw new Error(`no profile data in ${filename}`);
  }
  return wrappers[0].profile;
}
