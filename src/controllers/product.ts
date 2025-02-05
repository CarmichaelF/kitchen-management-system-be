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
        inventoryID: string
        quantity: number
        unity: Unity
        name: string
      }[]
      // outros campos...
    }
    // Para cada ingrediente, verifica se há estoque suficiente
    for (const ingredient of productData.ingredients) {
      // Busca no Inventory o registro correspondente ao input do ingrediente
      const inventory = await Inventory.findOne({ _id: ingredient.inventoryID })
      const input = await Input.findOne({ _id: inventory?.input })
      if (!inventory) {
        reply.code(400).send({
          message: `Estoque não encontrado para o ingrediente ${input?.name}`,
        })
        return
      }

      // // Verifica se a unidade do estoque é compatível com a do ingrediente
      // if (inventory.unity !== ingredient.unity) {
      //   reply.code(400).send({
      //     message: `Unidade do estoque (${inventory.unity}) não corresponde à unidade do ingrediente (${ingredient.unity}).`,
      //   })
      //   return
      // }

      // Verifica se a quantidade disponível no estoque é suficiente
      if (inventory.quantity < ingredient.quantity) {
        reply.code(400).send({
          message: `Estoque insuficiente para o ingrediente ${input?.name}`,
        })
        return
      }
    }
    console.log('productData', productData)
    // Se todas as validações passaram, cria e salva o produto
    const product = new Product(productData)
    await product.save()
    reply.code(201).send(product)
  } catch (err) {
    console.error('Erro ao criar produto:', err)
    reply.code(500).send({ message: 'Erro ao criar produto' })
  }
}

export const getProducts = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    // Popula os dados dos ingredientes, trazendo o campo input (referenciado)
    const products = await Product.find()
    reply.send(products)
  } catch (err) {
    reply.code(500).send({ message: 'Erro ao buscar produtos' })
  }
}
