import { Schema, model, Document, Types } from 'mongoose'
import { Input } from './input'

interface IIngredient {
  inventoryID: Types.ObjectId | typeof Input
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
      inventoryID: {
        type: Schema.Types.ObjectId,
        ref: 'Input',
        required: true,
      },
      name: { type: String, required: true },
      quantity: { type: Number, required: true, min: 0 },
    },
  ],
  createdAt: { type: Date, default: Date.now },
})

export default model<ProductDTO>('Product', ProductSchema)
