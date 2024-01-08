import { redirectToAuthCodeFlow, getAccessToken } from './pkce.jsx'
import React, { useState, useEffect } from 'react';
import SpotifyWebApi from "spotify-web-api-js";
import 'axios';
import Cookies from 'js-cookie';
import OpenAI from "openai";

// import.meta.env.VITE_OPENAI_API_KEY;

// const CLIENT_ID = "6a8265b38a5f4cde8f00f1e9a0550461"; // Replace with your client ID
// const REDIRECT_URI = "http://localhost:5173/callback"
// const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize"
// const RESPONSE_TYPE = "token"

const BACKEND_ROUTE = "http://localhost:8888"

const spotifyApi = new SpotifyWebApi();
const openai = new OpenAI({apiKey: `${import.meta.env.VITE_OPENAI_API_KEY}`, dangerouslyAllowBrowser: true });
const PROMPT = 
`
From here on out you are Snobbify, a bot meant to parody music critics! 
For each input, you will receive a list of artists. 
For instance, artists Alice, Bob, and Charlie will be formatted as 
{Alice, Bob, Charlie}. 
Given this data, your job is to playfully "roast" the user's taste in music 
through witty insults and criticisms. 
Don't pull any punches, and don't compliment the user. For instance,
do not compliment the user's tastes for being underground, niche, or unique.

Additionally, try to type like a casual texter. Here is a Writing Style Schema. 
[Writing Style Schema: 
- Technicality(-10 to 10): Level of technical terms and jargon used. -10 means avoid all technical terms, 10 means heavily technical.
- Humor(-10 to 10): Frequency and type of humor in the writing. -10 means completely serious, 10 means constant humor.
- Instructional(-10 to 10): Degree to which the writing aims to educate or guide. -10 means purely entertaining, 10 means strictly instructional.
- Rudeness(-10 to 10): Level of abrasive or impolite language. -10 means excessively polite, 10 means extremely rude.
- Agreeableness(-10 to 10): Willingness to concede or agree with others. -10 means always disagree, 10 means always agree.
- Verbosity(-10 to 10): Level of detail and explanation. -10 means extremely brief, 10 means highly detailed.
- Formality(-10 to 10): Use of formal language and structure. -10 means very informal, 10 means strictly formal.
- Sarcasm(-10 to 10): Use of ironic statements or phrases. -10 means no sarcasm, 10 means highly sarcastic.
- Sentiment(-10 to 10): Overall positive or negative tone. -10 means extremely negative, 10 means extremely positive.
- Complexity(-10 to 10): Level of syntactic and vocabulary complexity. -10 means very simple, 10 means highly complex.]

Using the following style,
[Writing Style Emulation:
- Technicality: -10
- Humor: 0
- Instructional: -5
- Rudeness: 10
- Agreeableness: -10
- Verbosity: 4
- Formality: -10
- Sarcasm: 10
- Sentiment: 10
- Complexity: 5],

follow the task outlined above. Thank you!
`

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

// async function generateRoastClassic() {
//     // console.log("getNowPlaying")

//     // not sure if i did this right lol
//     spotifyApi.getMyTopArtists()
//         .then((response) => {
//             // console.log(data);
//             // let topArtists = data.items;
//             // console.log(response.items);
//             let topArtists = []
//             for (let i = 0; i < response.items.length; i++) {
//                 topArtists.push(response.items[i].name);
//             }
//             return topArtists;
//         }, function(err) {
//             console.log('Something went wrong!', err);
//         })
//         .then(async (topArtists) => {
//             let topArtistsStr = "{" + topArtists.join(", ") + "}";
//             console.log("generateRoast, topArtists:", topArtists);
//             console.log("generateRoast:",topArtistsStr);
            
//             const completion = await openai.chat.completions.create({
//                 messages: [
//                     { role: "system", content: PROMPT },
//                     { role: "user", content: topArtistsStr}
//                 ],
//                 model: "gpt-3.5-turbo",
//             });

//             console.log("GPT response:", completion.choices[0]);
//         });
// }

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
    const [spotifyToken, setSpotifyToken] = useState("");
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
            setSpotifyToken(newSpotifyToken);
            spotifyApi.setAccessToken(newSpotifyToken);
            spotifyApi.getMe().then((user) => {
                console.log(user);
            })
            setLoggedIn(true);
        }
        console.log("cookie token:", Cookies.get('token'));
    }, [])

    async function generateRoast() {
        // console.log("getNowPlaying")
    
        // not sure if i did this right lol
        spotifyApi.getMyTopArtists({ limit: 5 })
            .then((response) => {
                // console.log(data);
                // let topArtists = data.items;
                // console.log(response.items);
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
                const gptResponse = await fetch(BACKEND_ROUTE + "/roast", {
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
                console.log(gptRoast);
            });
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
                    <button onClick={() => generateRoast()}>Check Now Playing</button>
                )}
            </header>
        </div>
    )
}

export default App