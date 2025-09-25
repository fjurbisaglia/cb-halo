import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, doc, addDoc, updateDoc, deleteDoc, docData } from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { Insurance } from '../interfaces/insurance.interface';

@Injectable({
  providedIn: 'root'
})
export class InsuranceService {
  private firestore = inject(Firestore);
  private insuranceCollection = collection(this.firestore, 'insurances');

  /**
   * Lists all insurance policies
   * @returns Observable<Insurance[]>
   */
  getInsurances(): Observable<Insurance[]> {
    return collectionData(this.insuranceCollection, { idField: 'id' }) as Observable<Insurance[]>;
  }

  /**
   * Gets an insurance policy by ID
   * @param id - Policy ID
   * @returns Observable<Insurance | undefined>
   */
  getInsuranceById(id: string): Observable<Insurance | undefined> {
    const insuranceDoc = doc(this.firestore, 'insurances', id);
    return docData(insuranceDoc, { idField: 'id' }) as Observable<Insurance | undefined>;
  }

  /**
   * Creates a new insurance policy
   * @param insurance - Policy data (without ID)
   * @returns Observable<void>
   */
  createInsurance(insurance: Omit<Insurance, 'id'>): Observable<void> {
    return from(addDoc(this.insuranceCollection, insurance).then(() => {}));
  }

  /**
   * Updates an existing insurance policy
   * @param id - ID of the policy to update
   * @param insurance - Updated policy data
   * @returns Observable<void>
   */
  updateInsurance(id: string, insurance: Partial<Omit<Insurance, 'id'>>): Observable<void> {
    const insuranceDoc = doc(this.firestore, 'insurances', id);
    return from(updateDoc(insuranceDoc, insurance));
  }

  /**
   * Deletes an insurance policy
   * @param id - ID of the policy to delete
   * @returns Observable<void>
   */
  deleteInsurance(id: string): Observable<void> {
    const insuranceDoc = doc(this.firestore, 'insurances', id);
    return from(deleteDoc(insuranceDoc));
  }
}
