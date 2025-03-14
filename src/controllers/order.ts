import { FastifyRequest, FastifyReply } from 'fastify'
import Pricing, { Pricing as PricingDTO } from '../models/pricing'
import Inventory from '../models/inventory'
import Product, { Product as ProductDTO } from '../models/product'
import { Customer } from '../models/customer'
import Order from '../models/order'
import { webSocket } from '../server'
import { websocketController } from './websession'
import FixedCosts from '../models/fixed-costs'
import Message from '../models/notifications-message'

import ExcelJS from 'exceljs' // Importe o modelo de mensagem

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderOBJ: any = {}
  orderOBJ.items = []
  try {
    // Extrai os itens do pedido e os novos campos
    const { items, customerId, dueDate, notes } = req.body as {
      customerId: string
      items: {
        pricingId: string
        quantity: number
        pricingDetails: PricingDTO
      }[]
      dueDate: string
      notes?: string
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
      orderOBJ.items.push({
        pricing: orderItem.pricingId,
        quantity: orderItem.quantity,
        pricingDetails: pricing.toObject(),
      })

      // Acumula o total: preço de venda da precificação * quantidade vendida
      totalPrice += pricing.sellingPrice * orderItem.quantity
    }

    // Cria e salva o pedido, associando-o ao cliente e incluindo os novos campos
    orderOBJ.customer = customerId
    orderOBJ.customerDetails = customer.toObject()
    orderOBJ.totalPrice = totalPrice
    orderOBJ.date = new Date()
    orderOBJ.dueDate = new Date(dueDate)
    orderOBJ.notes = notes

    const finalOrder = new Order(orderOBJ)

    await finalOrder.save()

    webSocket.sendNotificationToClients<{ orderID: string; type: string }>({
      message: `Novo pedido criado com ID: ${finalOrder._id}`,
      data: {
        orderID: finalOrder.id,
        type: 'order',
      },
    })
    if (req.user?._id)
      await websocketController.saveMessage(
        req.user?._id,
        `Novo pedido criado com ID: ${finalOrder._id}`,
        undefined,
        'order',
        finalOrder.id,
      )

    return reply
      .status(201)
      .send({ message: 'Pedido criado com sucesso', finalOrder })
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

    // Se o status for "Concluído" ou "Cancelado", deleta a mensagem relacionada
    if (status === 'Concluído' || status === 'Cancelado') {
      await Message.deleteMany({ orderId: order.id })
    }

    webSocket.sendNotificationToClients<{ type: string }>({
      message: 'As notificações foram atualizadas.',
      data: {
        type: 'notifications-update',
      },
    })

    reply.send(order)
  } catch (err) {
    console.error('Erro ao atualizar status:', err)
    reply.status(500).send({ message: 'Erro ao atualizar status' })
  }
}

export const getOrders = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const orders = await Order.find()
      .populate({
        path: 'items.pricing', // Popula o campo pricing
        populate: {
          path: 'product', // Popula o campo product dentro de pricing
          model: 'Product', // Especifica o modelo para evitar ambiguidade
        },
      })
      .populate('customer')
    reply.send(orders)
  } catch (err) {
    console.error('Erro ao buscar pedidos:', err)
    return reply.status(500).send({ message: 'Erro ao buscar pedidos' })
  }
}

export const getSalesAndProductionCost = async (
  req: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const { startDate, endDate } = req.query as {
      startDate?: string
      endDate?: string
    }

    // Cria um filtro tipado para as datas
    const dateFilter: { $gte?: Date; $lte?: Date } = {}

    if (startDate) {
      const start = new Date(startDate)
      if (!isNaN(start.getTime())) {
        dateFilter.$gte = start
      }
    }

    if (endDate) {
      const end = new Date(endDate)
      if (!isNaN(end.getTime())) {
        dateFilter.$lte = end
      }
    }

    // Filtra os pedidos com base nas datas e status
    const orders = await Order.find({
      ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
      status: 'Concluído',
    }).populate('customer')

    let totalSales = 0
    let totalProductionCost = 0

    for (const order of orders) {
      totalSales += order.totalPrice
      for (const item of order.items) {
        const product = await Product.findById(item.pricingDetails.product._id)

        if (!product) {
          return reply.status(404).send({ message: 'Produto não encontrado' })
        }

        totalProductionCost +=
          item.pricingDetails.productionCost * item.quantity
      }
    }

    // Busca os custos fixos (assumindo que há apenas um registro)
    const fixedCosts = await FixedCosts.findOne()

    if (!fixedCosts) {
      return reply.status(404).send({ message: 'Custos fixos não encontrados' })
    }

    // Soma os custos fixos
    const totalFixedCosts =
      fixedCosts.rent +
      fixedCosts.taxes +
      fixedCosts.utilities +
      fixedCosts.marketing +
      fixedCosts.accounting

    return reply.status(200).send({
      totalSales,
      totalProductionCost,
      totalFixedCosts,
      netProfit: totalSales - (totalProductionCost + totalFixedCosts),
    })
  } catch (err) {
    console.error('Erro ao calcular vendas e custo de produção:', err)
    return reply
      .status(500)
      .send({ message: 'Erro ao calcular vendas e custo de produção' })
  }
}

export const getOrderById = async (
  req: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const { id } = req.params as { id: string }

    // Busca o pedido pelo ID fornecido
    const order = await Order.findById(id)
      .populate({
        path: 'items.pricing', // Popula o campo pricing
        populate: {
          path: 'product', // Popula o campo product dentro de pricing
          model: 'Product', // Especifica o modelo para evitar ambiguidade
        },
      })
      .populate('customer') // Popula as informações do cliente

    if (!order) {
      return reply.status(404).send({ message: 'Pedido não encontrado' })
    }

    // Retorna o pedido encontrado
    return reply.status(200).send(order)
  } catch (err) {
    console.error('Erro ao buscar pedido por ID:', err)
    return reply.status(500).send({ message: 'Erro ao buscar pedido' })
  }
}

export const cancelOrder = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = req.params as { id: string }

    // Busca o pedido
    const order = await Order.findById(id).populate('items.pricing')
    if (!order) {
      return reply.status(404).send({ message: 'Pedido não encontrado' })
    }

    // Se o pedido já estiver cancelado, retorna erro
    if (order.status === 'Cancelado') {
      return reply.status(400).send({ message: 'Pedido já foi cancelado' })
    }

    // Para cada item, restaura os ingredientes ao estoque
    for (const item of order.items) {
      const pricing = item.pricing
      const product = await Product.findById(pricing?.product).populate(
        'ingredients',
      )

      if (!product) {
        return reply.status(404).send({ message: 'Produto não encontrado' })
      }

      for (const ingredient of product.ingredients) {
        const inventory = await Inventory.findById(ingredient.inventory)
        if (!inventory) {
          return reply.status(404).send({ message: 'Estoque não encontrado' })
        }

        // Reverte a quantidade descontada do estoque
        inventory.quantity += ingredient.quantity * item.quantity
        await inventory.save()
      }
    }

    webSocket.sendNotificationToClients<{ type: string }>({
      message: 'As notificações foram atualizadas.',
      data: {
        type: 'notifications-update',
      },
    })

    // Atualiza o status do pedido para "Cancelado"
    order.status = 'Cancelado'
    await order.save()

    // Deleta a mensagem relacionada ao pedido
    await Message.deleteMany({ orderId: order.id })

    return reply
      .status(200)
      .send({ message: 'Pedido cancelado com sucesso', order })
  } catch (err) {
    console.error('Erro ao cancelar pedido:', err)
    return reply.status(500).send({ message: 'Erro ao cancelar pedido' })
  }
}

export const generateOrderReport = async (
  req: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const { startDate, endDate, status } = req.query as {
      startDate?: string
      endDate?: string
      status?: string
    }

    // Construir filtro de datas e status
    const filter = {} as { date: { $gte?: Date; $lte?: Date }; status: string }
    if (startDate || endDate) {
      filter.date = {}
      if (startDate) {
        const start = new Date(startDate)
        if (!isNaN(start.getTime())) filter.date.$gte = start
      }
      if (endDate) {
        const end = new Date(endDate)
        if (!isNaN(end.getTime())) filter.date.$lte = end
      }
    }
    if (status) filter.status = status

    // Buscar ordens com os filtros
    const orders = await Order.find(filter).populate({
      path: 'items.pricing',
      populate: { path: 'product', model: 'Product' },
    })

    // Criar workbook e worksheet
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Relatório de Pedidos')

    // Definir colunas
    worksheet.columns = [
      { header: 'ID do Pedido', key: 'orderId', width: 25 },
      { header: 'Cliente', key: 'customerName', width: 30 },
      { header: 'Número de telefone', key: 'phone', width: 20 },
      { header: 'Email', key: 'email', width: 20 },
      { header: 'Endereço', key: 'address', width: 20 },
      { header: 'Data do Pedido', key: 'orderDate', width: 15 },
      { header: 'Data de Entrega', key: 'dueDate', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Produto', key: 'productName', width: 30 },
      { header: 'Quantidade', key: 'quantity', width: 10 },
      {
        header: 'Preço Unitário (R$)',
        key: 'unitPrice',
        width: 18,
        style: { numFmt: '"R$" #,##0.00' },
      },
      {
        header: 'Total Item (R$)',
        key: 'totalPerItem',
        width: 18,
        style: { numFmt: '"R$" #,##0.00' },
      },
      {
        header: 'Custo Produção (R$)',
        key: 'productionCost',
        width: 20,
        style: { numFmt: '"R$" #,##0.00' },
      },
      {
        header: 'Lucro(iFood) (R$)',
        key: 'profitWithPlatformFee',
        width: 18,
        style: { numFmt: '"R$" #,##0.00' },
      },
      {
        header: 'Lucro (R$)',
        key: 'profitWithoutPlatformFee',
        width: 18,
        style: { numFmt: '"R$" #,##0.00' },
      },
      { header: 'Observações', key: 'notes', width: 40 },
      {
        header: 'Total Pedido (R$)',
        key: 'totalOrderPrice',
        width: 20,
        style: { numFmt: '"R$" #,##0.00' },
      },
    ]

    // Preencher dados
    for (const order of orders) {
      for (const item of order.items) {
        const pricing = item.pricing
        if (!pricing) continue
        const product = pricing.product as ProductDTO
        if (!product) continue

        const unitPrice = pricing.sellingPrice
        const quantity = item.quantity
        const totalPerItem = unitPrice * quantity
        const productionCost = pricing.productionCost * quantity
        const profitWithoutPlatformFee = totalPerItem - productionCost

        const platformTransfer = totalPerItem * (pricing.platformFee / 100)

        const profitWithPlatformFee =
          totalPerItem - platformTransfer - productionCost

        worksheet.addRow({
          orderId: order._id,
          customerName: order.customerDetails?.name || 'N/A',
          phone: order.customerDetails.phone || 'N/A',
          email: order.customerDetails.email || 'N/A',
          address: order.customerDetails.address || 'N/A',
          orderDate: order.date.toISOString().split('T')[0],
          dueDate: order.dueDate.toISOString().split('T')[0],
          status: order.status,
          productName: product.name,
          quantity,
          unitPrice,
          totalPerItem,
          productionCost,
          profitWithoutPlatformFee,
          profitWithPlatformFee,
          notes: order.notes || '',
          totalOrderPrice: order.totalPrice,
        })
      }
    }

    // Configurar cabeçalhos da resposta
    reply.header(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    reply.header(
      'Content-Disposition',
      'attachment; filename=relatorio_pedidos.xlsx',
    )

    // Enviar o buffer do Excel
    const buffer = await workbook.xlsx.writeBuffer()
    reply.send(buffer)
  } catch (err) {
    console.error('Erro ao gerar relatório:', err)
    reply.status(500).send({ message: 'Erro ao gerar relatório' })
  }
}
