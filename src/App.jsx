import { redirectToAuthCodeFlow, getAccessToken } from './pkce.jsx'
import React, { useState, useEffect } from 'react';
import SpotifyWebApi from "spotify-web-api-js";
import 'axios';

// const CLIENT_ID = "6a8265b38a5f4cde8f00f1e9a0550461"; // Replace with your client ID
// const REDIRECT_URI = "http://localhost:5173/callback"
// const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize"
// const RESPONSE_TYPE = "token"

const BACKEND_ROUTE = "http://localhost:8888"

const spotifyApi = new SpotifyWebApi();

// const params = new URLSearchParams();
// params.append("client_id", CLIENT_ID);
// params.append("response_type", RESPONSE_TYPE);
// params.append("redirect_uri", REDIRECT_URI);

function getTokenFromUrl() {
    // return window.location.hash
    //     .substring(1)
    //     .split("&")
    //     .reduce((initial, item) => {
    //         let parts =k item.split("=");
    //         initial[parts[0]] = decodeURIComponent(parts[1]);
    //         return initial;
    //     }, {});
    return new URLSearchParams(window.location.hash.substring(1)).get("access_token");
};

async function newGetPlaying({ accessToken, setNowPlaying }) {
    console.log(`newGetPlaying; accessToken=${accessToken}`)

    const result = await fetch(BACKEND_ROUTE + "/getPlaying", {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}`}
    });

    // const { access_token } = await result.json();
    setNowPlaying({
        name : result.name,
        albumArt: result.album_art
    });
}

function App() {
    // const [userData, setUserData] = useState();
    // TODO: VERY NOT SAFE DO NOT STORE TOKEN IN STATE
    const [spotifyToken, setSpotifyToken] = useState("");
    const [nowPlaying, setNowPlaying] = useState({});
    const [loggedIn, setLoggedIn] = useState(false);

    useEffect (() => {
        console.log("This is what we derived from the url: ");
        console.log(window.location.hash);
        const newSpotifyToken = getTokenFromUrl();
        // history.pushState("", document.title, window.location.pathname
        //                                                + window.location.search);
        console.log("This is our spotify token", newSpotifyToken);
        if (newSpotifyToken) {
            setSpotifyToken(newSpotifyToken);
            spotifyApi.setAccessToken(newSpotifyToken);
            spotifyApi.getMe().then((user) => {
                console.log(user);
            })
            setLoggedIn(true);
        }
        console.log("state token:", spotifyToken);
    }, [])

    const getNowPlaying = () => {
        spotifyApi.getMyCurrentPlaybackState().then((response) => {
            console.log(response);
            setNowPlaying({
                name : response.item.name,
                albumArt: response.item.album.images[0].url
            })
        })
    }

    return (
        <div className='app'>
            <header className='app-header'>
                <h1>Spotify with React</h1>
                {!loggedIn && <a href="http://localhost:8888/login">login to spotify</a>}
                {loggedIn && (
                    <>
                        <div>Now Playing: {nowPlaying.name}</div>
                        <div>
                            <img src={nowPlaying.albumArt} style={{height: 150}}/>
                        </div>
                    </>
                )}
                {loggedIn && (
                    <button onClick={() => newGetPlaying(spotifyToken, setNowPlaying)}>Check Now Playing</button>
                )}
            </header>
        </div>
    )
}

export default App