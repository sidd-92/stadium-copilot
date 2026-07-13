import express from "express";
import { runPollLoop } from "./poll";

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 8080;

// Only Cloud Scheduler calls this (ingress is INTERNAL_ONLY, OIDC-
// authenticated). runPollLoop() never throws, so this always returns 200.
app.post("/poll", async (_req, res) => {
  try {
    await runPollLoop();
  } catch (err) {
    console.error("[ingestion] unexpected error escaped the poll loop:", err);
  }
  res.status(200).send("ok");
});

app.get("/", (_req, res) => {
  res.status(200).send("ingestion-service ok");
});

app.listen(port, () => {
  console.log(`ingestion-service listening on ${port}`);
});
