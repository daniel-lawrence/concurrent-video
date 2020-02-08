package main

import (
	"log"
	"sync"

	"github.com/gorilla/websocket"
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

type roomState struct {
	VideoURL     string   `json:"videoURL,omitempty"`
	CurrentState int      `json:"currentState,omitempty"`
	TimeStamp    float64  `json:"timeStamp,omitempty"`
	UIDs         []string `json:"uids,omitempty"`
}

type sharedRoom struct {
	roomState
	connected []*websocket.Conn
	stateLock *sync.Mutex
}

var rooms map[string]*sharedRoom

// newRoom initializes a new room state and adds it to the states stored in memory.
func newRoom() (id string) {
	if rooms == nil {
		rooms = make(map[string]*sharedRoom)
	}
	id = uuid.NewV4().String()
	room := sharedRoom{
		roomState: roomState{
			CurrentState: playerUnstarted,
		},
		stateLock: &sync.Mutex{},
	}
	rooms[id] = &room
	return id
}

func (r *sharedRoom) communicateState(conn *websocket.Conn) {
	// for every new connection:
	// start goroutine that listens for sync events and writes them to all other conns
	r.stateLock.Lock()
	r.connected = append(r.connected, conn)
	r.stateLock.Unlock()

	go func() {
		defer conn.Close()
		for {
			// Read an incoming state change messages
			stateUpdate := roomState{}
			err := conn.ReadJSON(&stateUpdate)
			if err != nil {
				log.Println(err)
				return
			}

			log.Printf("Got state update: %v\n", stateUpdate)

			// take room state lock
			r.stateLock.Lock()
			r.roomState = stateUpdate
			for _, otherClient := range r.connected {
				if conn == otherClient {
					continue
				}
				err = otherClient.WriteJSON(stateUpdate)
				if err != nil {
					log.Printf("Error updating other client state: %v\n", err)
				}
			}
			r.stateLock.Unlock()
		}
	}()
}
