import mongoose from 'mongoose'
import Product from '../models/product'
import Pricing from '../models/pricing'

async function runMigration() {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGO_URI as string, {})

    console.log('Conexão com o MongoDB estabelecida.')

    // 1. Verificar se o campo `yields` existe em `products`
    const productsWithYield = await Product.find({ yields: { $exists: true } })
    if (productsWithYield.length > 0) {
      console.log(
        `Encontrados ${productsWithYield.length} produtos com o campo 'yields'. Removendo...`,
      )

      // Remover o campo `yields` da coleção de produtos
      await Product.updateMany(
        { yields: { $exists: true } }, // Filtra documentos com o campo `yields`
        { $unset: { yields: '' } }, // Remove o campo `yields`
      )
      console.log('Campo `yields` removido da coleção de produtos.')
    } else {
      console.log('Nenhum produto com o campo `yields` encontrado.')
    }

    // 2. Adicionar o campo `yields` à coleção de precificações
    const pricingsWithoutYield = await Pricing.find({
      yields: { $exists: false },
    })
    if (pricingsWithoutYield.length > 0) {
      console.log(
        `Encontradas ${pricingsWithoutYield.length} precificações sem o campo 'yields'. Adicionando...`,
      )

      await Pricing.updateMany(
        { yields: { $exists: false } }, // Filtra documentos sem o campo `yields`
        { $set: { yields: 1 } }, // Define um valor padrão para `yields`
      )
      console.log('Campo `yields` adicionado à coleção de precificações.')
    } else {
      console.log('Todas as precificações já possuem o campo `yields`.')
    }

    console.log('Migração concluída com sucesso!')
  } catch (error) {
    console.error('Erro durante a migração:', error)
  } finally {
    // Desconectar do MongoDB
    await mongoose.disconnect()
    console.log('Conexão com o MongoDB encerrada.')
  }
}

runMigration()
