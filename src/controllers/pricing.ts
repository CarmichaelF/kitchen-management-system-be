import Pricing from '../models/pricing'
import Product from '../models/product'
import Inventory from '../models/inventory'
import { FastifyReply, FastifyRequest } from 'fastify'

const calculateProductionCost = async (productId: string) => {
  const product = await Product.findById(productId)

  if (!product) {
    throw new Error('Produto não encontrado')
  }

  let totalCost = 0

  for (const ingredient of product.ingredients) {
    const inventory = await Inventory.findOne({ _id: ingredient.inventoryID })

    if (!inventory) {
      throw new Error(`Estoque não encontrado para ${ingredient.name}`)
    }

    const cost = parseFloat(String(inventory.costPerUnit).replace(',', '.'))

    if (isNaN(cost)) {
      throw new Error(`Custo inválido para o ingrediente ${ingredient.name}`)
    }

    // Agora multiplica pelo quantidade do ingrediente na receita
    totalCost += cost * ingredient.quantity
  }

  return totalCost
}

export const createPricing = async (
  req: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const { productId, profitMargin, additionalCosts, platformFee } =
      req.body as {
        productId: string
        profitMargin: number
        additionalCosts: number
        platformFee: number
      }

    if (platformFee >= 100) {
      return reply
        .code(400)
        .send({ message: 'Taxa da plataforma não pode ser 100% ou mais' })
    }

    let productionCost: number

    try {
      productionCost = await calculateProductionCost(productId)
    } catch (error: unknown) {
      if (error instanceof Error) {
        return reply.code(400).send({ message: error.message })
      } else {
        return reply.code(400).send({ message: 'Erro desconhecido' })
      }
    }

    if (productionCost === undefined) {
      return reply
        .code(400)
        .send({ message: 'Não foi possível calcular o custo de produção' })
    }

    const sellingPrice = (
      (productionCost * (1 + profitMargin / 100) + additionalCosts) /
      (1 - platformFee / 100)
    ).toFixed(2)

    const pricing = new Pricing({
      product: productId,
      profitMargin,
      additionalCosts,
      platformFee,
      sellingPrice: parseFloat(sellingPrice),
    })

    await pricing.save()

    reply.code(201).send(await pricing.populate('product'))
  } catch (err) {
    reply.code(500).send({ message: 'Erro ao criar precificação' })
  }
}

export const getPricings = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const pricings = await Pricing.find().populate('product')
    reply.send(pricings)
  } catch (err) {
    reply.code(500).send({ message: 'Erro ao buscar precificações' })
  }
}
