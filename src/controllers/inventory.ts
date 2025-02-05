import { FastifyRequest, FastifyReply } from 'fastify'
import Inventory, { InventoryDTO, Unity } from '../models/inventory'

interface BaseParams {
  params: {
    id: string
  }
}

export const getAllInventories = async (): Promise<InventoryDTO[]> => {
  // Popula o campo "input" se precisar dos dados do Input associado e ordena pela data do estoque
  return Inventory.find().populate('input').sort({ date: -1 })
}

export const getInventoryById = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const { id } = request.params as BaseParams['params']

  try {
    const inventoryItem = await Inventory.findById(id).populate('input')
    if (!inventoryItem) {
      return reply
        .status(404)
        .send({ message: 'Item de estoque não encontrado' })
    }
    return inventoryItem
  } catch (err) {
    console.error('Error fetching inventory item:', err)
    return reply.status(500).send({ message: 'Erro ao buscar item de estoque' })
  }
}

export const createInventory = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    // Espera que o corpo contenha a referência "input" e demais campos
    const body = request.body as {
      input: string
      date?: Date // opcional, caso não informado, usará Date.now
      quantity: number
      unity: Unity
      costPerUnit: string
    }

    // Verifica se já existe um registro de estoque para o mesmo Input
    const existingItem = await Inventory.findOne({ input: body.input })
    if (existingItem) {
      return reply.status(400).send({
        message:
          'Item de estoque para este input já existe. Use a atualização para modificar a quantidade.',
      })
    }

    const inventory = new Inventory({
      ...body,
      date: body.date || new Date(),
    })

    const savedInventory = await inventory.save()

    return {
      message: 'Item de estoque criado com sucesso',
      inventory: savedInventory,
    }
  } catch (err) {
    console.error('Error creating inventory:', err)
    return reply.status(500).send({ message: 'Erro ao criar item de estoque' })
  }
}

export const updateInventory = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const { id } = request.params as BaseParams['params']
  try {
    // Permite atualizar os campos de quantity, unity, costPerUnit, date e a referência input, se necessário
    const body = request.body as Partial<{
      quantity: number
      unity: Unity
      costPerUnit: string
      date: Date
      input: string
    }>

    const updateData: Partial<{
      quantity: number
      unity: Unity
      costPerUnit: string
      date: Date
      input: string
    }> = {
      quantity: body.quantity,
      unity: body.unity,
      costPerUnit: body.costPerUnit,
      date: body.date,
    }

    if (body.input) {
      updateData.input = body.input
    }

    const updatedInventory = await Inventory.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate('input')

    if (!updatedInventory) {
      return reply
        .status(404)
        .send({ message: 'Item de estoque não encontrado' })
    }

    return {
      message: 'Item de estoque atualizado com sucesso',
      inventory: updatedInventory,
    }
  } catch (err) {
    console.error('Error updating inventory:', err)
    return reply
      .status(500)
      .send({ message: 'Erro ao atualizar item de estoque' })
  }
}

export const deleteInventory = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const { id } = request.params as BaseParams['params']
  try {
    const deleted = await Inventory.findByIdAndDelete(id)
    if (!deleted) {
      return reply
        .status(404)
        .send({ message: 'Item de estoque não encontrado' })
    }
    return { message: 'Item de estoque deletado com sucesso' }
  } catch (err) {
    console.error('Error deleting inventory:', err)
    return reply
      .status(500)
      .send({ message: 'Erro ao deletar item de estoque' })
  }
}
