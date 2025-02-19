import { Schema, Document, Types, model } from 'mongoose'
import { Product } from './product'

export interface Pricing extends Document {
  product: Types.ObjectId | Product
  profitMargin: number
  platformFee: number
  sellingPrice: number
  createdAt: Date
  productionCost: number
  yields: number
}

const PricingSchema = new Schema<Pricing>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  profitMargin: { type: Number, required: true, min: 0 },
  platformFee: { type: Number, required: true, min: 0 },
  sellingPrice: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  productionCost: { type: Number, required: true },
  yields: { type: Number, required: true, min: 1 },
})

export default model<Pricing>('Pricing', PricingSchema)
