import { FastifyRequest, FastifyReply } from 'fastify'
import { Customer } from '../models/customer'

interface CustomerDTO {
  name: string
  email: string
  phone: string
  address: string
}

// Cria um novo cliente com telefone e endereço
export const createCustomer = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const { name, email, phone, address } = request.body as CustomerDTO
  try {
    const customer = new Customer({ name, email, phone, address })
    const savedCustomer = await customer.save()
    return reply.send({
      message: 'Cliente criado com sucesso',
      customer: savedCustomer,
    })
  } catch (err) {
    console.error('Erro ao criar cliente:', err)
    return reply.status(500).send({ message: 'Erro ao criar cliente' })
  }
}

// Retorna todos os clientes cadastrados
export const getAllCustomers = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const customers = await Customer.find()
    return reply.send(customers)
  } catch (err) {
    console.error('Erro ao buscar clientes:', err)
    return reply.status(500).send({ message: 'Erro ao buscar clientes' })
  }
}

// Retorna um cliente pelo ID
export const getCustomerById = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const { id } = request.params as { id: string }
  try {
    const customer = await Customer.findById(id)
    if (!customer) {
      return reply.status(404).send({ message: 'Cliente não encontrado' })
    }
    return reply.send(customer)
  } catch (err) {
    console.error('Erro ao buscar cliente:', err)
    return reply.status(500).send({ message: 'Erro ao buscar cliente' })
  }
}
