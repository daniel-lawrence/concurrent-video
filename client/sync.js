class VideoSync {
  constructor () {
    this.recentUpdate = false;
    this.lastState = null;
  }

  getState() {
    if (!(window.ytPlayer && window.ytPlayer.getPlayerState)) {
      return;
    }
    const playerState = window.ytPlayer.getPlayerState();
    const playing = (playerState === 1);

    const foundState = {
      videoURL: window.ytPlayer.videoId,
      playing,
      timeStamp: window.ytPlayer.getCurrentTime(),
    };
    console.log('getState got:', foundState);
    return foundState;
  }

  setState(state) {
    console.log('STATE: setting state', state);
    this.recentUpdate = true;
    if (state.watcherCount) {
      document.getElementById('viewer-count-display').innerHTML = `${state.watcherCount} watching now`;
    }
    if (!(window.ytPlayer && window.ytPlayer.getPlayerState)) {
      window.loadVideo(state.videoURL, state.timeStamp);
      return;
    }

    const playerState = window.ytPlayer.getPlayerState();
    if (state.playing && playerState !== 1) {
      console.log('Triggering play');
      window.ytPlayer.seekTo(state.timeStamp, true);
      window.ytPlayer.playVideo();
    } else if (!state.playing && playerState !== 3) {
      console.log('Triggering pause');
      window.ytPlayer.pauseVideo();
    }

    const currentTime = window.ytPlayer.getCurrentTime();
    if (state.timeStamp && Math.abs(currentTime - state.timeStamp) > 1) {
      window.ytPlayer.seekTo(state.timeStamp, true);
    }

    if (state.videoURL && (state.videoURL != window.ytPlayer.videoId)) {
      window.loadVideo(state.videoURL, state.timeStamp);
    }

    setTimeout(() => {
      console.log(`setting recentUpdate (${this.recentUpdate}) to false`);
      this.recentUpdate = false;
      console.log(this.recentUpdate);
    }, 500);
  }

  onPlayerStateChange(event) {
    console.log('event:', event);
    if (this.recentUpdate || !window.syncSocket) {
      return;
    }

    console.log(`current player state: ${window.ytPlayer.getPlayerState()}`);
    const newState = window.ytPlayer.videoSync.getState();
    window.syncSocket.send(JSON.stringify(newState));
  }
}

module.exports = { VideoSync };
