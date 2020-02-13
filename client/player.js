const { VideoSync } = require('./sync.js');
const testData = require('./testData.json');
const Request = require('./request.js');

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

document.addEventListener('DOMContentLoaded', () => {
  var elems = document.querySelectorAll('.sidenav');
  M.Sidenav.init(elems, {});
});

const getBaseUrl = () => {
  if (process.env.NODE_ENV === 'development') {
    return `http://${window.location.hostname}:8080`;
  } else {
    return `https://api.${window.location.hostname}`;
  }
}

// Load the YouTube player without a specific video.
window.onYouTubeIframeAPIReady = function () {
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
  document.searchResultList = document.searchResultList || [];

  const req = new Request(`${getBaseUrl()}/youtube/${searchValue}`, 'GET');

  const showSearchResults = result => {
    document.searchResultList.forEach(elem => elem.remove());
    result.items.forEach(item => {
      li = document.createElement('li');
      li.innerHTML = `<button class="row result waves-effect waves-dark btn black-text white"><div class="center-align col s12">${item.snippet.channelTitle}</div><div class="divider col s12"></div><div class="valign-wrapper snippet col s7"><div class="center-align">${item.snippet.title}</div></div><div class="col s5"><img src=${item.snippet.thumbnails.default.url}></div></button>`;
      li.onclick = () => {
        loadVideo(item.id.videoId);
        M.Sidenav.getInstance(document.getElementById("slide-out")).close();
      };
      document.searchResultList.push(li);
      document.getElementById('slide-out').appendChild(li);
    });
  };

  req.send().then(result => {
    console.log(result);
    showSearchResults(result);
  }).catch(err => {
    console.log(err);
    if (process.env.NODE_ENV === 'development') {
      // Assume error is due to not having running server, and return test data
      showSearchResults(testData);
    } else {
      console.error(err);
    }
  });
  return false;
};

window.onPlayerReady = () => {
  if (window.location.search) {
    window.roomId = window.location.search.substring(1);
    window.onRoomId();
  }

  if (!window.roomId) {
    // create a new room
    const req = new Request(`${getBaseUrl()}/rooms/new`, 'POST');

    req.send().then(response => {
      window.roomId = response;
      window.history.pushState(window.data, window.title, `/?${window.roomId}`);
      window.onRoomId();
    }).catch(console.error);
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
