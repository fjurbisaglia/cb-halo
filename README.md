# 🌐 CB Halo — AI Travel Insurance Chatbot

Live Demo: https://cb-halo.web.app/

---

## 📦 Project Overview

**CB Halo** is an AI-powered chatbot that helps users choose the best travel insurance plan based on their needs. It supports:

- 🧠 RAG-based responses using OpenAI + Google Vertex AI Vector Search
- 🗂 Custom embeddings for travel insurance documents
- 💬 Smart prompt handling with dynamic rules
- 🖥️ Admin panel for customizing the assistant (company name, tone, etc.)

Built with:

- Angular 20 (frontend)
- Firebase Hosting (deployment)
- Firebase Functions (backend)
- OpenAI (conversational logic)
- Vertex AI Matching Engine (vector search)
- Nx Monorepo

---

## 🧑‍💻 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/fjurbisaglia/cb-halo.git
cd cb-halo
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Firebase

```bash
firebase login
firebase use --add  # Select your project (or create one)
firebase init       # Only initialize Hosting and Functions (skip others)
```

Add your Firebase service account and OpenAI keys in a local `.env` or directly in your deployed functions config.

### 4. Build the app

```bash
npx nx build cb-halo --configuration=production
```

Build output will be in:
```
dist/apps/cb-halo/browser
```

### 5. Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

To deploy backend (Cloud Functions):
```bash
firebase deploy --only functions
```

---

## ⚙️ Admin Panel – Dynamic Bot Configuration

The app includes a built-in admin panel to customize the chatbot’s behavior **without redeploying**.

🔗 Access it live: [https://cb-halo.web.app/settings](https://cb-halo.web.app/settings)

### Editable settings:

- 🏢 **Company Name** – Used in responses and prompt context
- 📣 **Company Slogan** – Sets tone and branding in bot replies
- 🌍 **Company Industry** – Used to tailor prompt context
- 🤖 **Bot Name** – Assistant persona (e.g., Raull, Ava)
- 🎛 **Temperature** – Controls creativity of responses
- 🗣 **Communication Tone** – Keywords like `friendly`, `professional`, `concise`, etc.

> These settings are injected directly into the prompt structure and affect every new conversation in real time.

---

## 📁 Dataset

The app uses a custom collection of travel insurance plans stored in Firestore (`insurances` collection). Each document includes:

- Name
- Region (Europe, Worldwide, etc.)
- Medical coverage
- Daily price
- Description

These are embedded into vectors using OpenAI and stored in Google Vertex AI Matching Engine for real-time vector search.

---

## 💬 Message History (Memory)

To maintain and retrieve previous messages in a conversation, the app uses the [OpenAI Conversations API](https://platform.openai.com/docs/api-reference/conversations).

This allows:

- Session continuity between user and assistant
- More coherent, context-aware responses
- Retrieval of last messages to build prompt context dynamically

---

## 📌 Features

- ✨ Fully serverless architecture
- 🧩 Prompt engineering with rules and fallback cases
- 🔍 Vector search for contextual insurance retrieval
- 🔐 Dynamic company-specific configuration
- 💾 Memory via OpenAI Conversations API

## 📄 Insurance Plan Management

All travel insurance plans used by the chatbot are managed in Firestore, and can be viewed, created, or edited via:

🔗 [https://cb-halo.web.app/insurances](https://cb-halo.web.app/insurances)

This interface lets you:

- View all available insurance plans
- Edit existing plans
- Add new products with coverage, description, and pricing

> ⚠️ **Important:** While these changes are saved in Firestore and visible in the interface, the chatbot **will not immediately reflect them** in recommendations.

This is because the vector embeddings (used for semantic search via Google Vertex AI Matching Engine) are not automatically updated when plans are edited or created. Embeddings are currently generated via a separate manual script.

### 🔧 Planned Improvement

A future update will introduce automatic re-embedding and syncing to the vector index whenever a product is added or modified — keeping the AI assistant always in sync with the latest product offerings.
