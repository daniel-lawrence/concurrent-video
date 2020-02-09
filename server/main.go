package main

import (
	"log"
	"net/http"
	"server/path"

	"github.com/gorilla/websocket"
)

var endpoints []*path.APIPath

var wsUpgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // TODO: proper origin checking
	},
}

func main() {
	newRoomPath, err := path.NewAPIPath("POST/rooms/new")
	if err != nil {
		log.Fatal(err)
	}
	joinPath, err := path.NewAPIPath("GET/rooms/{roomId}")
	if err != nil {
		log.Fatal(err)
	}
	endpoints = append(endpoints, newRoomPath)
	endpoints = append(endpoints, joinPath)

	// Start API server
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == "OPTIONS" {
			w.WriteHeader(200)
			return
		}

		if _, ok := newRoomPath.Match(r.Method, r.URL.Path); ok {
			roomID := newRoom()
			log.Printf("Created new room: %s\n", roomID)
			w.Write([]byte(roomID))
			return
		}

		if pathVars, ok := joinPath.Match(r.Method, r.URL.Path); ok {
			roomID, ok := pathVars["roomId"]
			if !ok {
				http.Error(w, "No room ID supplied", http.StatusBadRequest)
				return
			}
			log.Printf("Request to join room with ID %s\n", roomID)

			room, ok := rooms[roomID]
			if !ok {
				http.Error(w, "Room not found", http.StatusNotFound)
				log.Printf("Room %s requested but does not exist\n", roomID)
				return
			}

			conn, err := wsUpgrader.Upgrade(w, r, nil)
			if err != nil {
				log.Println(err)
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			room.communicateState(conn)

			return
		}
		http.Error(w, "No API method found", http.StatusNotFound)
	})

	log.Fatal(http.ListenAndServe(":8080", nil))
}
