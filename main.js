console.log("start of main.js");
$.getScript("https://raw.githubusercontent.com/JMPerez/spotify-web-api-js/master/src/spotify-web-api.js", function() {
  console.log("Script loaded but not necessarily executed.");
  
  // set it in the wrapper
  console.log("wrapper start");
  var spotifyApi = new SpotifyWebApi();
  spotifyApi.setAccessToken('BQC7b5Eotw8zs3HtjV_ul1APlRnH_R-nIeWjVELDPxvDaImnYzfw-Y7nIoS_Suifsldz8kc9ic6uNt_oyRFjLXE6v9qHg2fin_TpT1tYTqsPFJg3tGLx8nrR_9s97-BXyrfkqFsUUle77snuo6xM2_tkLpOsNtGMZD4');
  spotifyApi.getMyCurrentPlayingTrack()
  .then(function(data) {
    console.log('is_playing', data.is_playing);
    if (data && data.is_playing) {
      console.log('data', data);
      console.log('artists', data.item.artists);
      console.log('album name', data.item.album.name);
      console.log('track name', data.item.name);
    }
  }, function(err) {
    console.error(err);
  });
});