
function utf8_to_b64( str ) {
    return window.btoa(unescape(encodeURIComponent( str )));
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
  