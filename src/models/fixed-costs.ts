// models/fixedCosts.ts
import { Schema, model, Document } from 'mongoose'

export interface FixedCosts extends Document {
  rent: number
  taxes: number
  utilities: number
  marketing: number
  accounting: number
  expectedMonthlySales: number // novo campo
}

const FixedCostsSchema = new Schema<FixedCosts>({
  rent: { type: Number, required: true },
  taxes: { type: Number, required: true },
  utilities: { type: Number, required: true },
  marketing: { type: Number, required: true },
  accounting: { type: Number, required: true },
  expectedMonthlySales: { type: Number, required: true },
})

export default model<FixedCosts>('FixedCosts', FixedCostsSchema)
