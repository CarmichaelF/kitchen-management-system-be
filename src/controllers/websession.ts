import Message from '../models/notifications-message'
import { WebSocketSession } from '../models/websession'

class WebSocketController {
  // Método para criar uma nova sessão WebSocket
  async createSession(userId: string) {
    const session = await WebSocketSession.create({ userId })
    return session
  }

  // Método para atualizar a desconexão de uma sessão
  async updateSessionToDisconnected(sessionId: string) {
    const session = await WebSocketSession.findByIdAndUpdate(
      sessionId,
      { disconnectedAt: new Date() },
      { new: true },
    )
    return session
  }

  // Método para salvar uma mensagem no banco de dados
  async saveMessage(
    senderId: string,
    content: string,
    recipientId?: string,
    messageType: string = 'order',
    orderId?: string,
  ) {
    const message = await Message.create({
      senderId,
      content,
      recipientId,
      messageType,
      orderId,
    })
    return message
  }

  // Método para buscar todas as sessões ativas de um usuário
  async getActiveSessions(userId: string) {
    const sessions = await WebSocketSession.find({
      userId,
      disconnectedAt: null,
    })
    return sessions
  }

  // Método para buscar o histórico de sessões de um usuário
  async getUserHistory(userId: string) {
    const history = await WebSocketSession.find({ userId })
    return history
  }
}

// Instanciando o controlador
const websocketController = new WebSocketController()

export { websocketController }
