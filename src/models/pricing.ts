import { Schema, model, Document, Types } from 'mongoose'
import Product from './product'

interface Pricing extends Document {
  product: Types.ObjectId | typeof Product
  profitMargin: number
  additionalCosts: number
  platformFee: number
  sellingPrice: number
  createdAt: Date
}

const PricingSchema = new Schema<Pricing>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  profitMargin: { type: Number, required: true, min: 0 },
  additionalCosts: { type: Number, required: true, min: 0 },
  platformFee: { type: Number, required: true, min: 0 },
  sellingPrice: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
})

export default model<Pricing>('Pricing', PricingSchema)
