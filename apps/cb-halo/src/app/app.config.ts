import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA4t1LoMsd6WrRTKVksL5va9MUe-fvyGkg",
  authDomain: "cb-halo.firebaseapp.com",
  projectId: "cb-halo",
  storageBucket: "cb-halo.firebasestorage.app",
  messagingSenderId: "59703367386",
  appId: "1:59703367386:web:f32a99129910d7a488f7e3"
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),
    provideFirestore(() => getFirestore()),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
  ],
};
