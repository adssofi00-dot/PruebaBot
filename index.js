require('dotenv').config();  // Cargar las variables de entorno desde .env
console.log("GOOGLE_APPLICATION_CREDENTIALS:", process.env.GOOGLE_APPLICATION_CREDENTIALS);
const express = require("express");
const axios = require("axios");
const { SessionsClient } = require("@google-cloud/dialogflow");

const app = express();
app.use(express.json());

// Cargar variables de entorno desde .env
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const DIALOGFLOW_PROJECT_ID = process.env.DIALOGFLOW_PROJECT_ID;

// Verificar que las variables de entorno estén definidas
if (!PAGE_ACCESS_TOKEN || !VERIFY_TOKEN || !DIALOGFLOW_PROJECT_ID) {
  console.error("¡Faltan las variables de entorno! Asegúrate de definir PAGE_ACCESS_TOKEN, VERIFY_TOKEN y DIALOGFLOW_PROJECT_ID.");
  process.exit(1);  // Detener la ejecución si falta alguna variable de entorno
}

const sessionClient = new SessionsClient();

// ✅ Configuración de verificación del webhook para Facebook
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  // Verificación del webhook de Facebook
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.status(403).send("Unauthorized");
});

// ✅ Recibir mensajes de Facebook Messenger
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.object === "page") {
    body.entry.forEach(async (entry) => {
      const event = entry.messaging[0];
      const senderId = event.sender.id;
      const userMessage = event.message.text;

      console.log("📩 Usuario dijo:", userMessage);

      // Enviar mensaje a Dialogflow
      const responseText = await sendToDialogflow(userMessage, senderId);

      // Enviar respuesta a Facebook Messenger
      sendMessage(senderId, responseText);
    });

    return res.status(200).send("EVENT_RECEIVED");
  }

  res.sendStatus(404);
});

// ✅ Función para enviar texto a Dialogflow
async function sendToDialogflow(text, sessionId) {
  // Validar que sessionId y DIALOGFLOW_PROJECT_ID sean válidos
  if (!text || !sessionId || !DIALOGFLOW_PROJECT_ID) {
    console.error("Faltan parámetros en sendToDialogflow:", text, sessionId);
    return "Error en la configuración de Dialogflow.";
  }

  const sessionPath = sessionClient.projectAgentSessionPath(DIALOGFLOW_PROJECT_ID, sessionId);

  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text,
        languageCode: "es",
      },
    },
  };

  try {
    const responses = await sessionClient.detectIntent(request);
    console.log("Respuesta de Dialogflow:", responses[0].queryResult.fulfillmentText);
    return responses[0].queryResult.fulfillmentText;
  } catch (error) {
    console.error("Error al detectar la intención en Dialogflow:", error);
    return "Hubo un error al procesar tu mensaje.";
  }
}

// ✅ Función para enviar respuesta a Facebook Messenger
function sendMessage(senderId, message) {
  axios({
    url: "https://graph.facebook.com/v19.0/me/messages",
    method: "POST",
    params: { access_token: PAGE_ACCESS_TOKEN },
    data: {
      recipient: { id: senderId },
      message: { text: message },
    },
  })
    .then((response) => {
      console.log("Mensaje enviado a Messenger:", response.data);
    })
    .catch((error) => {
      console.error("Error al enviar mensaje a Messenger:", error);
    });
}

app.listen(3000, () => console.log("🔥 Webhook activo en puerto 3000"));


