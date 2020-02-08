# Concurrent Server

- Ability to create session - new session with specific ID that other people with the link can join
- Receive sync events (timestamp, play/pause) and send to all other clients

## API

#### `POST/rooms/new`
Requests to this endpoint will create a new room and return the room ID as a string. Ex:
```
$ curl -X POST http://localhost:8080/rooms/new
d64108f7-1c8a-412b-8df0-29bf4f90065f
```

#### `GET/rooms/{roomId}`

Websocket connections to this endpoint will be kept open indefinitely. The object type expected by the server looks like:

```js
{
    "videoURL": "https://youtube.com/somevideo",
    "currentState": -1,
    "timeStamp": 60,
    "uids": [] // currently unused
}
```

Sending this object to the server will save this current status, and also send it as an update to any other clients connected to the room.

When a client receives this data, it should update the state of its current player.
