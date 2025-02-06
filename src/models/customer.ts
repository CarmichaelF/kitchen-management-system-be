import mongoose from 'mongoose'

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true }, // Novo campo para telefone
  address: { type: String, required: true }, // Novo campo para endereço
})

export const Customer = mongoose.model('Customer', customerSchema)
