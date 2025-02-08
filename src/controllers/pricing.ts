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
    const inventory = await Inventory.findOne({ _id: ingredient.inventory })

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

const calculateSellingPrice = ({
  productionCost,
  profitMargin,
  additionalCosts,
  platformFee,
}: {
  productionCost: number
  profitMargin: number
  additionalCosts: number
  platformFee: number
}) => {
  const sellingPrice = (
    (productionCost * (1 + profitMargin / 100) + additionalCosts) /
    (1 - platformFee / 100)
  ).toFixed(2)

  return Number(sellingPrice)
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

    const sellingPrice = calculateSellingPrice({
      productionCost,
      profitMargin,
      additionalCosts,
      platformFee,
    })

    const pricing = new Pricing({
      product: productId,
      profitMargin,
      additionalCosts,
      platformFee,
      sellingPrice,
    })

    await pricing.save()

    reply.code(201).send(await pricing.populate('product'))
  } catch (err) {
    reply.code(500).send({ message: 'Erro ao criar precificação' })
  }
}

export const updatePricing = async (
  req: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const { pricingId, profitMargin, additionalCosts, platformFee } =
      req.body as {
        pricingId: string
        profitMargin?: number
        additionalCosts?: number
        platformFee?: number
      }

    const pricing = await Pricing.findById(pricingId)

    if (!pricing) {
      return reply.code(404).send({ message: 'Precificação não encontrada' })
    }

    if (platformFee !== undefined && platformFee >= 100) {
      return reply
        .code(400)
        .send({ message: 'Taxa da plataforma não pode ser 100% ou mais' })
    }

    if (profitMargin !== undefined) pricing.profitMargin = profitMargin
    if (additionalCosts !== undefined) pricing.additionalCosts = additionalCosts
    if (platformFee !== undefined) pricing.platformFee = platformFee

    // Recalcula o preço de venda
    const productionCost = await calculateProductionCost(
      pricing.product.toString(),
    )

    const sellingPrice = calculateSellingPrice({
      productionCost,
      profitMargin: profitMargin || pricing.profitMargin,
      additionalCosts: additionalCosts || pricing.additionalCosts,
      platformFee: platformFee || pricing.platformFee,
    })

    pricing.sellingPrice = sellingPrice

    await pricing.save()

    reply.send({
      ...(await pricing.populate('product')),
      message: 'Precificação atualizada com sucesso',
    })
  } catch (err) {
    reply.code(500).send({ message: 'Erro ao editar precificação' })
  }
}

export const deletePricing = async (
  req: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const { id } = req.params as { id: string }

    const pricing = await Pricing.findById(id)
    if (!pricing) {
      return reply.code(404).send({ message: 'Precificação não encontrada' })
    }

    await Pricing.findByIdAndDelete(id)
    return reply
      .code(200)
      .send({ message: 'Precificação deletada com sucesso' })
  } catch (error) {
    return reply
      .code(500)
      .send({ message: 'Erro ao deletar precificação', error })
  }
}

export const getPricings = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const pricings = await Pricing.find().populate('product')
    console.log('pricings', pricings)
    reply.send(pricings)
  } catch (err) {
    reply.code(500).send({ message: 'Erro ao buscar precificações' })
  }
}
