/** Abstracts file access so the archive can be read from a zip file. */
export interface FileReader {
  readFile(name: string): Promise<Uint8Array>;
  glob(pattern: string): string[];
  filenames(): string[];
}

export interface Archive {
  files: FileReader;
  account: Account;
  profile: Profile;
  tweetMap: Map<string, Tweet>;
  tweetMediaDir: string;
  profileMediaDir: string;
}

export interface Account {
  username: string;
  accountDisplayName: string;
  accountId: string;
}

export interface Profile {
  description: ProfileDescription;
  avatarMediaUrl: string;
}

export interface ProfileDescription {
  bio: string;
  website: string;
  location: string;
}

export interface Tweet {
  id_str: string;
  full_text: string;
  created_at: string;
  favorite_count: string;
  retweet_count: string;
  retweeted: boolean;
  in_reply_to_screen_name: string;
  in_reply_to_status_id_str: string;
  entities: Entities;
  extended_entities?: ExtendedEntities;
  display_text_range: string[];
}

export interface Entities {
  hashtags: HashtagEntity[];
  urls: URLEntity[];
  user_mentions: UserMentionEntity[];
  media?: MediaEntity[];
}

export interface ExtendedEntities {
  media: MediaEntity[];
}

export interface HashtagEntity {
  text: string;
  indices: string[];
}

export interface URLEntity {
  url: string;
  expanded_url: string;
  display_url: string;
  indices: string[];
}

export interface UserMentionEntity {
  name: string;
  screen_name: string;
  indices: string[];
  id_str: string;
}

export interface MediaEntity {
  media_url: string;
  media_url_https: string;
  url: string;
  expanded_url: string;
  display_url: string;
  id_str: string;
  type: string;
  video_info?: VideoInfo;
  indices: string[];
  sizes: Record<string, MediaSize>;
}

export interface VideoInfo {
  aspect_ratio: string[];
  variants: VideoVariant[];
}

export interface VideoVariant {
  bitrate: string;
  content_type: string;
  url: string;
}

export interface MediaSize {
  w: string;
  h: string;
  resize: string;
}
