import { FastifyRequest, FastifyReply } from 'fastify'
import Product from '../models/product'
import Inventory, { Unity } from '../models/inventory'
import { Input } from '../models/input'

export const createProduct = async (
  req: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    // Supondo que req.body contenha os dados do produto, incluindo ingredients
    const productData = req.body as {
      name: string
      ingredients: {
        inventory: string
        quantity: number
        unity: Unity
        name: string
      }[]
    }
    // Para cada ingrediente, verifica se há estoque suficiente
    for (const ingredient of productData.ingredients) {
      // Busca no Inventory o registro correspondente ao input do ingrediente
      const inventory = await Inventory.findOne({ _id: ingredient.inventory })
      const input = await Input.findOne({ _id: inventory?.input })
      if (!inventory) {
        reply.code(400).send({
          message: `Estoque não encontrado para o ingrediente ${input?.name}`,
        })
        return
      }
      // Verifica se a quantidade disponível no estoque é suficiente
      if (inventory.quantity < ingredient.quantity) {
        reply.code(400).send({
          message: `Estoque insuficiente para o ingrediente ${input?.name}`,
        })
        return
      }
    }
    // Se todas as validações passaram, cria e salva o produto
    const product = new Product(productData)
    await product.save()
    reply.code(201).send(product)
  } catch (err) {
    console.error('Erro ao criar produto:', err)
    reply.code(500).send({ message: 'Erro ao criar produto' })
  }
}

export const updateProduct = async (
  req: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const { id } = req.params as { id: string } // Obtém o ID do produto da URL
    const productData = req.body as {
      name?: string // Propriedades opcionais para permitir a atualização parcial
      ingredients?: {
        inventory: string
        quantity: number
        unity: Unity
        name: string
      }[]
    }

    // Verifica se o produto existe
    const product = await Product.findById(id)
    if (!product) {
      reply.code(404).send({ message: 'Produto não encontrado' })
      return
    }

    // Se ingredientes foram passados na atualização, valida cada um
    if (productData.ingredients) {
      for (const ingredient of productData.ingredients) {
        const inventory = await Inventory.findOne({
          _id: ingredient.inventory,
        })
        const input = await Input.findOne({ _id: inventory?.input })
        if (!inventory) {
          reply.code(400).send({
            message: `Estoque não encontrado para o ingrediente ${input?.name}`,
          })
          return
        }

        // Verifica se há estoque suficiente
        if (inventory.quantity < ingredient.quantity) {
          reply.code(400).send({
            message: `Estoque insuficiente para o ingrediente ${input?.name}`,
          })
          return
        }
      }
    }

    // Atualiza o produto com os dados fornecidos
    await Product.findByIdAndUpdate(id, productData, { new: true })
    const updatedProduct = await Product.findById(id)

    reply.code(200).send(updatedProduct) // Retorna o produto atualizado
  } catch (err) {
    console.error('Erro ao atualizar produto:', err)
    reply.code(500).send({ message: 'Erro ao atualizar produto' })
  }
}

export const getProducts = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const products = await Product.find().populate('ingredients.inventory')
    reply.send(products)
  } catch (err) {
    console.log(err)
    reply.code(500).send({ message: 'Erro ao buscar produtos' })
  }
}
