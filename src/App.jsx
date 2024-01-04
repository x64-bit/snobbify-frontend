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

// Data structure that manages the current active token, caching it in localStorage
// No need to store this as state; this is a glorified localStorage getter/setter
const currentToken = {
    get access_token() { return localStorage.getItem('access_token') || null; },
    get refresh_token() { return localStorage.getItem('refresh_token') || null; },
    get expires_in() { return localStorage.getItem('refresh_in') || null },
    get expires() { return localStorage.getItem('expires') || null },
  
    save: function (response) {
      const { access_token, refresh_token, expires_in } = response;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('expires_in', expires_in);
  
      const now = new Date();
      const expiry = new Date(now.getTime() + (expires_in * 1000));
      localStorage.setItem('expires', expiry);
    }
};

function App() {
    const [userData, setUserData] = useState();

    useEffect (() => {
        let ignore = false;

        // On page load, try to fetch auth code from current browser search URL
        const args = new URLSearchParams(window.location.search);
        const code = args.get('code');

        // store userData as state
        // conditionally render data based on existence of accessToken?
        
        async function handleCallback() {
            console.log("handling...");
            // If we have a token, we're logged in, so fetch user data and render logged in template
            if (currentToken.access_token) {
                console.log("toxen exists");
                console.log(currentToken.access_token);
                const currentUserData = await fetchProfile(currentToken.access_token);
                setUserData(currentUserData);
            }

            // Otherwise we're not logged in, so render the login template
            if (!currentToken.access_token) {
                console.log("no token");
                // If we find a code, we're in a callback, do a token exchange
                if (code && !ignore) {
                    console.log("callback");
                    console.log("code: " + code)
                    const token = await getAccessToken(CLIENT_ID, code);
                    console.log("token: " + token);
                    currentToken.save(token);
    
                    // Remove code from URL so we can refresh correctly.
                    const url = new URL(window.location.href);
                    url.searchParams.delete("code");
    
                    const updatedUrl = url.search ? url.href : url.href.replace('?', '');
                    window.history.replaceState({}, document.title, updatedUrl);
                }
            }
        }

        if (!ignore) {
            handleCallback();
        }
        return () => {
            ignore = true;
            console.log('unmounting --------------');
        }
    }, [])

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
                    currentToken.access_token 
                    ? userData.display_name 
                    : <button onClick={() => redirectToAuthCodeFlow(CLIENT_ID)}>Login</button>
                }
            </header>
        </div>
    )
}

export default App