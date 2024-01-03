import { redirectToAuthCodeFlow, getAccessToken } from './pkce.jsx'
import { useState, useEffect } from 'react';
import 'axios';

const CLIENT_ID = "6a8265b38a5f4cde8f00f1e9a0550461"; // Replace with your client ID
const REDIRECT_URI = "http://localhost:5173/callback"
const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize"
const RESPONSE_TYPE = "token"

const params = new URLSearchParams();
params.append("client_id", CLIENT_ID);
params.append("response_type", RESPONSE_TYPE);
params.append("redirect_uri", REDIRECT_URI);

function App() {
    const [token, setToken] = useState("");

    useEffect (() => {
        let currentToken = window.localStorage.getItem("token");

        if (!currentToken && hash) {
            // window.blahblah is a string; for some reason hash includes the hash inside
            // so substring out of the hash
            let params = new URLSearchParams(window.location.hash.substring(1));
            for (let param of params) {
                console.log(param);
            }

            currentToken = params.get('access_token');
            console.log(currentToken);

            window.location.hash = "";
            window.localStorage.setItem("token", currentToken)
            setToken(currentToken);
        }
    })

    // clear
    function logout() {
        setToken("");
        window.localStorage.removeItem("token");
    }

    return (
        <div className='app'>
            <header className='app-header'>
                <h1>Spotify with React</h1>
                {
                    !token ? 
                        <a href={`${AUTH_ENDPOINT}?${params.toString()}`}>Login to Spotify</a>
                    : <button onClick={logout}>Logout</button>
                }
            </header>
        </div>
    )
}

export default App