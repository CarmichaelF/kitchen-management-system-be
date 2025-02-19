import { FastifyRequest, FastifyReply } from 'fastify'
import Product from '../models/product'
import Inventory, { Unity } from '../models/inventory'
import { Input } from '../models/input'

// Tipos atualizados
type ProductBody = {
  name: string
  yield: number
  ingredients: {
    inventory: string
    quantity: number
    unity: Unity
    name: string
  }[]
}

// Criar produto (atualizado com yield)
export const createProduct = async (
  req: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const productData = req.body as ProductBody

    // Validação do yield
    if (!productData.yield || productData.yield < 1) {
      return reply.code(400).send({
        message: 'Rendimento da receita deve ser maior que zero',
      })
    }

    // Verificação de estoque
    for (const ingredient of productData.ingredients) {
      const inventory = await Inventory.findOne({ _id: ingredient.inventory })
      const input = await Input.findOne({ _id: inventory?.input })

      if (!inventory) {
        return reply.code(400).send({
          message: `Estoque não encontrado para o ingrediente ${input?.name}`,
        })
      }

      if (inventory.quantity < ingredient.quantity) {
        return reply.code(400).send({
          message: `Estoque insuficiente para o ingrediente ${input?.name}`,
        })
      }
    }

    const product = new Product(productData)
    await product.save()

    reply.code(201).send(product)
  } catch (err) {
    console.error('Erro ao criar produto:', err)
    reply.code(500).send({ message: 'Erro ao criar produto' })
  }
}

// Atualizar produto (atualizado com yield)
export const updateProduct = async (
  req: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const { id } = req.params as { id: string }
    const productData = req.body as Partial<ProductBody>

    const product = await Product.findById(id)
    if (!product || product.isDeleted) {
      return reply.code(404).send({ message: 'Produto não encontrado' })
    }

    // Validação do yield se fornecido
    if (productData.yield !== undefined && productData.yield < 1) {
      return reply.code(400).send({
        message: 'Rendimento da receita deve ser maior que zero',
      })
    }

    // Verificação de estoque
    if (productData.ingredients) {
      for (const ingredient of productData.ingredients) {
        const inventory = await Inventory.findOne({ _id: ingredient.inventory })
        const input = await Input.findOne({ _id: inventory?.input })

        if (!inventory) {
          return reply.code(400).send({
            message: `Estoque não encontrado para o ingrediente ${input?.name}`,
          })
        }

        if (inventory.quantity < ingredient.quantity) {
          return reply.code(400).send({
            message: `Estoque insuficiente para o ingrediente ${input?.name}`,
          })
        }
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, productData, {
      new: true,
    })

    reply.code(200).send(updatedProduct)
  } catch (err) {
    console.error('Erro ao atualizar produto:', err)
    reply.code(500).send({ message: 'Erro ao atualizar produto' })
  }
}

// "Deletar" produto (mantido igual)
export const deleteProduct = async (
  req: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const { id } = req.params as { id: string }

    const product = await Product.findById(id)
    if (!product || product.isDeleted) {
      return reply.code(404).send({ message: 'Produto não encontrado' })
    }

    await Product.findByIdAndUpdate(id, { isDeleted: true })
    return reply.code(200).send({ message: 'Produto marcado como deletado' })
  } catch (error) {
    return reply.code(500).send({ message: 'Erro ao deletar produto', error })
  }
}

// Buscar produtos (atualizado para incluir yield)
export const getProducts = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const products = await Product.find({ isDeleted: false })
      .populate('ingredients.inventory')
      .select('name ingredients yield') // Garante que o yield seja retornado

    reply.send(products)
  } catch (err) {
    console.log(err)
    reply.code(500).send({ message: 'Erro ao buscar produtos' })
  }
}
