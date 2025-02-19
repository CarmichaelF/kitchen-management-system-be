import { FastifyRequest, FastifyReply } from 'fastify'
import { User } from '../models/user'
import jwt from 'jsonwebtoken'

export const authMiddleware = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    // Recuperar o token do cabeçalho Authorization
    const query = request.query as { token?: string }
    const authHeader = request.headers.authorization

    if (request.url.includes('auth')) {
      return
    }

    // O token vem normalmente no formato 'Bearer <token>'
    const token = authHeader?.split(' ')[1] || query.token

    if (!token) {
      return reply.status(401).send({ message: 'Token não fornecido' })
    }

    // Validar o token com a chave secreta
    const secret = process.env.JWT_SECRET

    if (!secret) {
      return reply
        .status(500)
        .send({ message: 'Chave secreta não configurada' })
    }

    const decoded = jwt.verify(token, secret) as {
      userId: string
      email: string
    }

    // Buscar o usuário completo no banco com base no ID
    const user = await User.findById(decoded.userId)
    if (!user) {
      return reply.status(404).send({ message: 'Usuário não encontrado' })
    }
    // Adicionar o usuário completo à requisição
    request.user = user
  } catch (err) {
    console.error('Erro ao verificar o token:', err)
    return reply.status(401).send({ message: 'Token inválido ou expirado' })
  }
}

export const requireRole = (roles: string[]) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authMiddleware(request, reply)
    if (!request.user) return
    if (!roles.includes(request.user.role)) {
      return reply.status(403).send({ message: 'Acesso negado' })
    }
  }
}
