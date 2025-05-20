
# MobileProviderChatBot

The **MobileProviderChatBot** is an AI-powered assistant integrated with Firebase and Together.ai, capable of understanding user queries related to mobile billing and responding appropriately through a real-time messaging system.

### You can test it here: On [Render](https://mobileproviderchatapp.onrender.com)

## 🔗 Related Projects

- **API Gateway**: [MobileProviderGateway](https://github.com/Sehrank8/MobileProviderGateway)
- **Backend API**: [MobileProviderAPI](https://github.com/Sehrank8/MobileProviderAPI)
- **Frontend Application**: [MobileProviderChatApp](https://github.com/Sehrank8/MobileProviderChatApp)

## 🤖 Features

- Real-time message processing using Firebase Firestore
- Natural Language Understanding using Together.ai API
- Billing-related intents: query bill, query detailed bill, pay bill
- Integration with secured API via JWT-authenticated requests
- Automatic message status tracking (`processed` flag)

## 🛠️ Technologies Used

- Node.js
- Firebase Admin SDK
- Together.ai API (Mistral-7B-Instruct)
- Axios
- dotenv

## 📁 Project Structure

```
MobileProviderChatBot/
├── firebase-key.json         # Firebase service account
├── .env                      # Environment variables
├── chatbot.js                # Main chatbot logic
└── ...
```

## ⚙️ Getting Started

### Prerequisites

- Node.js (v18 or later)
- Firebase project and Firestore setup
- Together.ai API key

### Installation

1. Clone the repository:

```bash
git clone https://github.com/Sehrank8/MobileProviderChatBot.git
cd MobileProviderChatBot
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file with the following:

```env
TOGETHER_API_KEY=your_together_api_key
SITE_URL=https://your-api-gateway.onrender.com
GATEWAY_USER=your_gateway_username
GATEWAY_PASS=your_gateway_password
PORT=3000 or any port you like
```

4. Add your `firebase-key.json` to the root of the project.

### Running the Bot

```bash
node chatbot.js
```

### Deployment on Render

- Deploy this as a **background worker** if possible to prevent sleep.
- Alternatively, expose a small HTTP server (already included) to keep it awake.

## 🔍 Intent Detection

The bot uses Together.ai to detect intents in the following format:

```json
{
  "intent": "query_bill" | "query_bill_detailed" | "pay_bill",
  "subscriberNo": "123456",
  "month": 3,
  "year": 2025
}
```

## 📡 Real-Time Firestore Listening

The bot listens to changes in the `messages` collection and responds when a new user message is added with `sender: "user"` and `processed: false`.

