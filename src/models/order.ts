import mongoose, { Schema, Document, Types } from 'mongoose'
import { Pricing as PrigingDTO } from './pricing'
import { CustomerData } from './customer'

export interface OrderItem {
  pricing: PrigingDTO
  quantity: number
  pricingDetails: PrigingDTO
}

export interface Order extends Document {
  items: OrderItem[]
  totalPrice: number
  date: Date
  dueDate: Date
  notes?: string
  status: string
  customer: Types.ObjectId
  customerDetails: CustomerData
}

const orderItemSchema = new mongoose.Schema({
  pricing: { type: Schema.Types.ObjectId, ref: 'Pricing', required: true },
  quantity: { type: Number, required: true },
  pricingDetails: {
    type: Schema.Types.Mixed,
    required: false,
  },
})

const orderSchema = new mongoose.Schema({
  items: { type: [orderItemSchema], required: true },
  totalPrice: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  notes: { type: String, required: false },
  status: {
    type: String,
    enum: ['Não Iniciado', 'Em Andamento', 'Concluído', 'Cancelado'],
    default: 'Não Iniciado',
  },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  customerDetails: { type: Schema.Types.Mixed, required: true },
})

export default mongoose.model<Order>('Order', orderSchema)
