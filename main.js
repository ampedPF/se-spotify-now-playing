console.log("start of main.js");

var config = "";
var expires_at = 0;
var now = 0;

var track = {
  name: "",
  artists: [],
  album: {
    name: "",
    cover: ""
  }
};
// var artists = "";
// var album = "";
var spotifyApi;

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
  console.log("fetching info...");
  // console.log(now, "|", expires_at);
  spotifyApi.setAccessToken(config.spotify.access_token);
  spotifyApi.getMyCurrentPlayingTrack()
  .then(function(data) {
    // console.log('is_playing', data.is_playing);
    if (data && data.is_playing) {
      // console.log('data', data);
      let temp_artists = parseArtists(data.item.artists);
      if(track.artists != temp_artists
        || track.album.name != data.item.album.name
        || track.album.cover != data.item.album.cover
        || track.name != data.item.name) {
        console.log('artists:', parseArtists(data.item.artists));
        track.artists = temp_artists;
        console.log('album:', data.item.album.name);
        track.album.name = data.item.album.name;
        console.log('cover:', data.item.album.cover);
        track.album.cover = data.item.album.cover;
        console.log('track:', data.item.name);
        track.name = data.item.name;
      }
    }
    setTimeout(refreshInfo(), 1000);
  }, function(err) {
    console.error(err);
  });
}

function refreshToken() {
  console.log("refreshing token...")
  var http = new XMLHttpRequest();
  var url = 'https://accounts.spotify.com/api/token';
  var params = 'grant_type=refresh_token&refresh_token=' + config.spotify.refresh_token;
  http.open('POST', url, true);

  //Send the proper header information along with the request
  http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
  
  var auth_string = 'Basic ' + utf8_to_b64(config.spotify.client_id + ':' + config.spotify.client_secret);
  http.setRequestHeader('Authorization', auth_string);

  http.onreadystatechange = function() {//Call a function when the state changes.
      if(http.readyState == 4 && http.status == 200) {
          let res = JSON.parse(http.responseText);
          config.spotify.access_token = res.access_token;
          expires_at = Date.now() + res.expires_in * 1000;
          // console.log("response: ", access_token);
          fetchInfo();
      }
  }
  http.send(params);
}

function main() {
  $.getJSON('./config.json', function (response) {
    config = response;
  }).fail(function () {
    console.log("An error has occurred while loading config.json file.");
  }).then(function () {
    $.getScript('https://ampedpf.github.io/spotify-now-playing/utils.js', function () {
      console.log("utils.js loaded successfully.");
    }).fail(function () {
      console.log("An error has occurred while loading utils.js file.");
    }).then(function () {
      $.getScript("https://ampedpf.github.io/spotify-now-playing/spotify-web-api.js", function() {
        console.log("Script loaded but not necessarily executed.");
        spotifyApi = new SpotifyWebApi();
        refreshInfo();
      }).fail(function () {
        console.log("An error has occurred while loading spotify-web-api.js file.");
      });
    });
  });
}

$(document).ready(main);