// controllers/userController.ts
import { User } from '../models/user'
import { FastifyRequest, FastifyReply } from 'fastify'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

interface UserRegisterDTO {
  name: string
  email: string
  password: string
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
    expiresIn: '1h',
  })
  return token
}

// Rota para cadastro de usuário com hashing de senha
export const createUser = async (
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> => {
  const { name, email, password } = request.body as UserRegisterDTO
  try {
    // Hash da senha com um salt (número de rounds: 10 é um bom equilíbrio)
    const hashedPassword = await bcrypt.hash(password, 10)
    const user = new User({ name, email, password: hashedPassword })
    const savedUser = await user.save()

    // Gera o token após o cadastro
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

// Rota para login com comparação de senha utilizando bcrypt
export const loginUser = async (
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> => {
  const { email, password } = request.body as UserLoginDTO
  try {
    const user = await User.findOne({ email })
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
