// models/WebSocketSession.ts
import { Schema, model } from 'mongoose'

// Definir o esquema do WebSocketSession
const websocketSessionSchema = new Schema(
  {
    userId: { type: String, required: true }, // ID do usuário
    connectedAt: { type: Date, default: Date.now }, // Data de conexão
    disconnectedAt: { type: Date, default: null }, // Data de desconexão
  },
  { versionKey: false },
)

// Índice TTL para expiração automática da sessão após 1 hora
websocketSessionSchema.index({ connectedAt: 1 }, { expireAfterSeconds: 3600 })

const WebSocketSession = model('WebSocketSession', websocketSessionSchema)

export { WebSocketSession }
