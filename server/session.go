package main

import (
	"log"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/sethvargo/go-diceware/diceware"
	// uuid "github.com/satori/go.uuid"
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
	WatcherCount int      `json:"watcherCount,omitempty"`
	UIDs         []string `json:"uids,omitempty"`
}

type sharedRoom struct {
	roomState
	connected []*websocket.Conn
	stateLock *sync.Mutex
	roomID    string
}

var rooms map[string]*sharedRoom

// newRoom initializes a new room state and adds it to the states stored in memory.
func newRoom() (id string) {
	if rooms == nil {
		rooms = make(map[string]*sharedRoom)
	}

	dice, _ := diceware.Generate(3)
	id = strings.Join(dice, " ")
	id = strings.ReplaceAll(strings.Title(id), " ", "")

	for rooms[id] != nil {
		dice, _ = diceware.Generate(3)
		id = strings.Join(dice, " ")
		id = strings.ReplaceAll(strings.Title(id), " ", "")
	}

	room := sharedRoom{
		roomState: roomState{
			CurrentState: playerUnstarted,
		},
		stateLock: &sync.Mutex{},
		roomID:    id,
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
		// If a state already exists, push as update
		if r.roomState.VideoURL != "" {
			err := conn.WriteJSON(r.roomState)
			if err != nil {
				log.Printf("Error sending initial state: %v\n", err)
			}
		}

		conn.SetCloseHandler(func(code int, text string) error {
			// remove the conn from the room's list of connections
			r.stateLock.Lock()
			for i, c := range r.connected {
				if c == conn {
					r.connected = append(r.connected[:i], r.connected[i+1:]...)
					break
				}
			}
			log.Printf("Removed client - %d clients connected to room\n", len(r.connected))
			r.stateLock.Unlock()

			if len(r.connected) == 0 {
				log.Printf("Removing room %s\n", r.roomID)
				delete(rooms, r.roomID)
			}

			// write standard close message
			message := websocket.FormatCloseMessage(code, "")
			conn.WriteControl(websocket.CloseMessage, message, time.Now().Add(time.Second))
			return nil
		})

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
			r.roomState.WatcherCount = len(r.connected)
			for i, otherClient := range r.connected {
				if conn == otherClient {
					continue
				}
				err = otherClient.WriteJSON(r.roomState)
				if err != nil {
					log.Printf("Error updating other client state: %v\n", err)
					r.connected = append(r.connected[:i], r.connected[i+1:]...)
				}
			}
			r.stateLock.Unlock()
		}
	}()
}
