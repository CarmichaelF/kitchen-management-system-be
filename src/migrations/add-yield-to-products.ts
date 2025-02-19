import mongoose from 'mongoose'
import Product from '../models/product'

async function runMigration() {
  try {
    await mongoose.connect(process.env.MONGO_URI as string)

    const result = await Product.updateMany(
      { yield: { $exists: false } },
      { $set: { yield: 1 } },
    )

    console.log(
      `Migração concluída. Documentos atualizados: ${result.modifiedCount}`,
    )
  } catch (error) {
    console.error('Erro na migração:', error)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
  }
}

runMigration()
