var redirect_uri = "https://ampedpf.github.io/spotify-now-playing/web-auth/";
var localStorage = window.localStorage;
let client_id = "", client_secret = "", code = "", scope = "";
let el_clientId, el_clientSecret, el_scope, el_error, el_accessToken, el_refreshToken;

function login() {
    client_id = el_clientId.value;
    localStorage.setItem("client_id", client_id);
    client_secret = el_clientSecret.value;
    localStorage.setItem("client_secret", client_secret);

    scope = el_scope.value;
    localStorage.setItem("scope", scope);
    window.location.href = 'https://accounts.spotify.com/authorize?response_type=code&client_id=' + client_id + '&scope=' + scope.replace(' ', '%20') + '&redirect_uri=' + redirect_uri;
}

function getTokens() {
    var http = new XMLHttpRequest();
    var url = 'https://accounts.spotify.com/api/token';
    var params = 'grant_type=authorization_code&code=' + code + '&redirect_uri=' + redirect_uri;
    http.open('POST', url, true);
    
    //Send the proper header information along with the request
    http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    
    var auth_string = 'Basic ' + utf8_to_b64(client_id + ':' + client_secret);
    // console.log("auth_string :", auth_string);
    http.setRequestHeader('Authorization', auth_string);
    
    http.onreadystatechange = function() {//Call a function when the state changes.
        if(http.readyState == 4) {
            let res = JSON.parse(http.responseText);
            if (http.status == 200) {
                // console.log(res);
                el_accessToken.value = res.access_token;
                el_accessToken.classList.add("has-value");
                el_refreshToken.value = res.refresh_token;
                el_refreshToken.classList.add("has-value");
            } else {
                //console.log(res);
                if(res.error_description !== null) {
                    el_error.innerText = "Error : " + res.error_description;
                    el_error.classList.add('.has-error');
                }
            }
        }
    }
    http.send(params);
}

function clearCache() {
    localStorage.clear();
    window.location.href = redirect_uri;
}

function toggleModal() {
    parseScope();
    document.getElementById("modal-1").checked = true;
}

function listCheckboxes() {
    var els = document.getElementsByClassName('scope-cb');
    //console.log("els :", els);
    scope = "";
    for (let i = 0; i < els.length; i++) {
        if(els[i].checked){
            //console.log("checked :", els[i].id);
            scope += els[i].id + " ";
        }
    }
    scope = scope.trim();
    localStorage.setItem("scope", scope);
    el_scope.value = scope;

    document.getElementById("modal-1").checked = false;
}

function uncheckAll() {
    var els = document.getElementsByClassName('scope-cb');
    for (let i = 0; i < els.length; i++) {
        els[i].checked = false;
    }
}

function parseScope() {
    var scope_arr = scope.split(" ");
    //console.log(scope_arr);
    for (let i = 0; i < scope_arr.length; i++) {
        if(scope_arr[i] !== null && scope_arr[i].length > 0) {
            document.getElementById(scope_arr[i]).checked = true;
        }
    }

}

function copyToClipboard(elem) {
    var element = document.getElementById(elem);
    /* Select the text field */
    element.select();
    element.setSelectionRange(0, 99999); /* For mobile devices */
  
     /* Copy the text inside the text field */
    navigator.clipboard.writeText(element.value);
    element.setSelectionRange(0, 0);
}

function utf8_to_b64( str ) {
    return window.btoa(unescape(encodeURIComponent( str )));
}

window.addEventListener("load", function(){
    el_clientId = document.getElementById("client-id");
    el_clientSecret = document.getElementById("client-secret");
    el_scope = document.getElementById("scope");
    el_error = document.getElementById("error");
    el_accessToken = document.getElementById("access-token");
    el_refreshToken = document.getElementById("refresh-token");

    let params = (new URL(document.location)).searchParams;
    code = params.get("code");
    // console.log("code:", code);
    if (localStorage.getItem("client_id") !== null) {
        client_id = localStorage.getItem("client_id");
        el_clientId.value = client_id;
    }
    if (localStorage.getItem("client_secret") !== null) {
        client_secret = localStorage.getItem("client_secret");
        el_clientSecret.value = client_secret;
    }
    if (localStorage.getItem("scope") !== null) {
        scope = localStorage.getItem("scope");
        el_scope.value = scope;
    }

    if (code !== null && client_id !== null && client_secret !== null ) {
        getTokens();
    }
});