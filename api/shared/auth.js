import { google } from 'googleapis';

// Google Sheets API setup - shared across all API endpoints
let auth = null;
let sheets = null;

function initializeAuth() {
    if (auth && sheets) {
        return { auth, sheets };
    }

    try {
        // Prefer GOOGLE_SERVICE_ACCOUNT_KEY (single JSON env var) as it's more reliable
        // This avoids encoding issues with individual environment variables
        if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
            const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
            // Ensure private key has proper newlines
            if (credentials.private_key && typeof credentials.private_key === 'string') {
                credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
            }
            auth = new google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
            });
        } else if (process.env.GOOGLE_SERVICE_ACCOUNT_TYPE && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
            // Process private key: handle various formats and encoding issues
            let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
            
            // Remove surrounding quotes if present
            privateKey = privateKey.replace(/^["']|["']$/g, '');
            
            // Replace escaped newlines with actual newlines
            privateKey = privateKey.replace(/\\n/g, '\n');
            
            // Ensure the key has proper BEGIN/END markers if missing
            if (!privateKey.includes('BEGIN PRIVATE KEY') && !privateKey.includes('BEGIN RSA PRIVATE KEY')) {
                console.warn('Private key may be missing BEGIN/END markers');
            }
            
            const credentials = {
                type: process.env.GOOGLE_SERVICE_ACCOUNT_TYPE,
                project_id: process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID,
                private_key_id: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID,
                private_key: privateKey,
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,
                client_id: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_ID,
                auth_uri: process.env.GOOGLE_SERVICE_ACCOUNT_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
                token_uri: process.env.GOOGLE_SERVICE_ACCOUNT_TOKEN_URI || 'https://oauth2.googleapis.com/token',
                auth_provider_x509_cert_url: process.env.GOOGLE_SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
                client_x509_cert_url: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_X509_CERT_URL,
                universe_domain: process.env.GOOGLE_SERVICE_ACCOUNT_UNIVERSE_DOMAIN || 'googleapis.com'
            };
            
            try {
                auth = new google.auth.GoogleAuth({
                    credentials,
                    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
                });
            } catch (keyError) {
                if (keyError.code === 'ERR_OSSL_UNSUPPORTED' || keyError.message?.includes('DECODER')) {
                    console.error('Private key format error. Try using GOOGLE_SERVICE_ACCOUNT_KEY (JSON format) instead of individual env vars.');
                    throw new Error('Private key format not supported. Please use GOOGLE_SERVICE_ACCOUNT_KEY with the full JSON credentials, or use GOOGLE_APPLICATION_CREDENTIALS with a credentials file.');
                }
                throw keyError;
            }
        } else {
            const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS || './credentials.json';
            auth = new google.auth.GoogleAuth({
                keyFile,
                scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
            });
        }

        sheets = google.sheets({ version: 'v4', auth });

        console.log('Google Sheets API initialized successfully');
        return { auth, sheets };
    } catch (error) {
        console.error('Error setting up Google Auth:', error);
        throw error;
    }
}

export function getSheets() {
    if (!sheets) {
        initializeAuth();
    }
    return sheets;
}

export function getAuth() {
    if (!auth) {
        initializeAuth();
    }
    return auth;
} 