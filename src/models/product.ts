import { Schema, Document, Types, model } from 'mongoose'
import { InventoryDTO } from './inventory'

export interface Ingredient {
  inventory: Types.ObjectId | InventoryDTO
  quantity: number
  name: string
}

export interface Product extends Document {
  name: string
  isDeleted: boolean
  ingredients: Ingredient[]
}

const ProductSchema = new Schema<Product>({
  name: { type: String, required: true },
  ingredients: [
    {
      inventory: {
        type: Schema.Types.ObjectId,
        ref: 'Inventory',
        required: true,
      },
      quantity: { type: Number, required: true },
      name: { type: String, required: true },
    },
  ],
  isDeleted: { type: Boolean, required: false, default: false },
})

export default model<Product>('Product', ProductSchema)
