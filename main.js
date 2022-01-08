const actions = {
  current: "current",
  previous: "previous",
};
let fieldData;

var chatCommandsEnabled = false;
let displayPrevious = true;
let displayCover = true;
let previousPattern, messageCurrent, messagePrevious, messageError;
let client_id, client_secret, access_token, refresh_token;
let account_id, jwt_token;
var expires_at = 0;
var now = 0;
let shoutout;
let chatAutomaticUpdate, chatAutomaticUpdateDelay, shoutoutDone;

var track = {
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

var previous = {
  name: "",
  artists: [],
  album: {
    name: "",
    cover: ""
  },
  url: ""
};
var spotifyApi;
var updateRefreshRate;
var scrollingDelay;

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

/* Fetching info from Spotify API */
function fetchInfo() {
  //console.log("fetchInfo");
  let http = new XMLHttpRequest();
  let url = 'https://api.spotify.com/v1/me/player/currently-playing';
  http.open('GET', url);

  //Send the proper header information along with the request
  http.setRequestHeader('Authorization', 'Bearer ' + access_token);
  http.setRequestHeader('Content-Type', 'application/json');

  http.onload = function () { //Call a function when the state changes.
    if (http.readyState === 4) {
      let data = null;
      try {
        data = http.responseText ? JSON.parse(http.responseText) : '';
      } catch (e) {
        console.error(e);
      }

      if (http.status == 200) {
        process(data);
      }
    }
  }
  http.send();
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
  el_artists.innerText = track.artists;
  el_album.innerText = track.album.name;
  el_cover_img.src = track.album.cover + "?t=" + track.name + track.artists;
  el_progressText_total.innerText = msToTime(track.duration_ms);
  if (displayPrevious && previous.name.length > 1 && previous.artists.length > 1 && previous.album.name.length > 1) {
    //el_previous.innerText = previous.name + " - " + previous.artists;
    el_previous.innerText = processPattern(previousPattern, previous);
  }
  checkScrolling();
}

function checkScrolling() {
  for (let el of [el_track, el_artists, el_album, el_previous]) {
    el.classList.remove("scrolling");
    if (el.offsetWidth >= el.parentNode.offsetWidth) {
      setTimeout(() => {
        el.classList.add("scrolling");
      }, scrollingDelay);
    }
  }
}

function updateProgress() {
  el_progressText_current.innerText = msToTime(track.progress_ms);
  el_progressBar_current.style.width = (track.progress_ms / track.duration_ms * 100) + "%";
}

function shoutoutTwitch() {
  if (shoutout !== undefined) {
    clearTimeout(shoutout);
  }
  if (chatAutomaticUpdate) {
    shoutout = setTimeout(() => {
      sendTwitchMessage(actions.current, track);
    }, chatAutomaticUpdateDelay);
    shoutoutDone = true;
  }
}

function refreshToken() {
  //console.log("refreshing token...");
  var http = new XMLHttpRequest();
  var url = 'https://accounts.spotify.com/api/token';
  var params = 'grant_type=refresh_token&refresh_token=' + refresh_token;
  http.open('POST', url, true);

  //Send the proper header information along with the request
  http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

  var auth_string = 'Basic ' + utf8_to_b64(client_id + ':' + client_secret);
  http.setRequestHeader('Authorization', auth_string);

  http.onreadystatechange = function () { //Call a function when the state changes.
    if (http.readyState == 4 && http.status == 200) {
      let res = JSON.parse(http.responseText);
      access_token = res.access_token;
      expires_at = Date.now() + res.expires_in * 1000;
      //console.log("expires_at: ", expires_at);
      fetchInfo();
    }
  }
  http.send(params);
}


/* Sending message to Twitch chat via StreamElements bot */
window.addEventListener('onEventReceived', function (obj) {
  let data = obj.detail.event.data;

  if (chatCommandsEnabled && obj.detail.listener == "message") {
    var badge = '';
    let message = data["text"].toLowerCase();
    var command = message.split(" ")[0];

    if (data["badges"][0]["type"]) {
      badge = data["badges"][0]["type"];
    }
    if (badge === 'moderator' || badge === 'broadcaster') {
      if (command == "{{chatCommandCurrent}}") {
        sendTwitchMessage(actions.current, track);
      } else if (command == "{{chatCommandPrevious}}") {
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
  var data = {
    message: message
  };
  //console.log("message :", data);

  await fetch("https://api.streamelements.com/kappa/v2/bot/" + account_id + "/say", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
        'Authorization': "Bearer " + jwt_token
      },
      body: JSON.stringify(data)
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
  chatCommandsEnabled = parseInt(fieldData.chatCommandsEnabled);
  chatAutomaticUpdate = parseInt(fieldData.chatAutomaticUpdate);
  chatAutomaticUpdateDelay = parseInt(fieldData.chatAutomaticUpdateDelay);
  animateQueueEnabled = parseInt(fieldData.animateQueueEnabled);
  if (animateQueueEnabled) {
    let stylesheet, animateIn, animateOut, animateInDuration, animateHoldDuration, animateOutDuration;
    animateIn = fieldData.animateIn;
    animateInDuration = fieldData.animateInDuration;
    animateHoldDuration = fieldData.animateHoldDuration;
    animateOut = fieldData.animateOut;
    animateOutDuration = fieldData.animateOutDuration;

    stylesheet = document.styleSheets[0];
    let rule = stylesheet.cssRules[stylesheet.cssRules.length - 1];

    rule.style.animation = animateIn + " " + animateInDuration + "s, hold " + animateHoldDuration + "s " + animateInDuration + "s, " + animateOut + " " + animateOutDuration + "s " + (animateHoldDuration + animateInDuration) + "s";
  }
  displayPrevious = fieldData.displayPrevious == "flex" ? true : false;
  displayCover = fieldData.displayCover == "flex" ? true : false;


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
  var str = "";
  if (artists.length == 1) {
    str = artists[0].name;
  } else {
    for (var i = 0; i < artists.length; ++i) {
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
  var seconds = Math.floor((duration / 1000) % 60),
    minutes = Math.floor((duration / (1000 * 60)) % 60),
    hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

  hours = (hours < 10) ? "0" + hours : hours;
  minutes = (minutes < 10) ? "0" + minutes : minutes;
  seconds = (seconds < 10) ? "0" + seconds : seconds;

  let time = "";
  if (hours > 0) {
    time = hours + ":"
  }
  time = minutes + ":" + seconds;

  return time;
}

function processPattern(message, track) {
  return message.replace(/\[\[track\]\]/g, track.name)
    .replace(/\[\[artists\]\]/g, track.artists)
    .replace(/\[\[album\]\]/g, track.album.name)
    .replace(/\[\[url\]\]/g, track.url);
}

/* End of utils */


/* Loading from local env *
$(document).ready(function() {
  $.getJSON('./config.json', function (response) {
    updateRefreshRate = response.updateRefreshRate;
    client_id = response.spotify.client_id;
    client_secret = response.spotify.client_secret;
    access_token = response.spotify.access_token;
    refresh_token = response.spotify.refresh_token;
    account_id = response.streamelements.account_id;
    jwt_token = response.streamelements.jwt_token;
  }).fail(function () {
    console.log("An error has occurred while loading config.json file.");
  }).then(main());
});
* */