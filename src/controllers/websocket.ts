// routes/websocketRoutes.ts
import { WebSocket } from '@fastify/websocket'
import { webSocket } from '../server'
import { websocketController } from './websession'
import { FastifyRequest } from 'fastify'
import jwt from 'jsonwebtoken'

export async function startWebsocket(
  connection: WebSocket,
  req: FastifyRequest,
) {
  const { token } = req.query as { token?: string }
  if (!token) {
    return connection.socket.close(4001, 'Token de autenticação ausente')
  }

  try {
    // Salvar a conexão para enviar notificações mais tarde
    webSocket.addClient({ connection })
    const decoded = jwt.decode(token) as {
      userId: string
      email: string
    }
    const { userId } = decoded

    const session = await websocketController.createSession(userId)

    connection.on('message', async (data: string) => {
      const { message, recipientId } = JSON.parse(data)

      // Salvar a mensagem no banco de dados
      await websocketController.saveMessage(userId, message, recipientId)

      // Enviar a mensagem para o cliente
      connection.send(
        JSON.stringify({
          message,
          timestamp: new Date(),
          senderId: userId,
          recipientId,
        }),
      )
    })

    connection.on('close', async () => {
      await websocketController.updateSessionToDisconnected(
        session._id.toString(),
      )
      console.log(`Usuário ${userId} desconectado.`)
      webSocket.deleteClient(connection)
    })
  } catch (error) {
    connection.socket.close(4002, 'Token inválido')
  }
}
