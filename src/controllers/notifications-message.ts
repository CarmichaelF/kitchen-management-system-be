import { FastifyReply, FastifyRequest } from 'fastify'
import Message from '../models/notifications-message'

export const getMessages = async (req: FastifyRequest, reply: FastifyReply) => {
  const messages = await Message.find().sort({ timestamp: 1 })

  reply.send(messages)
}
