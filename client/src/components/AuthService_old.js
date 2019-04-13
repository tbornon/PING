import decode from 'jwt-decode';

class AuthService {
    // Initializing important variables
    constructor() {
        this.fetch = this.fetch.bind(this);
        this.getProfile = this.getProfile.bind(this);
    }

    isLoggedIn() {
        // Checks if there is a saved token and it's still valid
        const token = this.getToken() // GEtting token from localstorage
        return token !== null; // handwaiving here
    }

    isTokenExpired(token) {
        try {
            const decoded = decode(token);
            if (decoded.exp < Date.now() / 1000) { // Checking if token is expired. N
                return true;
            }
            else
                return false;
        }
        catch (err) {
            return false;
        }
    }

    setToken(idToken) {
        // Saves user token to localStorage
        localStorage.setItem('token', idToken)
    }

    getToken() {
        if (!this.isTokenExpired(localStorage.getItem('token'))) {
            return localStorage.getItem('token')
        }
        else {
            localStorage.removeItem('token');
            return null;
        }
    }

    logout() {
        // Clear user token and profile data from localStorage
        localStorage.removeItem('token');
    }

    fetch(url, options) {
        // performs api calls sending the required authentication headers
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }

        // Setting Authorization header
        // Authorization: Bearer xxxxxxx.xxxxxxxx.xxxxxx
        if (this.isLoggedIn()) {
            headers['authorization'] = this.getToken()
        }

        return fetch(url, {
            headers,
            ...options
        });
    }
}

export default AuthService;