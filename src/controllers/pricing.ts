import Pricing from '../models/pricing'
import Product from '../models/product'
import Inventory from '../models/inventory'
import { FastifyReply, FastifyRequest } from 'fastify'
import FixedCosts from '../models/fixed-costs'

// Calcula o custo de produção do produto (sem alterações)
const calculateProductionCost = async (productId: string, yields: number) => {
  const product = await Product.findOne({ _id: productId, isDeleted: false })
  if (!product) {
    throw new Error('Produto não encontrado ou foi deletado')
  }

  if (yields <= 0) {
    throw new Error('Rendimento deve ser maior que zero')
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

    if (isNaN(ingredient.quantity)) {
      throw new Error(
        `Quantidade inválida para o ingrediente ${ingredient.name}`,
      )
    }

    totalCost += cost * ingredient.quantity
  }

  // Calcula o custo por unidade dividindo pelo rendimento
  const costPerUnit = totalCost / yields
  return Number(costPerUnit.toFixed(2))
}

const calculateSellingPrice = ({
  productionCost,
  profitMargin,
  fixedCosts,
  platformFee,
}: {
  productionCost: number
  profitMargin: number
  fixedCosts: {
    rent: number
    taxes: number
    utilities: number
    marketing: number
    accounting: number
    expectedMonthlySales: number
  }
  platformFee: number
}) => {
  if (platformFee >= 100) {
    throw new Error('Taxa da plataforma não pode ser 100% ou mais')
  }
  if (fixedCosts.expectedMonthlySales <= 0) {
    throw new Error('A quantidade de vendas esperada deve ser maior que zero')
  }
  const totalFixedCosts =
    fixedCosts.rent +
    fixedCosts.taxes +
    fixedCosts.utilities +
    fixedCosts.marketing +
    fixedCosts.accounting
  const fixedCostPerUnit = totalFixedCosts / fixedCosts.expectedMonthlySales
  const sellingPrice = (
    ((productionCost + fixedCostPerUnit) * (1 + profitMargin / 100)) /
    (1 - platformFee / 100)
  ).toFixed(2)
  return Number(sellingPrice)
}

export const createPricing = async (
  req: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const { productId, profitMargin, platformFee, yields } = req.body as {
      productId: string
      profitMargin: number
      platformFee: number
      yields: number // Novo campo
    }

    if (isNaN(profitMargin)) {
      return reply.code(400).send({ message: 'Margem de lucro inválida' })
    }
    if (isNaN(platformFee)) {
      return reply.code(400).send({ message: 'Taxa da plataforma inválida' })
    }
    if (isNaN(yields) || yields < 1) {
      return reply.code(400).send({ message: 'Rendimento inválido' })
    }

    const product = await Product.findOne({ _id: productId, isDeleted: false })
    if (!product) {
      return reply
        .code(400)
        .send({ message: 'Produto não encontrado ou foi deletado' })
    }

    const fixedCosts = await FixedCosts.findOne({})
    if (!fixedCosts) {
      return reply
        .code(500)
        .send({ message: 'Custos fixos globais não configurados' })
    }

    const productionCost = await calculateProductionCost(productId, yields)
    const sellingPrice = calculateSellingPrice({
      productionCost,
      profitMargin,
      fixedCosts: fixedCosts.toObject(),
      platformFee,
    })

    const pricing = new Pricing({
      product: productId,
      profitMargin,
      platformFee,
      sellingPrice,
      productionCost,
      yields, // Novo campo
    })

    await pricing.save()
    reply.code(201).send(await pricing.populate('product'))
  } catch (err) {
    console.error('Erro ao criar precificação:', err)
    reply.code(500).send({ message: 'Erro ao criar precificação', error: err })
  }
}

// Atualiza uma precificação (sem fixedCosts no corpo, pois usa os globais)
export const updatePricing = async (
  req: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const { pricingId, profitMargin, platformFee, yields } = req.body as {
      pricingId: string
      profitMargin?: number
      platformFee?: number
      yields?: number // Novo campo
    }

    if (
      profitMargin === undefined &&
      platformFee === undefined &&
      yields === undefined
    ) {
      return reply
        .code(400)
        .send({ message: 'Nenhum campo para atualização fornecido' })
    }

    const pricing = await Pricing.findById(pricingId)
    if (!pricing) {
      return reply.code(404).send({ message: 'Precificação não encontrada' })
    }

    const product = await Product.findOne({
      _id: pricing.product,
      isDeleted: false,
    })
    if (!product) {
      return reply
        .code(400)
        .send({ message: 'Produto foi deletado e não pode ser atualizado' })
    }

    if (profitMargin !== undefined) pricing.profitMargin = profitMargin
    if (platformFee !== undefined) pricing.platformFee = platformFee
    if (yields !== undefined) pricing.yields = yields // Novo campo

    const fixedCosts = await FixedCosts.findOne({})
    if (!fixedCosts) {
      return reply
        .code(500)
        .send({ message: 'Custos fixos globais não configurados' })
    }

    const productionCost = await calculateProductionCost(
      pricing.product.toString(),
      yields || pricing.yields,
    )
    pricing.productionCost = productionCost
    const sellingPrice = calculateSellingPrice({
      productionCost,
      profitMargin: profitMargin ?? pricing.profitMargin,
      fixedCosts: fixedCosts.toObject(),
      platformFee: platformFee ?? pricing.platformFee,
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

// Recalcula uma precificação usando os fixedCosts globais (ajuste similar ao updatePricing)
export const recalculatePricing = async (
  req: FastifyRequest<{ Params: { pricingId: string } }>,
  reply: FastifyReply,
) => {
  try {
    const { pricingId } = req.params
    if (!/^[0-9a-fA-F]{24}$/.test(pricingId)) {
      return reply.code(400).send({ message: 'ID da precificação inválido' })
    }
    const pricing = await Pricing.findById(pricingId).populate('product')
    if (!pricing) {
      return reply.code(404).send({ message: 'Precificação não encontrada' })
    }
    const product = await Product.findOne({
      _id: pricing.product.id,
      isDeleted: false,
    })
    if (!product) {
      return reply
        .code(400)
        .send({ message: 'Produto associado foi deletado ou não existe' })
    }
    const fixedCosts = await FixedCosts.findOne({})
    if (!fixedCosts) {
      return reply
        .code(500)
        .send({ message: 'Custos fixos globais não configurados' })
    }
    const productionCost = await calculateProductionCost(
      pricing.product.id.toString(),
      pricing.yields,
    )
    const sellingPrice = calculateSellingPrice({
      productionCost,
      profitMargin: pricing.profitMargin,
      fixedCosts: fixedCosts.toObject(),
      platformFee: pricing.platformFee,
    })
    pricing.productionCost = productionCost
    pricing.sellingPrice = sellingPrice
    await pricing.save()
    reply.send({
      ...pricing.toObject(),
      message: 'Precificação recalculada com sucesso',
    })
  } catch (err) {
    console.error('Erro ao recalcular precificação:', err)
    reply.code(500).send({ message: 'Erro ao recalcular precificação' })
  }
}

// Endpoints para FixedCosts Globais

export const getFixedCosts = async (
  req: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const fixedCosts = await FixedCosts.findOne({})
    if (!fixedCosts) {
      return reply.code(404).send({ message: 'Custos fixos não configurados' })
    }
    reply.send(fixedCosts)
  } catch (err) {
    reply.code(500).send({ message: 'Erro ao buscar custos fixos', error: err })
  }
}

export const updateFixedCosts = async (
  req: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const {
      rent,
      taxes,
      utilities,
      marketing,
      accounting,
      expectedMonthlySales,
    } = req.body as {
      rent: number
      taxes: number
      utilities: number
      marketing: number
      accounting: number
      expectedMonthlySales: number
    }

    let fixedCosts = await FixedCosts.findOne({})
    if (!fixedCosts) {
      fixedCosts = new FixedCosts({
        rent,
        taxes,
        utilities,
        marketing,
        accounting,
        expectedMonthlySales,
      })
    } else {
      fixedCosts.rent = rent
      fixedCosts.taxes = taxes
      fixedCosts.utilities = utilities
      fixedCosts.marketing = marketing
      fixedCosts.accounting = accounting
      fixedCosts.expectedMonthlySales = expectedMonthlySales
    }

    await fixedCosts.save()
    reply.send({ message: 'Custos fixos atualizados com sucesso', fixedCosts })
  } catch (err) {
    reply
      .code(500)
      .send({ message: 'Erro ao atualizar custos fixos', error: err })
  }
}

// Função para deletar uma precificação
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

// Função para buscar todas as precificações
export const getPricings = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const pricings = await Pricing.find({})
      .populate({
        path: 'product',
        match: { isDeleted: false },
      })
      .exec()

    const validPricings = pricings.filter((p) => p.product !== null)
    reply.send(validPricings)
  } catch (err) {
    console.error('Erro ao buscar precificações:', err)
    reply.code(500).send({ message: 'Erro ao buscar precificações' })
  }
}
