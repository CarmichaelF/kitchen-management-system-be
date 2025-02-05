import { Schema, model, Document } from 'mongoose'

export interface InputData extends Document {
  name: string
  date: Date
  stockLimit: number
}

const inputSchema = new Schema<InputData>({
  name: { type: String, required: true },
  date: { type: Date, required: true },
  stockLimit: { type: Number, required: true },
})

// Configuração para incluir virtuais no toObject/toJSON
inputSchema.set('toObject', { virtuals: true })
inputSchema.set('toJSON', { virtuals: true })

export const Input = model<InputData>('Input', inputSchema)
