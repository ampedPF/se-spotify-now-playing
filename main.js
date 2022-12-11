const actions = {
  current: "current",
  previous: "previous",
};
const commands = {
  current: "!current",
  previous: "!previous",
};
let fieldData;

let chatCommandsEnabled = false;
let chatCommandsAllowModerator = false;
let chatCommandsAllowVIP = false;
let chatCommandsAllowSubs = false;
let chatCommandsAllowEveryone = false;

let displayPrevious = true;
let displayCover = true;
let previousPattern, messageCurrent, messagePrevious, messageError;
let client_id, client_secret, access_token, refresh_token;
let account_id, jwt_token;
let expires_at = 0;
let now = 0;
let shoutout;
let chatAutomaticUpdate, chatAutomaticUpdateDelay, shoutoutDone;
let chatCommandLastCallCurrent = 0;
let chatCommandLastCallPrevious = 0;
let chatCommandCallDelay = 0;

let prefixes = {
  artists: "",
  album: ""
}

let track = {
  name: "",
  artists: [],
  album: {
    name: "",
    cover: ""
  },
  progress_ms: 0,
  duration_ms: 0,
  url: ""
};

let previous = {
  name: "",
  artists: [],
  album: {
    name: "",
    cover: ""
  },
  url: ""
};
let spotifyApi;
let updateRefreshRate;
let scrollingDelay, scrollingType;

let el_container, el_cover, el_cover_img, el_song, el_artists, el_album, el_track, el_previous,
  el_progress, el_progressText, el_progressText_current, el_progressBar_current, el_progressText_total;


function refreshInfo() {
  now = Date.now();
  if (now > expires_at) {
    refreshToken();
  } else {
    fetchInfo();
  }
}

function refreshToken() {
  //console.log("Refreshing token...");
  fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + utf8_to_b64(client_id + ':' + client_secret),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=refresh_token&refresh_token=' + refresh_token
  }).then(res => res.json())
  .then(res => {
    access_token = res.access_token;
    //console.log("res.expires_in: ", res.expires_in);
    expires_at = Date.now() + res.expires_in * 1000;
    //console.log("expires_at: ", new Date(expires_at));
    fetchInfo();
  });
}

/* Fetching info from Spotify API */
function fetchInfo() {
  fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: new Headers({
        'Authorization': 'Bearer '+access_token, 
        'Content-Type': 'application/json'
    })
  }).then(res => res.json())
  .then(res => process(res));
}

function process(data) {
  if (data.is_playing) {
    el_container.classList.remove("animateOut");
    if (animateQueueEnabled) {
      el_container.classList.add("animateQueue");
    } else {
      el_container.classList.add("animateIn");
      el_container.style.opacity = 1;
    }
    widgetVisible = true;
    let temp_artists = parseArtists(data.item.artists);
    if (track.artists != temp_artists ||
      track.album.name != data.item.album.name ||
      track.name != data.item.name) {
      previous = JSON.parse(JSON.stringify(track));
      track.artists = temp_artists;
      track.album.name = data.item.album.name;
      track.album.cover = data.item.album.images[0].url;
      track.name = data.item.name;
      track.url = data.item.external_urls.spotify;
      track.duration_ms = data.item.duration_ms;
      updateInfo();
      el_container.classList.remove("animateQueue");
      shoutoutDone = false;
    }
    if (!shoutoutDone) {
      shoutoutTwitch();
    }
    track.progress_ms = data.progress_ms;
    updateProgress();
  } else {
    if (shoutout !== undefined) {
      clearTimeout(shoutout);
      if (track.progress_ms < chatAutomaticUpdateDelay) {
        shoutoutDone = false;
      }
    }
    if (el_container.classList.contains("animateQueue")) {
      el_container.classList.remove("animateQueue");
    }
    if (el_container.classList.contains("animateIn")) {
      el_container.classList.remove("animateIn");
      if (!animateQueueEnabled) {
        el_container.classList.add("animateOut");
      }
      el_container.style.opacity = 0;
      widgetVisible = false;
    }
  }
  setTimeout(refreshInfo, updateRefreshRate);
}

function updateInfo() {
  el_track.innerText = track.name;
  el_artists.innerText = prefixes.artists + track.artists;
  el_album.innerText = prefixes.album + track.album.name;
  el_cover_img.src = track.album.cover + "?t=" + track.name + track.artists;
  el_progressText_total.innerText = timeToString(msToTime(track.duration_ms));
  if (displayPrevious && previous.name.length > 1 && previous.artists.length > 1 && previous.album.name.length > 1) {
    el_previous.innerText = processPattern(previousPattern, previous);
  }
  checkScrolling();
}

function checkScrolling() {
  let scrolling = false;
  let nocover = "";
  for (let el of [el_track, el_artists, el_album]) {
    el.classList.remove(scrollingType);
    el.classList.remove(scrollingType + "-nocover");
    if (!displayCover) nocover = "-nocover";
    if (el.offsetWidth >= el.parentNode.offsetWidth) {
      scrolling = true;
      setTimeout(() => {
        el.classList.add(scrollingType + nocover);
      }, scrollingDelay * 1000);
    }
  }

  if (el_previous.offsetWidth >= el_previous.parentNode.offsetWidth) {
    scrolling = true;
    el_previous.classList.remove(scrollingType + "-nocover");

    setTimeout(() => {
      el_previous.classList.add(scrollingType + "-nocover");
    }, scrollingDelay * 1000);
  }

  checkAnimateQueue(scrolling);
}

function updateProgress() {
  el_progressText_current.innerText = timeToString(msToTime(track.progress_ms));
  el_progressBar_current.style.width = (track.progress_ms / track.duration_ms * 100) + "%";
}

function shoutoutTwitch() {
  if (shoutout !== undefined) {
    clearTimeout(shoutout);
  }
  if (jwt_token !== "" && chatAutomaticUpdate) {
    shoutout = setTimeout(() => {
      sendTwitchMessage(actions.current, track);
    }, chatAutomaticUpdateDelay);
    shoutoutDone = true;
  }
}

/* Sending message to Twitch chat via StreamElements bot */
window.addEventListener('onEventReceived', function (obj) {
  let data = obj.detail.event.data;

  if (jwt_token !== "" && chatCommandsEnabled && obj.detail.listener == "message") {
    let badge = '';
    let message = data["text"].toLowerCase();
    let command = message.split(" ")[0];

    if (data["badges"][0]["type"]) {
      badge = data["badges"][0]["type"];
    }
    if (chatCommandsAllowEveryone || badge === 'broadcaster' || (chatCommandsAllowModerator && badge === 'moderator') || (chatCommandsAllowVIP && badge === 'vip') || (chatCommandsAllowSubs && badge === 'subscriber')) {
      let now = new Date();
      if (commands.current.includes(command)) {
        if (!(badge === 'broadcaster' || badge === 'moderator') && (now - chatCommandLastCallCurrent) < chatCommandCallDelay) return;
        chatCommandLastCallCurrent = now;
        sendTwitchMessage(actions.current, track);
      } else if (commands.previous.includes(command)) {
        if ((now - chatCommandLastCallPrevious) < chatCommandCallDelay) return;
        chatCommandLastCallPrevious = now;
        sendTwitchMessage(actions.previous, previous);
      }
    }
  }
});

async function sendTwitchMessage(which, track) {
  //console.log("sendTwitchMessage");
  let message = "";
  if (track.name.length > 0 && track.artists.length > 0 && track.album.name.length > 0 && track.url.length > 0) {
    if (which == actions.current) {
      message = messageCurrent;
    } else if (which == actions.previous) {
      message = messagePrevious;
    }
    message = processPattern(message, track);
  } else {
    console.log("error: ", track);
    message = messageError;
  }
  //console.log("message :", data);

  await fetch("https://api.streamelements.com/kappa/v2/bot/" + account_id + "/say", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
        'Authorization': "Bearer " + jwt_token
      },
      body: JSON.stringify({ message: message })
    })
    .then(response => response.json())
    /*.then(result => {
      console.log(result)
    })*/
    .catch(err => {
      console.log(err)
    });
}

/* Main process */
function main() {
  client_id = fieldData.client_id;
  client_secret = fieldData.client_secret;
  refresh_token = fieldData.refresh_token;
  account_id = fieldData.account_id;
  jwt_token = fieldData.jwt_token;
  previousPattern = fieldData.previousPattern;
  messageCurrent = fieldData.chatTextCurrent;
  messagePrevious = fieldData.chatTextPrevious;
  messageError = fieldData.chatTextError;
  updateRefreshRate = fieldData.updateRefreshRate < 500 ? 500 : fieldData.updateRefreshRate;
  scrollingDelay = fieldData.scrollingDelay;
  scrollingType = "scrolling-bafslide";
  scrollingDuration = fieldData.scrollingDuration;
  chatCommandsEnabled = parseInt(fieldData.chatCommandsEnabled);
  chatCommandsAllowModerator = fieldData.chatCommandsAllowModerator;
  chatCommandsAllowVIP = fieldData.chatCommandsAllowVIP;
  chatCommandsAllowSubs = fieldData.chatCommandsAllowSubs;
  chatCommandsAllowEveryone = fieldData.chatCommandsAllowEveryone;
  chatAutomaticUpdate = parseInt(fieldData.chatAutomaticUpdate);
  chatAutomaticUpdateDelay = fieldData.chatAutomaticUpdateDelay * 1000;
  chatCommandCallDelay = fieldData.chatCommandCallDelay * 1000;

  commands.current = fieldData.chatCommandCurrent.replace(/\s/g, '').split("|");
  commands.previous = fieldData.chatCommandPrevious.replace(/\s/g, '').split("|");

  prefixes.artists = fieldData.artistsPrefix;
  prefixes.album = fieldData.albumPrefix;

  animateQueueEnabled = parseInt(fieldData.animateQueueEnabled);
  displayPrevious = fieldData.displayPrevious == "flex" ? true : false;
  displayCover = fieldData.displayCover == "flex" ? true : false;
  checkAnimateQueue();

  el_container = document.getElementById("container");
  el_cover = document.getElementById("div-cover");
  el_cover_img = document.getElementById("cover");
  el_song = document.getElementById("div-song");
  el_track = document.getElementById("title");
  el_artists = document.getElementById("artists");
  el_album = document.getElementById("album");
  el_progress = document.getElementById("div-progress");
  el_progressBar_current = document.getElementById("div-progressBar-current");
  el_progressBar_total = document.getElementById("div-progressBar-total");
  el_progressText = document.getElementById("div-progressText");
  el_progressText_current = document.getElementById("progressText-current");
  el_progressText_total = document.getElementById("progressText-total");
  el_previous = document.getElementById("previousText");

  if (fieldData.displayProgressBar == "flex" || fieldData.displayProgressText == "flex") {
    el_progress.style.display = "flex";
  } else {
    el_progress.style.display = "none";
  }
  if (!displayCover) {
    el_song.style.width = "100%";
  }
  if (fieldData.coverHeight == 0) {
    el_cover.style.height = "auto";
  }

  refreshInfo();
}

function checkAnimateQueue(scrolling = false) {
  if (animateQueueEnabled) {
    let stylesheet, animateIn, animateOut, animateInDuration, animateHoldDuration, animateOutDuration;
    animateIn = fieldData.animateIn;
    animateInDuration = fieldData.animateInDuration;
    animateHoldDuration = fieldData.animateHoldDuration;
    if (scrolling && fieldData.animateHoldDuration < (scrollingDuration + scrollingDelay) / 2) {
      animateHoldDuration = (scrollingDuration + scrollingDelay) / 2;
    }
    animateOut = fieldData.animateOut;
    animateOutDuration = fieldData.animateOutDuration;

    stylesheet = document.styleSheets[0];
    let rule = stylesheet.cssRules[stylesheet.cssRules.length - 1];

    rule.style.animation = animateIn + " " + animateInDuration + "s, hold " + animateHoldDuration + "s " + animateInDuration + "s, " + animateOut + " " + animateOutDuration + "s " + (animateHoldDuration + animateInDuration) + "s";
  }
}


/* Button clicked */
window.addEventListener('onEventReceived', function (obj) {
  const data = obj.detail.event;
  if (data.listener === 'widget-button') {
    if (data.field === 'testButton') {
      main();
    }
  }
});

/* Loading from streamelements.com */
window.addEventListener('onWidgetLoad', function (obj) {
  fieldData = obj.detail.fieldData;
  if (fieldData.testMode) {
    return;
  }
  main();
});


/* Start of utils */

function utf8_to_b64(str) {
  return window.btoa(unescape(encodeURIComponent(str)));
}

function parseArtists(artists) {
  let str = "";
  if (artists.length == 1) {
    str = artists[0].name;
  } else {
    for (let i = 0; i < artists.length; ++i) {
      str = str + artists[i].name
      if (i < artists.length - 2) {
        str = str + ", ";
      } else if (i < artists.length - 1) {
        str = str + " & ";
      }
    }
  }
  return str;
}

// https://stackoverflow.com/questions/19700283/how-to-convert-time-in-milliseconds-to-hours-min-sec-format-in-javascript
function msToTime(duration) {
  let time = {};
  time.hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
  time.minutes = Math.floor((duration / (1000 * 60)) % 60);
  time.seconds = Math.floor((duration / 1000) % 60);

  time.hours = (time.hours < 10) ? "0" + time.hours : time.hours;
  time.minutes = (time.minutes < 10) ? "0" + time.minutes : time.minutes;
  time.seconds = (time.seconds < 10) ? "0" + time.seconds : time.seconds;
  return time;
}

function timeToString(time) {
  let timeStr = "";
  if (time.hours > 0) {
    timeStr = time.hours + ":"
  }
  timeStr += time.minutes + ":" + time.seconds;

  return timeStr;
}

function processPattern(message, track) {
  return message.replace(/\[\[track\]\]/g, track.name)
    .replace(/\[\[artists\]\]/g, track.artists)
    .replace(/\[\[album\]\]/g, track.album.name)
    .replace(/\[\[url\]\]/g, track.url);
}

/* End of utils */
