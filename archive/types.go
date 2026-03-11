package archive

import "io"

// FileReader abstracts file access so the archive can be read from
// a directory on disk or directly from a zip file.
type FileReader interface {
	// ReadFile reads the entire contents of the named file.
	ReadFile(name string) ([]byte, error)
	// Glob returns file paths matching a pattern.
	Glob(pattern string) ([]string, error)
	// Close releases any resources (e.g. open zip file).
	Close() error
}

// Archive holds the loaded Twitter archive data.
type Archive struct {
	Files           FileReader
	Account         Account
	Profile         Profile
	TweetMap        map[string]Tweet
	TweetMediaDir   string // "tweet_media" or "data/tweets_media"
	ProfileMediaDir string // "profile_media" or "data/profile_media"
}

// ReadFile is a convenience method to read a file from the archive.
func (a *Archive) ReadFile(name string) ([]byte, error) {
	return a.Files.ReadFile(name)
}

// Glob is a convenience method to glob files in the archive.
func (a *Archive) Glob(pattern string) ([]string, error) {
	return a.Files.Glob(pattern)
}

// Closer returns the underlying FileReader's Close for deferred cleanup.
func (a *Archive) Close() error {
	if c, ok := a.Files.(io.Closer); ok {
		return c.Close()
	}
	return nil
}

type accountWrapper struct {
	Account Account `json:"account"`
}

type profileWrapper struct {
	Profile Profile `json:"profile"`
}

type Account struct {
	Username           string `json:"username"`
	AccountDisplayName string `json:"accountDisplayName"`
	AccountID          string `json:"accountId"`
}

type Profile struct {
	Description    ProfileDescription `json:"description"`
	AvatarMediaURL string             `json:"avatarMediaUrl"`
}

type ProfileDescription struct {
	Bio      string `json:"bio"`
	Website  string `json:"website"`
	Location string `json:"location"`
}

type Tweet struct {
	IDStr               string            `json:"id_str"`
	FullText            string            `json:"full_text"`
	CreatedAt           string            `json:"created_at"`
	FavoriteCount       string            `json:"favorite_count"`
	RetweetCount        string            `json:"retweet_count"`
	Retweeted           bool              `json:"retweeted"`
	InReplyToScreenName string            `json:"in_reply_to_screen_name"`
	InReplyToStatusID   string            `json:"in_reply_to_status_id_str"`
	Entities            Entities          `json:"entities"`
	ExtendedEntities    *ExtendedEntities `json:"extended_entities"`
	DisplayTextRange    []string          `json:"display_text_range"`
}

type Entities struct {
	Hashtags     []HashtagEntity     `json:"hashtags"`
	URLs         []URLEntity         `json:"urls"`
	UserMentions []UserMentionEntity `json:"user_mentions"`
	Media        []MediaEntity       `json:"media"`
}

type ExtendedEntities struct {
	Media []MediaEntity `json:"media"`
}

type HashtagEntity struct {
	Text    string   `json:"text"`
	Indices []string `json:"indices"`
}

type URLEntity struct {
	URL         string   `json:"url"`
	ExpandedURL string   `json:"expanded_url"`
	DisplayURL  string   `json:"display_url"`
	Indices     []string `json:"indices"`
}

type UserMentionEntity struct {
	Name       string   `json:"name"`
	ScreenName string   `json:"screen_name"`
	Indices    []string `json:"indices"`
	IDStr      string   `json:"id_str"`
}

type MediaEntity struct {
	MediaURL      string               `json:"media_url"`
	MediaURLHTTPS string               `json:"media_url_https"`
	URL           string               `json:"url"`
	ExpandedURL   string               `json:"expanded_url"`
	DisplayURL    string               `json:"display_url"`
	IDStr         string               `json:"id_str"`
	Type          string               `json:"type"`
	VideoInfo     *VideoInfo           `json:"video_info"`
	Indices       []string             `json:"indices"`
	Sizes         map[string]MediaSize `json:"sizes"`
}

type VideoInfo struct {
	AspectRatio []string       `json:"aspect_ratio"`
	Variants    []VideoVariant `json:"variants"`
}

type VideoVariant struct {
	Bitrate     string `json:"bitrate"`
	ContentType string `json:"content_type"`
	URL         string `json:"url"`
}

type MediaSize struct {
	W      string `json:"w"`
	H      string `json:"h"`
	Resize string `json:"resize"`
}

// tweetWrapper is the outer object in the new (2026+) archive format,
// where each array element is {"tweet": {…}} instead of a bare tweet.
type tweetWrapper struct {
	Tweet Tweet `json:"tweet"`
}
