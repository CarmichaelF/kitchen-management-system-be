/* eslint-disable prettier/prettier */
import fastify from "fastify";
import { routes } from "./routes";
import fastifyMongodb from "fastify-mongodb";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "@fastify/cors";
import fastifyWebsocket from "@fastify/websocket";
import { KitchenWebSocket } from "./models/websocket";

dotenv.config();

export const app = fastify();

const mongodbUrl =
`${process.env.MONGODB_URL}/${process.env.MONGODB_DB_NAME}` ||
"mongodb://localhost:27017";

app.register(cors, {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
});

app.register(fastifyWebsocket)

app.register(fastifyMongodb, {
  forceClose: true,
  url: mongodbUrl,
});

app.register(routes);

export const webSocket = new KitchenWebSocket()

mongoose
.connect(mongodbUrl, {})
.then(() => console.log("MongoDB connected"))
.catch((err) => console.error("MongoDB connection error:", err));

async function start() {
  try {
    await app.listen({
      port: 3333,
    });
    app.log.info(`Servidor rodando na porta 3333`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
