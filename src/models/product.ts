import { Schema, model, Document, Types } from 'mongoose'
import Inventory from './inventory'

interface IIngredient {
  inventory: Types.ObjectId | typeof Inventory
  name: string
  quantity: number
}

export interface ProductDTO extends Document {
  name: string
  ingredients: IIngredient[]
  createdAt: Date
}

const ProductSchema = new Schema<ProductDTO>({
  name: { type: String, required: true, unique: true },
  ingredients: [
    {
      inventory: {
        type: Schema.Types.ObjectId,
        ref: 'Inventory',
        required: true,
      },
      name: { type: String, required: true },
      quantity: { type: Number, required: true, min: 0 },
    },
  ],
  createdAt: { type: Date, default: Date.now },
})

export default model<ProductDTO>('Product', ProductSchema)
