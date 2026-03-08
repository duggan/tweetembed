package archive

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// LoadArchive loads tweet, account, and profile data using the given FileReader.
func LoadArchive(files FileReader) (*Archive, error) {
	a := &Archive{Files: files}

	// Load tweets
	tweets, err := loadTweets(files)
	if err != nil {
		return nil, fmt.Errorf("loading tweets: %w", err)
	}
	a.TweetMap = make(map[string]Tweet, len(tweets))
	for _, t := range tweets {
		a.TweetMap[t.IDStr] = t
	}

	// Load account
	acct, err := loadAccount(files)
	if err != nil {
		return nil, fmt.Errorf("loading account: %w", err)
	}
	a.Account = acct

	// Load profile
	prof, err := loadProfile(files)
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
	// Check for extracted directories first
	for _, e := range entries {
		if e.IsDir() && strings.HasPrefix(e.Name(), "twitter-") {
			candidate := filepath.Join(baseDir, e.Name())
			if _, err := os.Stat(filepath.Join(candidate, "tweet.js")); err == nil {
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

func loadTweets(files FileReader) ([]Tweet, error) {
	data, err := files.ReadFile("tweet.js")
	if err != nil {
		return nil, err
	}
	raw := stripJSPrefix(data)
	var tweets []Tweet
	if err := json.Unmarshal(raw, &tweets); err != nil {
		return nil, fmt.Errorf("parsing tweet.js: %w", err)
	}
	return tweets, nil
}

func loadAccount(files FileReader) (Account, error) {
	data, err := files.ReadFile("account.js")
	if err != nil {
		return Account{}, err
	}
	raw := stripJSPrefix(data)
	var wrappers []accountWrapper
	if err := json.Unmarshal(raw, &wrappers); err != nil {
		return Account{}, fmt.Errorf("parsing account.js: %w", err)
	}
	if len(wrappers) == 0 {
		return Account{}, fmt.Errorf("no account data in account.js")
	}
	return wrappers[0].Account, nil
}

func loadProfile(files FileReader) (Profile, error) {
	data, err := files.ReadFile("profile.js")
	if err != nil {
		return Profile{}, err
	}
	raw := stripJSPrefix(data)
	var wrappers []profileWrapper
	if err := json.Unmarshal(raw, &wrappers); err != nil {
		return Profile{}, fmt.Errorf("parsing profile.js: %w", err)
	}
	if len(wrappers) == 0 {
		return Profile{}, fmt.Errorf("no profile data in profile.js")
	}
	return wrappers[0].Profile, nil
}
