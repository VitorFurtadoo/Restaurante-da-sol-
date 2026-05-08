import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, deleteDoc, writeBatch, query, where, orderBy, limit, onSnapshot, serverTimestamp, Timestamp, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export async function logout() {
  await signOut(auth);
}

export { 
  signInAnonymously, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
};

export type { FirebaseUser };
export { onAuthStateChanged, collection, doc, getDoc, getDocs, setDoc, addDoc, deleteDoc, writeBatch, query, where, orderBy, limit, onSnapshot, serverTimestamp, Timestamp, getDocFromServer };
