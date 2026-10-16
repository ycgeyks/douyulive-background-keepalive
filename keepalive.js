(() => {
  'use strict';

  // Only numeric live-room URLs on the actual Douyu website are eligible.
  if (location.hostname !== 'www.douyu.com' ||
      !/^\/\d+\/?$/.test(location.pathname)) {
    return;
  }

  // This detached 1 × 1 canvas stays in memory; it is never displayed or exported.
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return;

  let timer = null;
  let lastVideo = null;

  function setStatus(video, status) {
    if (video.dataset.douyuBackgroundKeepalive !== status) {
      video.dataset.douyuBackgroundKeepalive = status;
    }
  }

  function keepAlive() {
    const video = document.querySelector('#js-player-video-case video');
    if (!video) return;
    if (lastVideo && lastVideo !== video) {
      delete lastVideo.dataset.douyuBackgroundKeepalive;
    }
    lastVideo = video;

    if (document.visibilityState !== 'hidden') {
      setStatus(video, 'foreground');
      return;
    }
    // Respect an intentional pause or mute; do not call play(), seek, or reload.
    if (video.paused || video.ended || video.muted || video.volume === 0) {
      setStatus(video, 'idle');
      return;
    }
    if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      setStatus(video, 'waiting');
      return;
    }

    try {
      // Chromium exempts a video whose frames are consumed by drawImage() from
      // disabling its video track in a hidden page. No pixel readback is needed.
      context.drawImage(video, 0, 0, 1, 1);
      setStatus(video, 'active');
    } catch {
      // A replacement player may not have a decoded frame yet; retry next tick.
      setStatus(video, 'waiting');
    }
  }

  function start() {
    if (timer === null) timer = setInterval(keepAlive, 1000);
    keepAlive();
  }

  function stop() {
    if (timer !== null) clearInterval(timer);
    timer = null;
    context.clearRect(0, 0, 1, 1);
    if (lastVideo) delete lastVideo.dataset.douyuBackgroundKeepalive;
    lastVideo = null;
  }

  document.addEventListener('visibilitychange', keepAlive);
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', start);
  start();
})();
