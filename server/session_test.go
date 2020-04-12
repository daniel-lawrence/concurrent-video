package main

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/gorilla/websocket"
)

func TestRoomSync(t *testing.T) {
	// create new room
	newRoomID := newRoom()
	newRoom := rooms[newRoomID]

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := wsUpgrader.Upgrade(w, r, nil)
		if err != nil {
			t.Log(err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		newRoom.communicateState(conn)
	}))
	defer ts.Close()

	serverURL, _ := url.Parse(ts.URL)
	serverURL.Scheme = "ws"
	// create client 1
	client1, _, err := websocket.DefaultDialer.Dial(serverURL.String(), nil)
	if err != nil {
		t.Errorf("cannot make websocket connection: %v", err)
	}

	// create client 2
	client2, _, err := websocket.DefaultDialer.Dial(serverURL.String(), nil)
	if err != nil {
		t.Errorf("cannot make websocket connection: %v", err)
	}

	// write status update to client 1
	roomUpdate := roomState{
		VideoURL:  "http://youtube.com/whatever",
		Playing:   true,
		TimeStamp: 60,
	}
	err = client1.WriteJSON(roomUpdate)
	if err != nil {
		t.Errorf("cannot write message: %v", err)
	}

	// receive status update from client 2
	newRoomState := roomState{}
	err = client2.ReadJSON(&newRoomState)
	if err != nil {
		t.Errorf("cannot read message: %v", err)
	}

	if newRoom.VideoURL != roomUpdate.VideoURL {
		t.Errorf("Wrong video URL: expected %s, got %s", roomUpdate.VideoURL, newRoom.VideoURL)
	}
}
