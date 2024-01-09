// import { redirectToAuthCodeFlow, getAccessToken } from './pkce.jsx'
import React, { useState, useEffect } from 'react';
import SpotifyWebApi from "spotify-web-api-js";
import 'axios';

const BACKEND_ROUTE = "https://snobbify-backend.onrender.com"
const FRONTEND_ROUTE = "https://snobbify.onrender.com";

const spotifyApi = new SpotifyWebApi();

const LoadingState = {
    INPUT: 1,
    LOADING: 2,
    OUTPUT: 3
};
Object.freeze(LoadingState);

function getTokenFromUrl() {
    let access_token = new URLSearchParams(window.location.hash.substring(1)).get("access_token");
    history.pushState("", document.title, window.location.pathname
                                                       + window.location.search);
    return access_token
}

function Header() {
    return (
        <header>
            <h1 className='bg-clip-border text-6xl text-white font-extrabold padding py-0'>
                &gt;snobbify
            </h1>
            <h3 className='mt-2 text-xl font-semibold'>
                get your garbage music taste roasted by chatgpt
            </h3>
        </header>
    )
}

function LoadingPopup() {
    return (
        <div className='padding p-4 my-12 max-w-128 rounded-md bg-stone-800 whitespace-pre font-mono'>
            loading...
            <img src="wojak.jpeg" className='animate-pulse object-contain w-128 rounded-md p-4'></img>
        </div>
        
    )
}

function RoastParams ({ handleSubmit }) {
    return (
        <form onSubmit={handleSubmit}>
            roast top 5:
            <br></br>
            <select name='roast_type' className='text-stone bg-stone-700 rounded-md py-1 px-2'>
                <option value="artists">artists</option>
                <option value="tracks">tracks</option>
            </select>
            <br></br>
            time period:
            <br></br>
            <select name='roast_period' className='text-stone bg-stone-700 rounded-md py-1 px-2'>
                <option value="short_term">4 weeks</option>
                <option value="medium_term">6 months</option>
                <option value="long_term">all time</option>
            </select>
            <br></br>
            <button className='bg-stone-800 hover:bg-stone-900 rounded-md my-4 px-2.5 py-2.5'
                type='submit'>generate roast</button>
        </form>
    )
}

function App() {
    // states: {input, loading, output}
    // i know it's jank but i just want to get this done at this point lmao
    const [responseState, setResponseState] = useState(LoadingState.INPUT);
    const [roast, setRoast] = useState("");
    const [loggedIn, setLoggedIn] = useState(false);

    useEffect (() => {
        const newSpotifyToken = getTokenFromUrl();
        if (newSpotifyToken) {
            spotifyApi.setAccessToken(newSpotifyToken);
            setLoggedIn(true);
            console.log("Logged in");
        }
    }, [])

    async function handleSubmit(e) {
        // Prevent the browser from reloading the page
        e.preventDefault();

        // Read the form data
        const form = e.target;
        const formData = new FormData(form);
        
        const formJson = Object.fromEntries(formData.entries());
        if (formJson.roast_type == "artists") {
            await roastArtists(formJson.roast_period);
        } else if (formJson.roast_type == "tracks") {
            await roastTracks(formJson.roast_period);
        }
    }

    async function roastTracks(time_range) {
        console.log("roast tracks:", time_range);
        setResponseState(LoadingState.LOADING);
    
        spotifyApi.getMyTopTracks({ limit: 5 , time_range: time_range})
            .then(function(response) {
                let topTracks = {}
                for (let i = 0; i < response.items.length; i++) {
                    let artists = [];
                    for (let j = 0; j < response.items[i].artists.length; j++) {
                        artists.push(response.items[i].artists[j].name);
                    }
                    let artistsStr = artists.join(", ");
                    topTracks[artistsStr] = response.items[i].name;
                }
                return topTracks;
            }, function(err) {
                console.log('Something went wrong!', err);
                setResponseState(LoadingState.INPUT);
            })
            .then(async (topTracks) => {
                // proxy request to backend to ask for chatGPT output
                console.log("[roastTracks()] fetching gptResponse")
                const myHeaders = new Headers()
                myHeaders.append('content-type', 'application/json');
                myHeaders.append('Access-Control-Allow-Origin', FRONTEND_ROUTE);
                // myHeaders.append('Access-Control-Allow-Credentials', 'true');
                const gptResponse = await fetch(BACKEND_ROUTE + "/roastTracks", {
                    method: "POST",
                    headers: myHeaders,
                    body: JSON.stringify(topTracks)
                })
                return gptResponse;
            }, function(err) {
                console.log('Something went wrong!', err);
                setResponseState(LoadingState.INPUT);
            })
            .then((res) => res.json())
            .then(async (gptJson) => {
                let gptRoast = gptJson.gpt_response;
                setResponseState(LoadingState.OUTPUT);
                setRoast(gptRoast.message.content);
            }, function(err) {
                console.log('Something went wrong!', err);
                setResponseState(LoadingState.INPUT);
            });
    }

    async function roastArtists(time_range) {
        console.log("roast artists:", time_range);
        setResponseState(LoadingState.LOADING);
    
        // not sure if i did this right lol
        spotifyApi.getMyTopArtists({ limit: 5, time_range: time_range })
            .then((response) => {
                let topArtists = []
                for (let i = 0; i < response.items.length; i++) {
                    topArtists.push(response.items[i].name);
                }
                return topArtists;
            }, function(err) {
                console.log('Something went wrong!', err);
                setResponseState(LoadingState.INPUT);
            })
            .then(async (topArtists) => {
                // proxy request to backend to ask for chatGPT output
                console.log("[generateRoast()] fetching gptResponse")
                const gptResponse = await fetch(BACKEND_ROUTE + "/roastArtists", {
                    method: "POST",
                    headers: {'content-type' : 'application/json'},
                    body: JSON.stringify({"topArtists" : topArtists})
                })
                return gptResponse;
            }, function(err) {
                console.log('Something went wrong!', err);
                setResponseState(LoadingState.INPUT);
            })
            .then((res) => res.json())
            .then(async (gptJson) => {
                let gptRoast = gptJson.gpt_response;
                setResponseState(LoadingState.OUTPUT);
                setRoast(gptRoast.message.content);
            }, function(err) {
                console.log('Something went wrong!', err);
                setResponseState(LoadingState.INPUT);
            })
    }

    return (
        <div className="text-slate-200 text-pretty flex min-h-screen">
            <div className='padding mx-auto my-40 space-y-5'>
                <Header></Header>
                {!loggedIn && (
                    <div className='h-64 w-32'>
                        <a className='bg-stone-800 hover:bg-stone-900 rounded-md px-2.5 py-2.5' 
                            href={BACKEND_ROUTE+"/login"}>login to spotify</a>
                    </div>
                )}
                {loggedIn && (responseState === LoadingState.INPUT) && (
                    <RoastParams handleSubmit={handleSubmit}></RoastParams>
                )}
                {loggedIn && (responseState === LoadingState.LOADING) && (
                    <LoadingPopup></LoadingPopup>
                )}
                {loggedIn && (responseState === LoadingState.OUTPUT) && (
                    <div>
                        <button className='bg-stone-800 hover:bg-stone-900 rounded-md px-2.5 py-2.5' 
                            onClick={() => setResponseState(LoadingState.INPUT)}>roast again</button>
                        <div className='padding p-4 my-12 max-w-128 flex rounded-md bg-stone-800 whitespace-pre font-mono text-pretty'>{"Output: \n> "}{roast}</div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default App