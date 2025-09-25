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
import { initializeApp } from 'firebase-admin/app';
import { ChatEngineService } from './services/chat-engine.service';
import { ChatRequestBody } from './interfaces/chat-request-body.interface';

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

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');


export const chatRun = onRequest(
  { region: 'us-central1', cors: true, secrets: [OPENAI_API_KEY], memory: '512MiB',  },
  async (req: Request, res: Response): Promise<void> => {
    // HTTP method validation - only accepts POST
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // Extract and type parameters from request body
    const {
      message,
      conversationId,
      locale,
    } = (req.body ?? {}) as ChatRequestBody;

    // Validation of required parameters
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
      // Centralized error handling with logging
      console.error('Error in chatRun:', e);
      res.status(500).json({ error: e.message });
      return;
    }
  }
);
