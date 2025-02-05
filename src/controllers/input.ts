import { FastifyRequest, FastifyReply } from 'fastify'
import { Input } from '../models/input'

interface Input {
  name: string
  date: Date
  stockLimit: number
}

interface BaseParams {
  params: {
    id: string
  }
}

export const getAllInputs = async (): Promise<Input[]> => {
  return Input.find()
}

export const getInputById = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const { id } = request.params as BaseParams['params']

  try {
    const input = await Input.findById(id)

    if (!input) {
      return reply.status(404).send({ message: 'Insumo não encontrado' })
    }

    return input
  } catch (err) {
    console.error('Error fetching input:', err)
    return reply.status(500).send({ message: 'Erro ao buscar insumo' })
  }
}

export const createInput = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const input = new Input({
      ...(request.body as Input),
    })
    const savedInput = await input.save()

    const response = {
      message: 'Insumo criado com sucesso',
      input: savedInput,
    }
    return response
  } catch (err) {
    console.error('Error creating input:', err)
    return reply.status(500).send({ message: 'Erro ao criar insumo' })
  }
}

interface UpdateInputReply extends FastifyReply {}

export const updateInput = async (
  request: FastifyRequest,
  reply: UpdateInputReply,
) => {
  const { id } = request.params as BaseParams['params']
  try {
    const body = request.body as Input
    const input = await Input.findByIdAndUpdate(
      id,
      {
        ...body,
      },
      { new: true },
    )

    const response = {
      message: 'Insumo atualizado com sucesso',
      input,
    }
    return response
  } catch (err) {
    console.error('Error updating input:', err)
    return reply.status(500).send({ message: 'Erro ao atualizar insumo' })
  }
}

export const deleteInput = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const { id } = request.params as BaseParams['params']

  try {
    await Input.findByIdAndDelete(id)
    return { message: 'Insumo deletado com sucesso' }
  } catch (err) {
    console.error('Error deleting input:', err)
    return reply.status(500).send({ message: 'Erro ao deletar insumo' })
  }
}
