import { redirectToAuthCodeFlow, getAccessToken } from './pkce.jsx'
import React, { useState, useEffect } from 'react';
import SpotifyWebApi from "spotify-web-api-js";
import 'axios';
import Cookies from 'js-cookie';
import OpenAI from "openai";

const BACKEND_ROUTE = "http://localhost:8888"

const spotifyApi = new SpotifyWebApi();

function getTokenFromUrl() {
    return new URLSearchParams(window.location.hash.substring(1)).get("access_token");
};

async function getNowPlaying() {
    console.log("getNowPlaying")
    spotifyApi.getMyCurrentPlaybackState().then((response) => {
        console.log("response:", response.body);
        setNowPlaying({
            name : response.item.name,
            albumArt: response.item.album.images[0].url
        })
    })
}

async function proxyGetPlaying() {
    let accessToken = Cookies.get('token');
    console.log("[proxyGetPlaying] access token:", accessToken);
    console.log("huh?");

    const result = await fetch(BACKEND_ROUTE + "/getPlaying", {
        method: "GET",
        headers: { 'Authorization': `Bearer ${accessToken}`}
    });
    
    console.log("what?");
    const data = await result.json();
    console.log(data);

    // const { access_token } = await result.json();
    setNowPlaying({
        name : data.name,
        albumArt: data.album_art
    });
}

function App() {
    // const [userData, setUserData] = useState();
    // TODO: VERY NOT SAFE DO NOT STORE TOKEN IN STATE
    // const [spotifyToken, setSpotifyToken] = useState("");
    const [nowPlaying, setNowPlaying] = useState({});
    const [responseLoaded, setResponseLoaded] = useState(false);
    const [roast, setRoast] = useState("");
    const [loggedIn, setLoggedIn] = useState(false);

    useEffect (() => {
        console.log("This is what we derived from the url: ");
        console.log(window.location.hash);
        const newSpotifyToken = getTokenFromUrl();
        // history.pushState("", document.title, window.location.pathname
        //                                                + window.location.search);
        console.log("This is our spotify token", newSpotifyToken);
        if (newSpotifyToken) {
            // additional param: expires: 7 (days)
            // TODO: how the hell do you use token
            Cookies.set('token', newSpotifyToken, { secure: true });
            // setSpotifyToken(newSpotifyToken);
            spotifyApi.setAccessToken(newSpotifyToken);
            spotifyApi.getMe().then((user) => {
                console.log(user);
            })
            setLoggedIn(true);
        }
        console.log("cookie token:", Cookies.get('token'));
    }, [])

    async function roastTracks() {
        // console.log("getNowPlaying")
    
        // not sure if i did this right lol
        spotifyApi.getMyTopTracks({ limit: 5 })
            .then(function(response) {
                // let topTracks = []
                let topTracks = {}
                for (let i = 0; i < response.items.length; i++) {
                    let artists = [];
                    for (let j = 0; j < response.items[i].artists.length; j++) {
                        // console.log(response.items[i].artists[j]);
                        artists.push(response.items[i].artists[j].name);
                    }
                    let artistsStr = artists.join(", ");
                    topTracks[artistsStr] = response.items[i].name;
                }
                console.log(topTracks);
                return topTracks;
            }, function(err) {
                console.log('Something went wrong!', err);
            })
            .then(async (topTracks) => {
                console.log("[roastTracks()] fetching gptResponse")
                const gptResponse = await fetch(BACKEND_ROUTE + "/roastTracks", {
                    method: "POST",
                    headers: {'content-type' : 'application/json'},
                    body: JSON.stringify(topTracks)
                })
                console.log("gptResponse:", gptResponse);
                return gptResponse;
            })
            .then((res) => res.json())
            .then(async (gptJson) => {
                let gptRoast = gptJson.gpt_response;
                setResponseLoaded(true);
                setRoast(gptRoast.message.content);
                console.log(gptRoast.message.content);
            });
    }

    async function roastArtists() {
        // console.log("getNowPlaying")
    
        // not sure if i did this right lol
        spotifyApi.getMyTopArtists({ limit: 5 })
            .then((response) => {
                let topArtists = []
                for (let i = 0; i < response.items.length; i++) {
                    topArtists.push(response.items[i].name);
                }
                return topArtists;
            }, function(err) {
                console.log('Something went wrong!', err);
            })
            .then(async (topArtists) => {
                console.log("[generateRoast()] fetching gptResponse")
                const gptResponse = await fetch(BACKEND_ROUTE + "/roastArtists", {
                    method: "POST",
                    headers: {'content-type' : 'application/json'},
                    body: JSON.stringify({"topArtists" : topArtists})
                })
                console.log("gptResponse:", gptResponse);
                return gptResponse;
            })
            .then(async (res) => {
                return await res.json();
            })
            .then(async (gptJson) => {
                let gptRoast = gptJson.gpt_response;
                setResponseLoaded(true);
                setRoast(gptRoast.message.content);
                console.log(gptRoast.message.content);
            });
    }

    return (
        <div className='app'>
            <header className='app-header'>
                <h1>&gt;snobbify</h1>
                <h3>
                    get your garbage music taste roasted by chatgpt
                </h3>
                {!loggedIn && <a href="http://localhost:8888/login">login to spotify</a>}
                {loggedIn && (
                    <button onClick={() => roastTracks()}>Generate Roast</button>
                )}
                {loggedIn && responseLoaded && (
                    <div>{roast}</div>
                )}
            </header>
        </div>
    )
}

export default App