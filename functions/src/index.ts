/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
import type { Request, Response } from 'express';

import {setGlobalOptions} from "firebase-functions";
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
import { ChatEngineService } from './services/chat-engine.service';
import { ChatRequestBody } from './interfaces/chat-request-body.interface';
import { CreateInsuranceRequest, UpdateInsuranceRequest } from './interfaces/insurance.interface';

// Initialize Firebase Admin
initializeApp();

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');


export const chatRun = onRequest(
  { region: 'us-central1', cors: true, secrets: [OPENAI_API_KEY] },
  async (req: Request, res: Response): Promise<void> => {
    // Validación del método HTTP - solo acepta POST
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // Extracción y tipado de parámetros del cuerpo de la petición
    const {
      message,
      conversationId,
      locale,
    } = (req.body ?? {}) as ChatRequestBody;

    // Validación de parámetros obligatorios
    if (!message) {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    try {
      const chatEngineService = new ChatEngineService();

      if (message) {
        const response = await chatEngineService.handleUserMessage({
          message,
          conversationId,
          locale,
        });

        res.json(response);
        return;
      }
    } catch (e: any) {
      // Manejo centralizado de errores con logging
      console.error('Error en chatRun:', e);
      res.status(500).json({ error: e.message });
      return;
    }
  }
);

// API para registrar una nueva póliza de seguro
export const registerInsurance = onRequest(
  { region: 'us-central1', cors: true },
  async (req: Request, res: Response): Promise<void> => {
    // Validación del método HTTP - solo acepta POST
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // Extracción y tipado de parámetros del cuerpo de la petición
    const {
      name,
      description,
      pricePerDay,
      currency,
      amountCovered,
      region,
    } = (req.body ?? {}) as CreateInsuranceRequest;

    // Validación de parámetros obligatorios
    if (!name || !description || !pricePerDay || !currency || !amountCovered || !region) {
      res.status(400).json({
        error: 'All fields are required: name, description, pricePerDay, currency, amountCovered, region'
      });
      return;
    }

    // Validación de tipos y valores
    if (typeof pricePerDay !== 'number' || pricePerDay <= 0) {
      res.status(400).json({ error: 'pricePerDay must be a positive number' });
      return;
    }

    if (typeof amountCovered !== 'number' || amountCovered <= 0) {
      res.status(400).json({ error: 'amountCovered must be a positive number' });
      return;
    }

    if (!['EUR', 'USD'].includes(currency)) {
      res.status(400).json({ error: 'currency must be EUR or USD' });
      return;
    }

    if (!['Europe', 'Worldwide', 'Latin America'].includes(region)) {
      res.status(400).json({ error: 'region must be Europe, Worldwide, or Latin America' });
      return;
    }

    try {
      const db = getFirestore();
      const insuranceData = {
        name,
        description,
        pricePerDay,
        currency,
        amountCovered,
        region,
        createdAt: new Date().toISOString(),
      };

      const docRef = await db.collection('insurances').add(insuranceData);

      res.status(201).json({
        id: docRef.id,
        message: 'Insurance registered successfully',
        data: { id: docRef.id, ...insuranceData }
      });
    } catch (e: any) {
      console.error('Error en registerInsurance:', e);
      res.status(500).json({ error: e.message });
      return;
    }
  }
);

// API para editar una póliza de seguro existente
export const editInsurance = onRequest(
  { region: 'us-central1', cors: true },
  async (req: Request, res: Response): Promise<void> => {
    // Validación del método HTTP - acepta PUT y PATCH
    if (!['PUT', 'PATCH'].includes(req.method)) {
      res.status(405).json({ error: 'Method not allowed. Use PUT or PATCH' });
      return;
    }

    // Extracción y tipado de parámetros del cuerpo de la petición
    const {
      id,
      name,
      description,
      pricePerDay,
      currency,
      amountCovered,
      region,
    } = (req.body ?? {}) as UpdateInsuranceRequest;

    // Validación de parámetros obligatorios
    if (!id) {
      res.status(400).json({ error: 'id is required' });
      return;
    }

    // Validación de que al menos un campo para actualizar esté presente
    if (!name && !description && !pricePerDay && !currency && !amountCovered && !region) {
      res.status(400).json({
        error: 'At least one field to update is required: name, description, pricePerDay, currency, amountCovered, region'
      });
      return;
    }

    // Validación de tipos y valores para campos presentes
    if (pricePerDay !== undefined && (typeof pricePerDay !== 'number' || pricePerDay <= 0)) {
      res.status(400).json({ error: 'pricePerDay must be a positive number' });
      return;
    }

    if (amountCovered !== undefined && (typeof amountCovered !== 'number' || amountCovered <= 0)) {
      res.status(400).json({ error: 'amountCovered must be a positive number' });
      return;
    }

    if (currency !== undefined && !['EUR', 'USD'].includes(currency)) {
      res.status(400).json({ error: 'currency must be EUR or USD' });
      return;
    }

    if (region !== undefined && !['Europe', 'Worldwide', 'Latin America'].includes(region)) {
      res.status(400).json({ error: 'region must be Europe, Worldwide, or Latin America' });
      return;
    }

    try {
      const db = getFirestore();
      const docRef = db.collection('insurances').doc(id);

      // Verificar si el documento existe
      const doc = await docRef.get();
      if (!doc.exists) {
        res.status(404).json({ error: 'Insurance not found' });
        return;
      }

      // Preparar datos para actualizar
      const updateData: any = {
        updatedAt: new Date().toISOString(),
      };

      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (pricePerDay !== undefined) updateData.pricePerDay = pricePerDay;
      if (currency !== undefined) updateData.currency = currency;
      if (amountCovered !== undefined) updateData.amountCovered = amountCovered;
      if (region !== undefined) updateData.region = region;

      await docRef.update(updateData);

      // Obtener el documento actualizado
      const updatedDoc = await docRef.get();
      const updatedData = { id: updatedDoc.id, ...updatedDoc.data() };

      res.json({
        message: 'Insurance updated successfully',
        data: updatedData
      });
    } catch (e: any) {
      console.error('Error en editInsurance:', e);
      res.status(500).json({ error: e.message });
      return;
    }
  }
);
