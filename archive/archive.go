package archive

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// archiveFormat describes the file layout of a Twitter archive.
type archiveFormat struct {
	tweetFile       string // "tweet.js" or "data/tweets.js"
	accountFile     string // "account.js" or "data/account.js"
	profileFile     string // "profile.js" or "data/profile.js"
	tweetMediaDir   string // "tweet_media" or "data/tweets_media"
	profileMediaDir string // "profile_media" or "data/profile_media"
	wrapped         bool   // true if tweets are wrapped in {"tweet": {…}}
}

var (
	oldFormat = archiveFormat{
		tweetFile:       "tweet.js",
		accountFile:     "account.js",
		profileFile:     "profile.js",
		tweetMediaDir:   "tweet_media",
		profileMediaDir: "profile_media",
		wrapped:         false,
	}
	newFormat = archiveFormat{
		tweetFile:       "data/tweets.js",
		accountFile:     "data/account.js",
		profileFile:     "data/profile.js",
		tweetMediaDir:   "data/tweets_media",
		profileMediaDir: "data/profile_media",
		wrapped:         true,
	}
)

// detectFormat probes the FileReader to determine the archive layout.
func detectFormat(files FileReader) archiveFormat {
	if _, err := files.ReadFile("tweet.js"); err == nil {
		return oldFormat
	}
	return newFormat
}

// LoadArchive loads tweet, account, and profile data using the given FileReader.
func LoadArchive(files FileReader) (*Archive, error) {
	f := detectFormat(files)
	a := &Archive{
		Files:           files,
		TweetMediaDir:   f.tweetMediaDir,
		ProfileMediaDir: f.profileMediaDir,
	}

	// Load tweets
	tweets, err := loadTweets(files, f)
	if err != nil {
		return nil, fmt.Errorf("loading tweets: %w", err)
	}
	a.TweetMap = make(map[string]Tweet, len(tweets))
	for _, t := range tweets {
		a.TweetMap[t.IDStr] = t
	}

	// Load account
	acct, err := loadAccount(files, f.accountFile)
	if err != nil {
		return nil, fmt.Errorf("loading account: %w", err)
	}
	a.Account = acct

	// Load profile
	prof, err := loadProfile(files, f.profileFile)
	if err != nil {
		return nil, fmt.Errorf("loading profile: %w", err)
	}
	a.Profile = prof

	return a, nil
}

// FindTweet looks up a tweet by ID.
func (a *Archive) FindTweet(id string) (*Tweet, bool) {
	t, ok := a.TweetMap[id]
	return &t, ok
}

// DetectArchivePath looks for a twitter-* subdirectory containing tweet.js,
// or a twitter-*.zip file, in the given base directory.
func DetectArchivePath(baseDir string) (string, error) {
	entries, err := os.ReadDir(baseDir)
	if err != nil {
		return "", err
	}
	// Check for extracted directories first (old format: tweet.js, new format: data/tweets.js)
	for _, e := range entries {
		if e.IsDir() && strings.HasPrefix(e.Name(), "twitter-") {
			candidate := filepath.Join(baseDir, e.Name())
			if _, err := os.Stat(filepath.Join(candidate, "tweet.js")); err == nil {
				return candidate, nil
			}
			if _, err := os.Stat(filepath.Join(candidate, "data", "tweets.js")); err == nil {
				return candidate, nil
			}
		}
	}
	// Then check for zip files
	for _, e := range entries {
		if !e.IsDir() && strings.HasPrefix(e.Name(), "twitter-") && strings.HasSuffix(e.Name(), ".zip") {
			return filepath.Join(baseDir, e.Name()), nil
		}
	}
	return "", fmt.Errorf("no Twitter archive found in %s (looking for twitter-*/tweet.js or twitter-*.zip)", baseDir)
}

// OpenFileReader returns the appropriate FileReader for the given path
// (directory or zip file).
func OpenFileReader(path string) (FileReader, error) {
	info, err := os.Stat(path)
	if err != nil {
		return nil, err
	}
	if info.IsDir() {
		return NewDirReader(path), nil
	}
	if strings.HasSuffix(strings.ToLower(path), ".zip") {
		return NewZipReader(path)
	}
	return nil, fmt.Errorf("%s is not a directory or zip file", path)
}

// stripJSPrefix removes the "window.YTD.*.part0 = " prefix from a .js data file.
func stripJSPrefix(data []byte) []byte {
	idx := strings.Index(string(data), "[")
	if idx < 0 {
		return data
	}
	return data[idx:]
}

func loadTweets(files FileReader, f archiveFormat) ([]Tweet, error) {
	data, err := files.ReadFile(f.tweetFile)
	if err != nil {
		return nil, err
	}
	raw := stripJSPrefix(data)

	if f.wrapped {
		var wrappers []tweetWrapper
		if err := json.Unmarshal(raw, &wrappers); err != nil {
			return nil, fmt.Errorf("parsing %s: %w", f.tweetFile, err)
		}
		tweets := make([]Tweet, len(wrappers))
		for i, w := range wrappers {
			tweets[i] = w.Tweet
		}
		return tweets, nil
	}

	var tweets []Tweet
	if err := json.Unmarshal(raw, &tweets); err != nil {
		return nil, fmt.Errorf("parsing %s: %w", f.tweetFile, err)
	}
	return tweets, nil
}

func loadAccount(files FileReader, filename string) (Account, error) {
	data, err := files.ReadFile(filename)
	if err != nil {
		return Account{}, err
	}
	raw := stripJSPrefix(data)
	var wrappers []accountWrapper
	if err := json.Unmarshal(raw, &wrappers); err != nil {
		return Account{}, fmt.Errorf("parsing %s: %w", filename, err)
	}
	if len(wrappers) == 0 {
		return Account{}, fmt.Errorf("no account data in %s", filename)
	}
	return wrappers[0].Account, nil
}

func loadProfile(files FileReader, filename string) (Profile, error) {
	data, err := files.ReadFile(filename)
	if err != nil {
		return Profile{}, err
	}
	raw := stripJSPrefix(data)
	var wrappers []profileWrapper
	if err := json.Unmarshal(raw, &wrappers); err != nil {
		return Profile{}, fmt.Errorf("parsing %s: %w", filename, err)
	}
	if len(wrappers) == 0 {
		return Profile{}, fmt.Errorf("no profile data in %s", filename)
	}
	return wrappers[0].Profile, nil
}
