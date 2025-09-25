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
   * Lista todas las pólizas de seguro
   * @returns Observable<Insurance[]>
   */
  getInsurances(): Observable<Insurance[]> {
    return collectionData(this.insuranceCollection, { idField: 'id' }) as Observable<Insurance[]>;
  }

  /**
   * Obtiene una póliza de seguro por ID
   * @param id - ID de la póliza
   * @returns Observable<Insurance | undefined>
   */
  getInsuranceById(id: string): Observable<Insurance | undefined> {
    const insuranceDoc = doc(this.firestore, 'insurances', id);
    return docData(insuranceDoc, { idField: 'id' }) as Observable<Insurance | undefined>;
  }

  /**
   * Crea una nueva póliza de seguro
   * @param insurance - Datos de la póliza (sin ID)
   * @returns Observable<void>
   */
  createInsurance(insurance: Omit<Insurance, 'id'>): Observable<void> {
    return from(addDoc(this.insuranceCollection, insurance).then(() => {}));
  }

  /**
   * Actualiza una póliza de seguro existente
   * @param id - ID de la póliza a actualizar
   * @param insurance - Datos actualizados de la póliza
   * @returns Observable<void>
   */
  updateInsurance(id: string, insurance: Partial<Omit<Insurance, 'id'>>): Observable<void> {
    const insuranceDoc = doc(this.firestore, 'insurances', id);
    return from(updateDoc(insuranceDoc, insurance));
  }

  /**
   * Elimina una póliza de seguro
   * @param id - ID de la póliza a eliminar
   * @returns Observable<void>
   */
  deleteInsurance(id: string): Observable<void> {
    const insuranceDoc = doc(this.firestore, 'insurances', id);
    return from(deleteDoc(insuranceDoc));
  }
}
