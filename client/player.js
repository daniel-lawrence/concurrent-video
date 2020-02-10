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
  if (process.env.NODE_ENV === 'development') {
    searchQuery.open('GET', `http://${window.location.hostname}:8080/youtube/${searchValue}`);
  } else {
    searchQuery.open('GET', `https://api.${window.location.hostname}/youtube/${searchValue}`);
  }

  searchQuery.onload = () => {
    JSON.parse(searchQuery.responseText).items.forEach(item => {
      elem = document.createElement('li');
      elem.innerHTML = `<div class="row result"><div class="center-align col s12">${item.snippet.channelTitle}</div><div class="valign-wrapper snippet col s7"><div class="center-align">${item.snippet.title}</div></div><div class="col s5"><img src=${item.snippet.thumbnails.default.url}></div></div>`;
      document.getElementById('slide-out').appendChild(elem);
    });
  };
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
    if (process.env.NODE_ENV === 'development') {
      roomRequest.open('POST', `http://${window.location.hostname}:8080/rooms/new`);
    } else {
      roomRequest.open('POST', `https://api.${window.location.hostname}/rooms/new`);
    }

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
  if (process.env.NODE_ENV === 'development') {
    window.syncSocket = new WebSocket(
      `ws://${window.location.hostname}:8080/rooms/${window.roomId}`
    );
  } else {
    window.syncSocket = new WebSocket(
      `wss://api.${window.location.hostname}/rooms/${window.roomId}`
    );
  }

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
