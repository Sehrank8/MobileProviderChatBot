import fs from 'fs';
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import axios from "axios";
import dotenv from "dotenv";
import http from "http";
const serviceAccount = JSON.parse(
    fs.readFileSync('/etc/secrets/firebase-key.json', 'utf8')
);



dotenv.config();

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();


const baseUrl = `${process.env.SITE_URL}/mobileapi/v1/Billing`;

// Listen to new user messages
db.collection("messages").onSnapshot(snapshot => {
    console.log("Listening for new messages...");
    snapshot.docChanges().forEach(async (change) => {
        if (change.type === "added") {

            console.log("Detected new message");
            const snap = change.doc;
            const data = snap.data();

            if (data.sender !== "user" || !data.text || data.processed) return;

            try {
                const {
                    intent,
                    subscriberNo = "000000",
                    month = new Date().getMonth() + 1,
                    year = new Date().getFullYear(),
                    usage,
                    page = 1,
                    pageSize = 10
                } = await detectIntent(data.text);

                const token = await getJwtToken();
                if (!token) throw new Error("Failed to retrieve token");

                const headers = { Authorization: `Bearer ${token}` };
                let responseText = "I'm not sure how to respond.";

                switch (intent) {
                    case "query_bill": {
                        const res = await axios.get(`${baseUrl}/QueryBill`, {
                            params: { subscriberNo, month, year },
                            headers
                        });
                        

                        const result = res.data;
                        responseText =
                            `Bill Summary for ${getMonthName(month)} ${year}:\n\n` +
                            `Subscriber No: ${subscriberNo}\n` +
                            `Remaining Balance: $${result.totalRemaining?.toFixed(2) || "0.00"}\n` +
                            `Status: ${result.isPaid ? " Paid" : "Not Paid"}\n\n` +
                            `Would you like to see the detailed usage or make a payment?`;

                        break;
                    }

                    case "query_bill_detailed": {
                        const res = await axios.get(`${baseUrl}/QueryBillDetailed`, {
                            params: { subscriberNo, month, year, page, pageSize },
                            headers
                        });
                        const result = res.data;
                        const details = Array.isArray(result.details) ? result.details : [];

                        responseText = `Detailed Bill for ${getMonthName(month)} ${year}:\n\n
                        ` +
                            `Subscriber No: ${subscriberNo}\n` +
                            `Total Due: $${result.total?.toFixed(2) || "0.00"}\n` +
                            `Remaining: $${result.remaining?.toFixed(2) || "0.00"}\n` +
                            `Status: ${result.isPaid ? "Paid" : "Not Paid"}\n` +
                            `Phone Usage: $${result.phoneAmount?.toFixed(2) || "0.00"}\n` +
                            `Internet Usage: $${result.internetAmount?.toFixed(2) || "0.00"}\n\n`;

                        for (const item of details) {
                            const unit = item.usageType === "PHONE" ? "minutes" :
                                item.usageType === "INTERNET" ? "MB" : "units";

                            responseText += `${item.usageType}: ${item.amount?.toFixed(2) || "0.00"}\n`;
                        }

                        break;
                    }


                    case "pay_bill": {
                        const res = await axios.post(`${baseUrl}/PayBill`, null, {
                            params: { subscriberNo, month, year },
                            headers
                        });
                        const result = res.data;
                        responseText =
                            `${result}`;
                        break;
                    }

                    default:
                        responseText = "I couldn't understand your request.";
                }

                await db.collection("messages").add({
                    createdAt: new Date(),
                    sender: "bot",
                    text: responseText             
                });
                await snap.ref.update({
                    processed: true
                });

                

            } catch (err) {
                console.error("Chatbot Error:", err.message);
                await db.collection("messages").add({
                    createdAt: new Date(),
                    sender: "bot",
                    text: err.message                   
                });
                await snap.ref.update({
                    processed: true
                });
            }
        }
    });
});


async function detectIntent(userMessage) {
    const response = await axios.post(
        "https://api.together.xyz/v1/chat/completions",
        {
            model: "mistralai/Mistral-7B-Instruct-v0.1",
            temperature: 0,
            messages: [
                {
                    role: "system",
                    content: `You are an API assistant. Given a user's message, respond with **only a raw JSON object**, without any commentary, reasoning, or tags like <think>. Your output must be **only valid JSON** in this format:
For billing actions:
{
  "intent": "query_bill" | "query_bill_detailed" | "pay_bill",
  "subscriberNo": "123456",
  "month": 3,
  "year": 2025
}

The years dont have to be 4 digits, for example the user can ask for year 1, 10, 123...

You MUST:
- NOT Wrap the JSON in triple backticks like \`\`\`json
- Return ONLY a JSON object.
- NOT include <think> tags or any explanation.
- NOT comment or reason your response.
- NOT guess missing values.
- Always return something in valid JSON format.`
                },
                { role: "user", content: userMessage }
            ]
        },
        {
            headers: {
                Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`,
                "Content-Type": "application/json"
            }
        }
    );

    try {
        return JSON.parse(response.data.choices[0].message.content);
    } catch {
        console.error("TogetherAI returned invalid JSON:", response.data.choices[0].message.content);
        return { intent: "unknown" };
    }
}

async function getJwtToken() {
    try {
        const res = await axios.post(`${process.env.SITE_URL}/mobileapi/v1/Login`, {
            username: process.env.GATEWAY_USER,
            password: process.env.GATEWAY_PASS

        });

        return res.data.token;
    } catch (err) {
        console.error("Login failed:", err.message);
        return null;
    }
}

function getMonthName(monthNum) {
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    return months[monthNum - 1] || "Unknown";
}



// Required by Render to detect an open port otherwise it stops my bot
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Chatbot is running\n");
}).listen(PORT, () => {
    console.log(`HTTP server running on port ${PORT}`);
});

