import { inject, Injectable } from '@angular/core';
import { Firestore, doc, getDoc, setDoc, updateDoc, docData } from '@angular/fire/firestore';
import { Observable, from, of, switchMap, catchError } from 'rxjs';
import { Settings } from '../interfaces/settings.interface';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly SETTINGS_COLLECTION = 'settings';
  private readonly SETTINGS_DOC_ID = 'app-settings';
  firestore = inject(Firestore);


  /**
   * Get settings from Firestore
   * Returns the settings if they exist, null if they don't
   */
  getSettings(): Observable<Settings | null> {
    const settingsDocRef = doc(this.firestore, this.SETTINGS_COLLECTION, this.SETTINGS_DOC_ID);
    return docData(settingsDocRef, { idField: 'id' }) as Observable<Settings | null>;
  }

  /**
   * Create or update settings in Firestore
   * If settings don't exist, creates them (registration)
   * If settings exist, updates them
   */
  saveSettings(settings: Settings): Observable<void> {
    const settingsDocRef = doc(this.firestore, this.SETTINGS_COLLECTION, this.SETTINGS_DOC_ID);

    return from(getDoc(settingsDocRef)).pipe(
      switchMap(docSnapshot => {
        if (docSnapshot.exists()) {
          // Settings exist, update them
          return from(updateDoc(settingsDocRef, { ...settings }));
        } else {
          // Settings don't exist, create them (first time registration)
          return from(setDoc(settingsDocRef, settings));
        }
      }),
      catchError(error => {
        console.error('Error saving settings:', error);
        throw error;
      })
    );
  }

  /**
   * Create settings for the first time
   * This method explicitly creates new settings
   */
  createSettings(settings: Settings): Observable<void> {
    const settingsDocRef = doc(this.firestore, this.SETTINGS_COLLECTION, this.SETTINGS_DOC_ID);
    return from(setDoc(settingsDocRef, settings)).pipe(
      catchError(error => {
        console.error('Error creating settings:', error);
        throw error;
      })
    );
  }

  /**
   * Update existing settings
   * This method explicitly updates existing settings
   */
  updateSettings(settings: Partial<Settings>): Observable<void> {
    const settingsDocRef = doc(this.firestore, this.SETTINGS_COLLECTION, this.SETTINGS_DOC_ID);
    return from(updateDoc(settingsDocRef, { ...settings })).pipe(
      catchError(error => {
        console.error('Error updating settings:', error);
        throw error;
      })
    );
  }

  /**
   * Check if settings exist in Firestore
   */
  settingsExist(): Observable<boolean> {
    const settingsDocRef = doc(this.firestore, this.SETTINGS_COLLECTION, this.SETTINGS_DOC_ID);
    return from(getDoc(settingsDocRef)).pipe(
      switchMap(docSnapshot => of(docSnapshot.exists())),
      catchError(error => {
        console.error('Error checking if settings exist:', error);
        return of(false);
      })
    );
  }
}
