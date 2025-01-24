const express = require("express");
const { createServer } = require("http");
const next = require("next");
const WebSocket = require("ws");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const server = express();
const httpServer = createServer(server);
const wss = new WebSocket.Server({ server: httpServer });

const watchers = new Map();

wss.on("connection", (ws, req) => {
  const productId = req.url?.split("/").pop(); // Extract productId from URL
  if (!productId) return;

  // Increment watcher count
  const currentCount = (watchers.get(productId) || 0) + 1;
  watchers.set(productId, currentCount);
  console.log(
    `New connection for product ${productId}: ${currentCount} watchers`
  );

  // Notify all connected clients about the new watcher count
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ productId, count: currentCount }));
    }
  });

  // Handle disconnection
  ws.on("close", () => {
    const updatedCount = Math.max((watchers.get(productId) || 0) - 1, 0);

    if (updatedCount === 0) {
      watchers.delete(productId); // Remove entry if no watchers left
    } else {
      watchers.set(productId, updatedCount);
    }

    console.log(
      `Connection closed for product ${productId}: ${updatedCount} watchers`
    );

    // Notify all clients about the updated watcher count
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ productId, count: updatedCount }));
      }
    });
  });

  // Send initial message
  ws.send(
    JSON.stringify({
      message: "Connected to the WebSocket server!",
      productId,
      count: currentCount,
    })
  );
});

// Handle Next.js routing
server.all("*", (req, res) => {
  return handle(req, res);
});

// Start the server
httpServer.listen(4000, (err) => {
  if (err) throw err;
  console.log("Server is listening on http://localhost:4000");
});
