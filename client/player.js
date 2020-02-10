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
tag.src = 'https://www.youtube.com/iframe_api';
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// 3. This function creates an <iframe> (and YouTube player)
//    after the API code downloads.
window.onYouTubeIframeAPIReady = function () {
  // if (window.ytPlayer) {
  //   window.ytPlayer.destroy();
  // }
  window.ytPlayer = new YT.Player('player', {
    events: {
      onError: console.error,
    }
  });
  videoSync = new VideoSync(ytPlayer);
  ytPlayer.addEventListener('onReady', window.onPlayerReady);
  ytPlayer.addEventListener(
    'onStateChange',
    videoSync.onPlayerStateChange.bind(videoSync)
  );
  ytPlayer.videoSync = videoSync;

  setTimeout(window.onPlayerCreated, 1000);
};

window.loadVideo = function (videoId, timestamp) {
  console.log(window.ytPlayer);
  window.ytPlayer.loadVideoById(videoId, timestamp);
  window.ytPlayer.videoId = videoId;
};

window.submitSearch = () => {
  const searchValue = document.getElementById('search').value;
  const searchQuery = new XMLHttpRequest();
  searchQuery.open('GET', `https://api.${window.location.hostname}/youtube/${searchValue}`);

  searchQuery.onload = () => (
    loadVideo(JSON.parse(searchQuery.responseText).items[0].id.videoId)
  );
  searchQuery.onerror = () => console.error(searchQuery.statusText);
  searchQuery.send(null);
  return false;
};

window.onPlayerReady = () => {
  if (window.location.search) {
    window.roomId = window.location.search.substring(1);
    window.onRoomId();
  }

  if (!window.roomId) {
    // create a new room
    var roomRequest = new XMLHttpRequest();
    roomRequest.open('POST', `https://api.${window.location.hostname}/rooms/new`);

    roomRequest.onload = () => {
      window.roomId = roomRequest.responseText;
      window.history.pushState(window.data, window.title, `/?${window.roomId}`);
      window.onRoomId();
    };

    roomRequest.onerror = function (e) {
      console.error(roomRequest.statusText);
    };

    roomRequest.send(null);
  }
};

window.onRoomId = () => {
  window.syncSocket = new WebSocket(
    `wss://api.${window.location.hostname}/rooms/${window.roomId}`
  );

  window.syncSocket.onopen = () => { };

  window.syncSocket.onmessage = event => {
    window.ytPlayer.videoSync.setState(JSON.parse(event.data));
  };

  window.syncSocket.onclose = event => {
    if (event.wasClean) {
    } else {
      // e.g. server process killed or network down
      // event.code is usually 1006 in this case
    }
    window.syncSocket = null;
  };

  window.syncSocket.onerror = error => {
    console.error(error);
  };
};
