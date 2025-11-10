const express = require("express");
const axios = require("axios");
const { v2beta1 } = require("@google-cloud/dialogflow");
const uuid = require("uuid");

const app = express();
app.use(express.json());

// 🔹 Variables de entorno — NO pongas los tokens en el código
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const GOOGLE_PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n");

// ====================== FACEBOOK WEBHOOK VERIFY ======================
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✔ VERIFICADO DESDE FACEBOOK");
    return res.status(200).send(challenge);
  }

  return res.status(403).send("Error de verificación");
});

// ====================== MENSAJES ENTRANTES DE FACEBOOK ======================
app.post("/webhook", async (req, res) => {
  console.log("📥 Payload recibido:", JSON.stringify(req.body, null, 2));

  const body = req.body;

  if (body.object === "page") {
    body.entry.forEach(async (entry) => {
      const event = entry.messaging[0];
      const senderId = event.sender.id;

      if (event.message && event.message.text) {
        const userMessage = event.message.text;

        const botReply = await sendToDialogflow(senderId, userMessage);

        await sendMessageToFacebook(senderId, botReply);
      }
    });

    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

// ====================== ENVIAR TEXTO A DIALOGFLOW ======================
async function sendToDialogflow(senderId, text) {
  const sessionClient = new v2beta1.SessionsClient({
    credentials: {
      private_key: GOOGLE_PRIVATE_KEY,
      client_email: GOOGLE_CLIENT_EMAIL,
    },
  });

  const sessionPath = sessionClient.projectLocationAgentSessionPath(
    GOOGLE_PROJECT_ID,
    "global",
    uuid.v4()
  );

  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text,
        languageCode: "es",
      },
    },
  };

  const responses = await sessionClient.detectIntent(request);
  return responses[0].queryResult.fulfillmentText || "No entendí 🙈";
}

// ====================== RESPUESTA A FACEBOOK MESSENGER ======================
async function sendMessageToFacebook(senderId, message) {
  await axios.post(
    `https://graph.facebook.com/v17.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
    {
      recipient: { id: senderId },
      message: { text: message },
    }
  );
}

app.listen(3000, () => {
  console.log("🔥 Servidor corriendo en Render puerto 3000");
});

