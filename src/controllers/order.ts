import { FastifyRequest, FastifyReply } from 'fastify'
import Pricing from '../models/pricing'
import Inventory from '../models/inventory'
import { Order } from '../models/order'
import { ProductDTO } from '../models/product'
import { Customer } from '../models/customer'

/**
 * Endpoint para criação de um pedido (encomenda/venda).
 *
 * O corpo da requisição deve conter:
 * {
 *   items: [
 *     {
 *       pricingId: string,  // ID da precificação do produto
 *       quantity: number    // Quantidade vendida para esse produto
 *     },
 *     ...
 *   ]
 * }
 *
 * Para cada item, o sistema:
 * - Busca a precificação e popula o produto.
 * - Para cada ingrediente do produto, calcula o total a subtrair:
 *       amount = ingrediente.quantity * quantidade_vendida.
 * - Se algum ingrediente tiver estoque insuficiente, retorna erro.
 * - Atualiza o estoque e soma o total de venda.
 * - Cria o pedido (Order) com os itens e totalPrice.
 */
export const createOrder = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    // Extrai os itens do pedido e os novos campos
    const { items, customerId, dueDate, notes } = req.body as {
      customerId: string
      items: { pricingId: string; quantity: number }[]
      dueDate: string // Novo campo: data limite
      notes?: string // Novo campo: observações (opcional)
    }

    // Verifica se o cliente existe
    const customer = await Customer.findById(customerId)
    if (!customer) {
      return reply.status(400).send({ message: 'Cliente não encontrado.' })
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return reply
        .code(400)
        .send({ message: 'Nenhum item de pedido foi fornecido.' })
    }

    let totalPrice = 0

    // Para cada item do pedido, processa o desconto no estoque e calcula o valor
    for (const orderItem of items) {
      // Busca a precificação e popula o campo 'product'
      const pricing = await Pricing.findById(orderItem.pricingId).populate<{
        product: ProductDTO
      }>('product')

      if (!pricing) {
        return reply.code(400).send({
          message: `Precificação com id ${orderItem.pricingId} não encontrada.`,
        })
      }
      const product = pricing.product
      if (!product) {
        return reply
          .code(400)
          .send({ message: 'Produto não encontrado para a precificação.' })
      }

      // Para cada ingrediente do produto, desconta do estoque
      for (const ingredient of product.ingredients) {
        // ingredient deve ter: inventoryID, quantity (a quantidade necessária para uma unidade do produto)
        const inventory = await Inventory.findById(ingredient.inventory)
        if (!inventory) {
          return reply.code(400).send({
            message: `Estoque não encontrado para o ingrediente ${ingredient.name}.`,
          })
        }
        // Quantidade a descontar = quantidade definida no produto * quantidade vendida
        const amountToSubtract = ingredient.quantity * orderItem.quantity
        if (inventory.quantity < amountToSubtract) {
          return reply.code(400).send({
            message: `Estoque insuficiente para o ingrediente ${ingredient.name}.`,
          })
        }
        // Atualiza a quantidade do estoque
        inventory.quantity -= amountToSubtract
        await inventory.save()
      }

      // Acumula o total: preço de venda da precificação * quantidade vendida
      totalPrice += pricing.sellingPrice * orderItem.quantity
    }

    // Cria e salva o pedido, associando-o ao cliente e incluindo os novos campos
    const order = new Order({
      customer: customerId,
      items: items.map((item) => ({
        pricing: item.pricingId,
        quantity: item.quantity,
      })),
      totalPrice,
      date: new Date(),
      dueDate: new Date(dueDate), // Novo campo: data limite
      notes, // Novo campo: observações (opcional)
      position: 0,
    })

    await order.save()

    return reply
      .status(201)
      .send({ message: 'Pedido criado com sucesso', order })
  } catch (err) {
    console.error('Erro ao criar pedido:', err)
    return reply.status(500).send({ message: 'Erro ao criar pedido' })
  }
}

export const updateOrderStatus = async (
  req: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const { id } = req.params as { id: string }
    const { status } = req.body as { status: string }

    // Validação do status
    const validStatuses = ['Não Iniciado', 'Em Andamento', 'Concluído']
    if (!validStatuses.includes(status)) {
      return reply.status(400).send({ message: 'Status inválido' })
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true }, // Retorna o documento atualizado
    ).populate('customer')

    if (!order) {
      return reply.status(404).send({ message: 'Pedido não encontrado' })
    }

    reply.send(order)
  } catch (err) {
    console.error('Erro ao atualizar status:', err)
    reply.status(500).send({ message: 'Erro ao atualizar status' })
  }
}

export const updateOrderPosition = async (
  req: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const { id } = req.params as { id: string }
    const { position } = req.body as { position: number }

    const order = await Order.findByIdAndUpdate(
      id,
      { position },
      { new: true },
    ).populate('customer')

    if (!order) {
      return reply.status(404).send({ message: 'Pedido não encontrado' })
    }

    reply.send(order)
  } catch (err) {
    console.error('Erro ao atualizar posição:', err)
    reply.status(500).send({ message: 'Erro ao atualizar posição' })
  }
}
export const getOrders = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const orders = await Order.find()
      .populate('customer')
      .populate('items.pricing')
    reply.send(orders)
  } catch (err) {
    console.error('Erro ao buscar pedidos:', err)
    return reply.status(500).send({ message: 'Erro ao buscar pedidos' })
  }
}
