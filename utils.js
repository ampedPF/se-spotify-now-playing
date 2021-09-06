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