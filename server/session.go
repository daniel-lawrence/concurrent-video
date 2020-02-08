package main

import (
	"net"

	uuid "github.com/satori/go.uuid"
)

const (
	playerUnstarted = -1
	playerEnded     = 0
	playerPlaying   = 1
	playerPaused    = 2
	playerBuffering = 3
	playerVideoCued = 5
)

type sharedRoom struct {
	VideoURL     string   `json:"videoURL,omitempty"`
	CurrentState int      `json:"currentState,omitempty"`
	TimeStamp    int      `json:"timeStamp,omitempty"`
	UIDs         []string `json:"uids,omitempty"`
	Connected    []*net.Conn
}

var rooms map[string]*sharedRoom

// NewRoom initializes a new room state and adds it to the states stored in memory.
func NewRoom() (id string) {
	id = uuid.NewV4().String()
	room := sharedRoom{CurrentState: playerUnstarted}
	rooms[id] = &room
	return id
}

func (r *sharedRoom) communicateState(conn *net.Conn) {

}
