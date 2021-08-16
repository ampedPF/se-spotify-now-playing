console.log("start of main.js");

var config = "";
let client_id, client_secret, access_token, refresh_token;
var expires_at = 0;
var now = 0;

var track = {
  name: "",
  artists: [],
  album: {
    name: "",
    cover: ""
  },
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

let el_artist, el_album, el_track, el_previous;

function refreshInfo() {
  now = Date.now();
  if(now > expires_at) {
    refreshToken();
  } else {
    fetchInfo();
  }
}

function fetchInfo() {
  // set it in the wrapper
  //console.log("fetching info...");
  spotifyApi.setAccessToken(access_token);
  spotifyApi.getMyCurrentPlayingTrack()
  .then(function(data) {
    if (data && data.is_playing) {
      // console.log('data', data);
      let temp_artists = parseArtists(data.item.artists);
      if(track.artists != temp_artists
        || track.album.name != data.item.album.name
        || track.name != data.item.name) {
        previous = { ...track };
        track.artists = temp_artists;
        track.album.name = data.item.album.name;
        track.album.cover = data.item.album.images[0].url;
        track.name = data.item.name;
        track.url = data.item.external_urls.spotify;
        console.log(track);
        updateInfo();
      }
    }
    setTimeout(refreshInfo(), 1000);
  }, function(err) {
    console.error(err);
  });
}

function updateInfo() {
  el_artist.innerText = track.artists;
  el_album.innerText = track.album.name;
  el_track.innerText = track.name;
  el_previous.innerText = previous.name + " - " + previous.artists;
}

function refreshToken() {
  console.log("refreshing token...")
  var http = new XMLHttpRequest();
  var url = 'https://accounts.spotify.com/api/token';
  var params = 'grant_type=refresh_token&refresh_token=' + refresh_token;
  http.open('POST', url, true);

  //Send the proper header information along with the request
  http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
  
  var auth_string = 'Basic ' + utf8_to_b64(client_id + ':' + client_secret);
  http.setRequestHeader('Authorization', auth_string);

  http.onreadystatechange = function() {//Call a function when the state changes.
      if(http.readyState == 4 && http.status == 200) {
          let res = JSON.parse(http.responseText);
          access_token = res.access_token;
          expires_at = Date.now() + res.expires_in * 1000;
          // console.log("response: ", access_token);
          fetchInfo();
      }
  }
  http.send(params);
}

function main() {
  el_artist = document.getElementById("artist"); 
  el_album = document.getElementById("album");
  el_track = document.getElementById("track");
  el_previous = document.getElementById("previous");
  $.getScript('https://ampedpf.github.io/spotify-now-playing/utils.js', function () {
    console.log("utils.js loaded successfully.");
  }).fail(function () {
    console.log("An error has occurred while loading utils.js file.");
  }).then(function () {
    $.getScript("https://ampedpf.github.io/spotify-now-playing/spotify-web-api.js", function() {
      console.log("spotify-web-api.js loaded successfully.");
      spotifyApi = new SpotifyWebApi();
      refreshInfo();
    }).fail(function () {
      console.log("An error has occurred while loading spotify-web-api.js file.");
    });
  });
}


window.addEventListener('onWidgetLoad', function (obj) {
  console.log("onWidgetLoad");
  const fieldData = obj.detail.fieldData;
  client_id = fieldData.client_id;
  client_secret = fieldData.client_secret;
  access_token = fieldData.access_token;
  refresh_token = fieldData.refresh_token;
  //console.log("refresh token:", refresh_token);
  main();
});

$(document).ready(function() {
  $.getJSON('./config.json', function (response) {
    // config = response;
    client_id = response.spotify.client_id;
    client_secret = response.spotify.client_secret;
    access_token = response.spotify.access_token;
    refresh_token = response.spotify.refresh_token;
  }).fail(function () {
    console.log("An error has occurred while loading config.json file.");
  }).then(main());
});