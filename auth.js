// auth.js

let supabase = null;

// The Supabase client is initialized only once when needed.
export function initializeSupabase() {
    try {
        const SUPABASE_URL = 'https://fdwxcunlytbhdnnjzgua.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkd3hjdW5seXRiaGRubmp6Z3VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyOTQ3MjksImV4cCI6MjA3MTg3MDcyOX0.WqQROmzPJcfzZVoRTW2MFjryulKvw7IWGHKnaphCEcU';
        
        if (typeof window.supabase !== 'undefined') {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('Supabase initialized successfully!');
            return true;
        } else {
            console.log('Supabase library not loaded yet');
            return false;
        }
    } catch (error) {
        console.error('Supabase initialization failed:', error);
        return false;
    }
}

// Provides a way for other modules to get the Supabase client instance.
export async function getSupabase() {
    if (!supabase) {
        if (!initializeSupabase()) {
            throw new Error('Supabase failed to initialize');
        }
    }
    return supabase;
}

export async function handleSignIn(email, password) {
    try {
        const supabase = await getSupabase();
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        displayAuthMessage('Signed in successfully!', 'green');
        updateAuthUI(data.user);
    } catch (error) {
        displayAuthMessage(error.message, 'red');
    }
}

export async function handleSignUp(email, password) {
    try {
        const supabase = await getSupabase();
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        displayAuthMessage('Sign up successful! Please check your email for a confirmation link.', 'green');
        updateAuthUI(data.user);
    } catch (error) {
        displayAuthMessage(error.message, 'red');
    }
}

export async function handleSignOut() {
    try {
        const supabase = await getSupabase();
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        displayAuthMessage('Signed out successfully!', 'green');
        updateAuthUI(null);
    } catch (error) {
        displayAuthMessage(error.message, 'red');
    }
}

export function displayAuthMessage(message, color) {
    const authMessage = document.getElementById('authMessage');
    authMessage.textContent = message;
    authMessage.style.color = color;
}

export function updateAuthUI(user) {
    const authForm = document.getElementById('authForm');
    const userInfo = document.getElementById('userInfo');
    const userEmail = document.getElementById('userEmail');
    
    if (user) {
        authForm.style.display = 'none';
        userInfo.style.display = 'flex';
        userEmail.textContent = user.email;
    } else {
        authForm.style.display = 'flex';
        userInfo.style.display = 'none';
    }
}

export async function checkAuthState() {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    updateAuthUI(user);
    return user;
}