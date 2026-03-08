package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/duggan/tweetembed/archive"
	"github.com/duggan/tweetembed/input"
	"github.com/duggan/tweetembed/render"
)

// Set via ldflags at build time.
var version = "dev"

func main() {
	archivePath := flag.String("archive", "", "path to Twitter archive directory or zip file (auto-detected if omitted)")
	output := flag.String("o", "", "output file (default: stdout)")
	theme := flag.String("theme", "light", "theme: light or dark")
	logo := flag.String("logo", "bird", "logo: bird or x")
	showVersion := flag.Bool("version", false, "print version and exit")
	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, "Usage: tweetembed [flags] <tweet-id-or-url>\n\n")
		fmt.Fprintf(os.Stderr, "Accepts a tweet ID, Twitter/X URL, or Nitter URL and produces\na standalone HTML document.\n\n")
		flag.PrintDefaults()
	}
	flag.Parse()

	if *showVersion {
		fmt.Println("tweetembed " + version)
		return
	}

	if flag.NArg() < 1 {
		flag.Usage()
		os.Exit(1)
	}

	tweetID, err := input.ExtractTweetID(flag.Arg(0))
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}

	// Resolve archive path
	ap := *archivePath
	if ap == "" {
		cwd, err := os.Getwd()
		if err != nil {
			fmt.Fprintf(os.Stderr, "error: %v\n", err)
			os.Exit(1)
		}
		ap, err = archive.DetectArchivePath(cwd)
		if err != nil {
			fmt.Fprintf(os.Stderr, "error: %v\nUse --archive to specify the path.\n", err)
			os.Exit(1)
		}
	}

	files, err := archive.OpenFileReader(ap)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
	defer files.Close()

	a, err := archive.LoadArchive(files)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}

	tweet, ok := a.FindTweet(tweetID)
	if !ok {
		fmt.Fprintf(os.Stderr, "error: tweet %s not found in archive (%d tweets loaded)\n", tweetID, len(a.TweetMap))
		os.Exit(1)
	}

	// Determine output writer
	w := os.Stdout
	if *output != "" {
		f, err := os.Create(*output)
		if err != nil {
			fmt.Fprintf(os.Stderr, "error: %v\n", err)
			os.Exit(1)
		}
		defer f.Close()
		w = f
	}

	if err := render.RenderTweet(w, a, tweet, *theme, *logo); err != nil {
		fmt.Fprintf(os.Stderr, "error rendering tweet: %v\n", err)
		os.Exit(1)
	}
}
