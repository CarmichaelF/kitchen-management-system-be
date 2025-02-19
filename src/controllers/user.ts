// controllers/userController.ts
import { IUserDocument, User } from '../models/user'
import { FastifyRequest, FastifyReply } from 'fastify'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

interface UserRegisterDTO {
  name: string
  email: string
  password: string
  role: 'admin' | 'editor' | 'user'
}

interface UserLoginDTO {
  email: string
  password: string
}

// Função para gerar token JWT
const generateToken = (user: { _id: string; email: string }) => {
  const secret = process.env.JWT_SECRET
  // O payload pode incluir apenas as informações necessárias
  if (!secret) return
  const token = jwt.sign({ userId: user._id, email: user.email }, secret, {
    expiresIn: '24h',
  })
  return token
}

export const createUser = async (
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> => {
  const { name, email, password, role } = request.body as UserRegisterDTO

  try {
    const hashedPassword = await bcrypt.hash(password, 10)

    // Apenas permite atribuir "admin" se não houver admins no sistema (para o primeiro admin)
    const isFirstAdmin = (await User.countDocuments({ role: 'admin' })) === 0
    const userRole = isFirstAdmin ? 'admin' : role || 'user'

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: userRole,
    })
    const savedUser = await user.save()

    const token = generateToken({
      _id: savedUser._id.toString(),
      email: savedUser.email,
    })

    return reply.send({
      message: 'Usuário criado com sucesso',
      user: savedUser,
      token,
    })
  } catch (err) {
    console.error('Error creating user:', err)
    return reply.status(500).send({ message: 'Erro ao criar usuário' })
  }
}

export const loginUser = async (
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> => {
  console.log('request', request)
  const { email, password } = request.body as UserLoginDTO
  try {
    // Certifique-se de que o retorno seja tipado corretamente
    const user = (await User.findOne({ email })) as IUserDocument

    if (!user) {
      return reply.status(404).send({ message: 'Usuário não encontrado' })
    }

    // Compara a senha fornecida com a senha hasheada armazenada
    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return reply.status(401).send({ message: 'Senha incorreta' })
    }

    const token = generateToken({ _id: user._id.toString(), email: user.email })

    return reply.send({
      message: 'Login realizado com sucesso',
      user,
      token,
    })
  } catch (err) {
    console.error('Error logging in user:', err)
    return reply.status(500).send({ message: 'Erro no login' })
  }
}

export const validateToken = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const authHeader = request.headers.authorization

    if (!authHeader) {
      return reply
        .status(401)
        .send({ valid: false, message: 'Token não fornecido' })
    }

    const token = authHeader.split(' ')[1] // Remove "Bearer "

    if (!token) {
      return reply.status(401).send({ valid: false, message: 'Token inválido' })
    }

    const secret = process.env.JWT_SECRET

    if (!secret) throw new Error('Chave secreta não configurada')

    jwt.verify(token, secret)

    return reply.send({ valid: true })
  } catch (error) {
    console.error('❌ Erro ao validar o token:', error)
    return reply
      .status(401)
      .send({ valid: false, message: 'Token inválido ou expirado' })
  }
}
