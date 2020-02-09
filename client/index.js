
var playerStates = {
  '-1': 'unstarted',
  '0': 'ended',
  '1': 'playing',
  '2': 'paused',
  '3': 'buffering',
  '5': 'video cued'
};

var roomId = null;
var socket = null;

var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// 3. This function creates an <iframe> (and YouTube player)
//    after the API code downloads.
var player;
window.onYouTubeIframeAPIReady = function () {
  console.log('is ready');
  player = new YT.Player('player', {
    height: '390',
    width: '640',
    videoId: 'M7lc1UVf-VE',
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
      onError: function(e) {
        console.log(e);
      }
    }
  });
}

function getState() {
  if (!player) {
    return;
  }
  let playerState = player.getPlayerState();
  if (playerState == -1) {
    playerState = 2;
  }
  const foundState = {
    videoURL: player.getVideoUrl(),
    currentState: playerState,
    timeStamp: player.getCurrentTime(),
  };
  console.log('getState got:', foundState);
  return foundState;
}

function setState(state) {
  console.log('STATE: setting state', state);
  player.onStateChange = null;

  const playerState = player.getPlayerState();
  if (playerState != 1 && state.currentState == 1) {
    player.playVideo();
  } else if (playerState == 1 && (state.currentState == 2 || state.currentState == 0 || state.currentState == -1)) {
    player.pauseVideo();
  }

  const currentTime = player.getCurrentTime();
  if (state.timeStamp && Math.abs(currentTime - state.timeStamp) > 0.5) {
    player.seekTo(state.timeStamp, true);
  }

  // if (state.videoURL != player.getVideoUrl()) {
  //   player.loadVideoByUrl(state.videoURL, state.timeStamp);
  // }

  player.onStateChange = onPlayerStateChange;
}

// 4. The API will call this function when the video player is ready.
function onPlayerReady(event) {
  event.target.playVideo();
  player.allowStateChanges = true;

  function joinRoom() {
    socket = new WebSocket(`ws://localhost:8080/rooms/${roomId}`);

    socket.onopen = function(e) {
    };

    socket.onmessage = function(event) {
      const newState = JSON.parse(event.data);
      if (player.lastStateChange) {
        if (
          player.lastStateChange.videoURL == newState.videoURL &&
          player.lastStateChange.currentState == newState.currentState &&
          player.lastStateChange.timeStamp == newState.timeStamp
        ) {
          return;
        }
      }
      setState(JSON.parse(event.data));
    };

    socket.onclose = function(event) {
      if (event.wasClean) {
      } else {
        // e.g. server process killed or network down
        // event.code is usually 1006 in this case
      }
      socket = null;
    };

    socket.onerror = function(error) {
    };
  }

  if (window.location.search) {
    // a room ID is already set
    roomId = window.location.search.substring(1);
    joinRoom();
  } else {
    // create a new room
    var roomRequest = new XMLHttpRequest();
    roomRequest.open('POST', 'http://localhost:8080/rooms/new');

    roomRequest.onload = function() {
      roomId = roomRequest.responseText;
      // set room ID in address and reload page
      window.location.search = roomId;
    }

    roomRequest.onerror = function(e) {
      console.error(roomRequest.statusText);
    }

    roomRequest.send(null);
  }
}

// 5. The API calls this function when the player's state changes.
//    The function indicates that when playing a video (state=1),
//    the player should play for six seconds and then stop.
function onPlayerStateChange(event) {
  // send a message to server with state and timestamp

  if (socket) {
    const newState = getState();
    console.log('Video URL is', newState.videoURL);
    if (player.lastStateChange) {
      if (
        player.lastStateChange.videoURL == newState.videoURL &&
        player.lastStateChange.currentState == newState.currentState &&
        player.lastStateChange.timeStamp == newState.timeStamp
      ) {
        return;
      }
    }
    socket.send(JSON.stringify(newState));
  }
}
function stopVideo() {
  player.stopVideo();
}
