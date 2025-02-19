// utils/KitchenWebSocket.ts
import { WebSocket } from '@fastify/websocket'
import Message from './notifications-message'

interface SendNotificationToClientsProps<T> {
  message: string
  data: T
}

export class KitchenWebSocket {
  clients: Set<WebSocket>

  constructor() {
    this.clients = new Set<WebSocket>()
  }

  addClient({ connection }: { connection: WebSocket }) {
    const wsConnection = connection as WebSocket
    this.clients.add(wsConnection)

    // Quando a conexão for fechada, remova o cliente da lista
    connection.on('close', () => {
      this.clients.delete(wsConnection)
    })
  }

  deleteClient({ connection }: { connection: WebSocket }) {
    this.clients.delete(connection)
  }

  sendNotificationToClients = <T>(data: SendNotificationToClientsProps<T>) => {
    this.clients.forEach((client) => {
      client.send(JSON.stringify(data))
    })
  }

  // Método para persistir as mensagens enviadas entre clientes
  async saveMessage(senderId: string, content: string, recipientId?: string) {
    await Message.create({
      senderId,
      content,
      recipientId,
    })
  }
}
