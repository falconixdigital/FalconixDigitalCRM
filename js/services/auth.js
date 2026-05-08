import { auth, provider } from '../config/firebase.js';
import { signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

export const ALLOWED_EMAIL = "digitalfalconix@gmail.com";
export let currentUser = null;

export function setCurrentUser(user) { currentUser = user; }

export async function loginUser() {
    try {
        const result = await signInWithPopup(auth, provider);
        currentUser = result.user;
        return currentUser;
    } catch (error) {
        console.error("Login failed", error);
        throw error;
    }
}

export function logoutUser() {
    return signOut(auth);
}
