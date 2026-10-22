
require("dotenv").config();

const express = require("express"); //build backend server and API endpoint
const crypto = require("crypto");
const app = express();
const http = require("http");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 3000;

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

// Required to read webhook data and verify Meta's signature
app.use(
  express.json({
    verify: (req, res, buffer) => {
      req.rawBody = buffer;
    },
  })
);

//socket.io to connect FE and BE
const leads = [];
io.on("connection", (socket) => {
  console.log(" React is connected:", socket.id);

  socket.emit("leads:init", leads);

  socket.on("disconnect", () => {
    console.log(" React is disconnected");
  });
});

//receive raw data from meta webhook
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    process.env.META_VERIFY_TOKEN &&
    token === process.env.META_VERIFY_TOKEN &&
    typeof challenge === "string"
  ) {
    console.log("Webhook verified");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

// verifing the get data from webhook and checking the signature
function verifyMetaSignature(req) {
  const appSecret = process.env.META_APP_SECRET;
  const signature = req.get("x-hub-signature-256");

  if (!appSecret || !signature || !Buffer.isBuffer(req.rawBody)) {
    return false;
  }

  const expected = "sha256=" + crypto
    .createHmac("sha256", appSecret)
    .update(req.rawBody)
    .digest("hex");

  const received = Buffer.from(signature);
  const calculated = Buffer.from(expected);

  return (
    received.length === calculated.length &&
    crypto.timingSafeEqual(received, calculated)
  );
}

//conver the raw data into JS object for FE
function mapLeadData(data) {
  const fields = {};

  for (const field of data.field_data || []) {
    fields[field.name] = field.values?.[0] ?? null;
  }

  return {
    id: data.id,
    name: fields.full_name || fields.name || null,
    email: fields.email || null,
    phone: fields.phone_number || fields.phone || null,
  };
}

// Fetching Lead Details from Graph API
async function getLeadDetails(leadgenId) {
  const accessToken = process.env.META_ACCESS_TOKEN;

  if (!accessToken) {
    console.error("Meta access token is missing");
    return null;
  }

  try {
    const url = `https://graph.facebook.com/v26.0/${encodeURIComponent(leadgenId)}?fields=id,field_data`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error("Graph API error:", data.error?.message);
      return null;
    }

    return mapLeadData(data);
  } catch (error) {
    console.error("Failed to fetch lead:", error);
    return null;
  }
}

// Process the  Lead Events
async function processLeadEvents(payload) {
  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== "leadgen") continue;

      const leadgenId = change.value?.leadgen_id;
      if (!leadgenId) continue;

      const lead = await getLeadDetails(leadgenId);
      if (!lead) continue;

      const exists = leads.some((item) => item.id === lead.id);

      if (!exists) {
        leads.unshift(lead);
        console.log("Connected clients:", io.engine.clientsCount);
        io.emit("lead:new", lead);

        console.log("New lead received and sent to app:", lead.id);
      }
    }
  }
}

//Receiving the lead data from webhook and sending to FE
app.post("/webhook", (req, res) => {
  if (!verifyMetaSignature(req)) {
    return res.sendStatus(403);
  }

  res.sendStatus(200);

  if (req.body?.object !== "page") {
    return;
  }

  processLeadEvents(req.body).catch((error) => {
    console.error("Error processing lead:", error);
  });
});

// dummy policy created which Required for Meta App publishing.
app.get("/privacy-policy", (req, res) => {
  res.type("html").send(`
    <h1>Privacy Policy - Leads PoC Demo</h1>

    <p>This application is used to test Meta Lead Ads
    integration with a Node.js backend and React Native app.</p>

    <h3>Information Collected</h3>
    <p>The test forms may collect names, email addresses,
    and phone numbers.</p>

    <h3>How Information Is Used</h3>
    <p>The information is used to test lead retrieval
    and display leads in the mobile application.</p>

    <h3>Data Storage</h3>
    <p>Leads are stored temporarily in server memory
    and are cleared when the backend restarts.</p>

    <h3>Contact</h3>
    <p>For privacy questions or deletion requests:
    arvind061201@gmail.com</p>
  `);
});

// Start of Express Server
const requiredEnv = [
  "META_VERIFY_TOKEN",
  "META_APP_SECRET",
  "META_ACCESS_TOKEN",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing environment variable: ${key}`);
    process.exit(1);
  }
}

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
