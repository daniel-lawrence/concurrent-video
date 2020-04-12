package main

import (
	"context"
	"errors"
	"io/ioutil"
	"log"
	"strings"

	"google.golang.org/api/option"
	"google.golang.org/api/youtube/v3"
)

var gapiKey string

func init() {
	key, err := ioutil.ReadFile(".key")
	if err != nil {
		log.Fatal(err)
	}
	gapiKey = strings.TrimSpace(string(key))
}

func searchVideos(query string) ([]byte, error) {
	// return error for testing
	return nil, errors.New("Some error")

	ctx := context.Background()
	youtubeService, err := youtube.NewService(ctx, option.WithAPIKey(gapiKey))

	// if query looks like a video/channel/playlist ID, get video data for $query
	// if error, or not ID, search youtube for string
	if err != nil {
		return nil, err
	}

	searchResults, err := youtubeService.Search.List("snippet").Q(query).MaxResults(16).Type("video").Do()
	if err != nil {
		return nil, err
	}
	resultsBytes, err := searchResults.MarshalJSON()
	return resultsBytes, err
}
