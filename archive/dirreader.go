package archive

import (
	"os"
	"path/filepath"
)

// DirReader reads archive files from a directory on disk.
type DirReader struct {
	base string
}

func NewDirReader(base string) *DirReader {
	return &DirReader{base: base}
}

func (d *DirReader) ReadFile(name string) ([]byte, error) {
	return os.ReadFile(filepath.Join(d.base, name))
}

func (d *DirReader) Glob(pattern string) ([]string, error) {
	matches, err := filepath.Glob(filepath.Join(d.base, pattern))
	if err != nil {
		return nil, err
	}
	// Return paths relative to base
	rel := make([]string, len(matches))
	for i, m := range matches {
		r, err := filepath.Rel(d.base, m)
		if err != nil {
			rel[i] = m
		} else {
			rel[i] = r
		}
	}
	return rel, nil
}

func (d *DirReader) Close() error { return nil }
