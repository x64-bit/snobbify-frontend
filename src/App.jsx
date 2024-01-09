// import { redirectToAuthCodeFlow, getAccessToken } from './pkce.jsx'
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

    async function handleSubmit(e) {
        // Prevent the browser from reloading the page
        e.preventDefault();
        // // Read the form data
        // const form = e.target;
        // const formData = new FormData(form);
        // // You can pass formData as a fetch body directly:
        // fetch('/some-api', { method: form.method, body: formData });
        // // You can generate a URL out of it, as the browser does by default:
        // console.log(new URLSearchParams(formData).toString());
        // // You can work with it as a plain object.
        // const formJson = Object.fromEntries(formData.entries());
        // console.log(formJson); // (!) This doesn't include multiple select values
        // // Or you can get an array of name-value pairs.
        // console.log([...formData.entries()]);
    }

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
        <div className="text-slate-200 flex min-h-screen">
            <div className='padding m-auto space-y-5'>
                <header>
                    <h1 className='bg-clip-border text-6xl text-white font-extrabold padding py-0'>
                        &gt;snobbify
                    </h1>
                    <h3 className='mt-2 font-medium'>
                        get your garbage music taste roasted by chatgpt {":')"}
                    </h3>
                </header>
                {!loggedIn && (
                    <div className='h-64 w-32'>
                        <a className='bg-stone-800 hover:bg-stone-900 rounded-md px-2.5 py-2.5' 
                            href="http://localhost:8888/login">login to spotify</a>
                    </div>
                )}
                {loggedIn && !responseLoaded && (
                    <div>
                        roast top 5:
                        <br></br>
                        <select className='text-stone bg-stone-600 rounded-md py-1 px-2'>
                            <option value="artists">artists</option>
                            <option value="tracks">tracks</option>
                        </select>
                        <br></br>
                        time period:
                        <br></br>
                        <select className='text-stone bg-stone-600 rounded-md py-1 px-2'>
                            <option value="short-term">4 weeks</option>
                            <option value="medium-term">6 months</option>
                            <option value="long-term">all time</option>
                        </select>
                    </div>
                )}
                {loggedIn && (
                    <button className='bg-stone-800 hover:bg-stone-900 rounded-md px-2.5 py-2.5' 
                        onClick={() => roastArtists()}>generate roast</button>
                )}
                {loggedIn && responseLoaded && (
                    <div className='padding p-4 my-12 max-w-96 flex rounded-md bg-stone-800'>
                        <div className='whitespace-pre font-mono text-wrap'>{"Output: \n> "}{roast}</div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default App