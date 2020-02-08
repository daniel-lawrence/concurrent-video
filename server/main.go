package main

import (
	"io/ioutil"
	"log"
	"net/http"
	"server/paths"

	"github.com/gorilla/websocket"
)

var endpoints []*paths.APIPath

var wsUpgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // TODO: proper origin checking
	},
}

func main() {
	newRoomPath, err := paths.NewAPIPath("POST/rooms/new")
	if err != nil {
		log.Fatal(err)
	}
	joinPath, err := paths.NewAPIPath("GET/rooms/{roomId}")
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

		if pathVars, ok := newRoomPath.Match(r.Method, r.URL.Path); ok {
			log.Println(pathVars)
			log.Println("New room")
		}

		if pathVars, ok := joinPath.Match(r.Method, r.URL.Path); ok {
			log.Println(pathVars)
			log.Println("Join room")
			log.Printf("Room ID: %s\n", pathVars["roomId"])
			conn, err := wsUpgrader.Upgrade(w, r, nil)
			if err != nil {
				log.Println(err)
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			conn.WriteJSON("Hello!")
		}
		data, err := ioutil.ReadAll(r.Body)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		log.Println(data)
		// outBytes, err := json.Marshal(output)
		// if err != nil {
		// 	http.Error(w, err.Error(), http.StatusInternalServerError)
		// 	return
		// }
		// w.Write(outBytes)

		w.WriteHeader(200)
	})

	log.Fatal(http.ListenAndServe(":8080", nil))
}
