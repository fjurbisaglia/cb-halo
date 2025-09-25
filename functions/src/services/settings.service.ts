import { getFirestore } from 'firebase-admin/firestore';

export interface Settings {
  tone?: string[];
  companySlogan?: string;
  botName?: string;
  companyName?: string;
  companyIndustry?: string;
  temperature?: number;
}

export class SettingsService {
  private readonly SETTINGS_COLLECTION = 'settings';
  private readonly SETTINGS_DOC_ID = 'app-settings';

  /**
   * Get settings from Firestore
   * Returns the settings if they exist, null if they don't
   */
  async getSettings(): Promise<Settings | null> {
    try {
      const db = getFirestore();
      const settingsDocRef = db.collection(this.SETTINGS_COLLECTION).doc(this.SETTINGS_DOC_ID);
      const doc = await settingsDocRef.get();

      if (doc.exists) {
        return doc.data() as Settings;
      } else {
        console.log('No settings document found');
        return null;
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      throw error;
    }
  }

  /**
   * Get settings with fallback values
   * Returns settings from database or default values if not found
   */
  async getSettingsWithDefaults(): Promise<Settings> {
    try {
      const settings = await this.getSettings();

      // Return settings with fallback values
      return {
        botName: settings?.botName || 'Raul',
        tone: settings?.tone || ['formal'],
        companySlogan: settings?.companySlogan || 'Your Journey, Fully Protected.',
        companyName: settings?.companyName || 'TravelAssistance',
        companyIndustry: settings?.companyIndustry || 'Travel Insurance',
        temperature: settings?.temperature || 0.7
      };
    } catch (error) {
      console.error('Error fetching settings, using defaults:', error);

      // Return default values if there's an error
      return {
        botName: 'Raul',
        tone: ['formal'],
        companySlogan: 'Your Journey, Fully Protected.',
        companyName: 'TravelAssistance',
        companyIndustry: 'Travel Insurance',
        temperature: 0.7
      };
    }
  }
}
