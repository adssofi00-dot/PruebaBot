const express = require("express");
const axios = require("axios");
const { SessionsClient } = require("@google-cloud/dialogflow");

const app = express();
app.use(express.json());

// Variables de entorno (Render)
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const DIALOGFLOW_PROJECT_ID = process.env.DIALOGFLOW_PROJECT_ID;

// GOOGLE CREDENTIALS ya está en Render como JSON
const sessionClient = new SessionsClient();

// ✅ Validación Webhook Facebook
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.status(403).send("Unauthorized");
});

// ✅ Recepción mensajes Facebook Messenger
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.object === "page") {
    body.entry.forEach(async (entry) => {
      const event = entry.messaging[0];
      const senderId = event.sender.id;

      if (event.message && event.message.text) {
        const userMessage = event.message.text;

        console.log("📩 Usuario dijo:", userMessage);

        // 🔥 Enviar el mensaje a Dialogflow
        const responseText = await sendToDialogflow(userMessage, senderId);

        // 🔥 Responder al usuario en Messenger
        sendMessage(senderId, responseText);
      }
    });

    return res.status(200).send("EVENT_RECEIVED");
  }

  res.sendStatus(404);
});

// ✅ Función: Enviar texto a Dialogflow
async function sendToDialogflow(text, sessionId) {
  const sessionPath = sessionClient.projectAgentSessionPath(
    DIALOGFLOW_PROJECT_ID,
    sessionId
  );

  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text,
        languageCode: "es"
      }
    }
  };

  const responses = await sessionClient.detectIntent(request);
  return responses[0].queryResult.fulfillmentText;
}

// ✅ Enviar respuesta a Messenger
function sendMessage(senderId, message) {
  axios({
    url: "https://graph.facebook.com/v19.0/me/messages",
    method: "POST",
    params: { access_token: PAGE_ACCESS_TOKEN },
    data: {
      recipient: { id: senderId },
      message: { text: message }
    }
  });
}

app.listen(3000, () => console.log("🔥 Webhook activo en puerto 3000"));



