const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// CAMBIAR ESTO POR TU TOKEN Y VERIFY TOKEN
const PAGE_ACCESS_TOKEN = "EAALtiwdn69gBP0ocwr2J5y31VlHLj504twiHpE8ZBAoRFQ4rZBNr0osunQnZCtjXreqmKFdwG985yZBY395BsSDsAPD8jLOtlV2A37KI4ZC032t3enfjZBFWKcZBZBgF1zqXFgTAe8QRZBxHuUU1nniEVn4yJeBZAQlRjnFORNBAUwgBDtRlxQIz7hp6nWXApZCnZAIRBGjrebdI";
const VERIFY_TOKEN = "casino2020";  

// Webhook verification (FACEBOOK VALIDATION)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✔ VERIFICADO DESDE FACEBOOK");
    res.status(200).send(challenge);
  } else {
    res.status(403).send("Forbidden");
  }
});

// Endpoint para recibir mensajes
app.post("/webhook", async (req, res) => {
  console.log("📩 Evento recibido:", JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

app.listen(3000, () => console.log("🔥 Servidor ejecutándose en puerto 3000"));
