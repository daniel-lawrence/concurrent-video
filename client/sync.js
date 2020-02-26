class VideoSync {
  getState() {
    if (!(window.ytPlayer && window.ytPlayer.getPlayerState)) {
      return;
    }
    let playerState = window.ytPlayer.getPlayerState();
    if (playerState == -1) {
      playerState = 2;
    }

    const foundState = {
      videoURL: window.ytPlayer.videoId,
      currentState: playerState,
      timeStamp: window.ytPlayer.getCurrentTime(),
    };
    console.log('getState got:', foundState);
    return foundState;
  }

  setState(state) {
    console.log('STATE: setting state', state);
    if (state.watcherCount) {
      document.getElementById('viewer-count-display').innerHTML = `${state.watcherCount} watching now`;
    }
    if (!(window.ytPlayer && window.ytPlayer.getPlayerState)) {
      window.loadVideo(state.videoURL, state.timeStamp);
      return;
    }

    const playerState = window.ytPlayer.getPlayerState();
    if (playerState != 1 && state.currentState == 1) {
      window.ytPlayer.playVideo();
    } else if (playerState == 1 && (state.currentState == 2 || state.currentState == 0 || state.currentState == -1)) {
      window.ytPlayer.pauseVideo();
    }

    const currentTime = window.ytPlayer.getCurrentTime();
    if (state.timeStamp && Math.abs(currentTime - state.timeStamp) > 1) {
      window.ytPlayer.seekTo(state.timeStamp, true);
    }

    if (state.videoURL && (state.videoURL != window.ytPlayer.videoId)) {
      window.loadVideo(state.videoURL, state.timeStamp);
    }

    window.ytPlayer.preventStateUpdates = false;
  }

  onPlayerStateChange(event) {
    if (window.syncSocket) {
      const newState = window.ytPlayer.videoSync.getState();
      window.syncSocket.send(JSON.stringify(newState));
    }
  }
}

module.exports = { VideoSync };
