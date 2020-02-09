const { VideoSync } = require('./sync.js');
var playerStates = {
  '-1': 'unstarted',
  '0': 'ended',
  '1': 'playing',
  '2': 'paused',
  '3': 'buffering',
  '5': 'video cued'
};

var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// 3. This function creates an <iframe> (and YouTube player)
//    after the API code downloads.
window.onYouTubeIframeAPIReady = function () {
  // if (window.ytPlayer) {
  //   window.ytPlayer.destroy();
  // }
  window.ytPlayer = new YT.Player('player', {
    height: '390',
    width: '640',
    events: {
      onError: function (e) {
        console.log(e);
      }
    }
  });
  videoSync = new VideoSync(ytPlayer);
  ytPlayer.addEventListener('onReady', window.onPlayerReady);
  ytPlayer.addEventListener('onStateChange', videoSync.onPlayerStateChange.bind(videoSync));
  ytPlayer.videoSync = videoSync;

  setTimeout(window.onPlayerCreated, 1000);
}

window.loadVideo = function (videoId, timestamp) {
  window.ytPlayer.loadVideoById(videoId, timestamp);
  window.ytPlayer.videoId = videoId;
}

window.submitSearch = () => {
  const searchValue = document.getElementById('search').value;
  loadVideo(searchValue);
  return false;
}

window.onPlayerReady = () => {
  if (window.location.search) {
    window.roomId = window.location.search.substring(1);
    window.onRoomId();
  }

  if (!window.roomId) {
    // create a new room
    var roomRequest = new XMLHttpRequest();
    roomRequest.open('POST', 'http://localhost:8080/rooms/new');

    roomRequest.onload = () => {
      window.roomId = roomRequest.responseText;
      window.history.pushState(window.data, window.title, `/?${window.roomId}`);
      window.onRoomId();
    }

    roomRequest.onerror = function (e) {
      console.error(roomRequest.statusText);
    }

    roomRequest.send(null);
  }
}

window.onRoomId = () => {
  window.syncSocket = new WebSocket(`ws://localhost:8080/rooms/${window.roomId}`);

  window.syncSocket.onopen = () => { };

  window.syncSocket.onmessage = (event => {
    window.ytPlayer.videoSync.setState(JSON.parse(event.data));
  });

  window.syncSocket.onclose = (event) => {
    if (event.wasClean) {
    } else {
      // e.g. server process killed or network down
      // event.code is usually 1006 in this case
    }
    window.syncSocket = null;
  };

  window.syncSocket.onerror = (error) => {
    console.error(error);
  };
}
