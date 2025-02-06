import mongoose, { Schema } from 'mongoose'

const orderItemSchema = new mongoose.Schema({
  pricing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pricing',
    required: true,
  },
  quantity: { type: Number, required: true },
})

const orderSchema = new mongoose.Schema({
  items: { type: [orderItemSchema], required: true },
  totalPrice: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true }, // Novo campo: data limite
  notes: { type: String, required: false }, // Novo campo: observações (opcional)
  status: {
    type: String,
    enum: ['Não Iniciado', 'Em Andamento', 'Concluído'],
    default: 'Não Iniciado',
  },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  position: { type: Number, required: true },
})

export const Order = mongoose.model('Order', orderSchema)
