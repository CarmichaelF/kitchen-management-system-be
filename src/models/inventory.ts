import { Schema, model, Types } from 'mongoose'

export type Unity = 'kg' | 'un'

export interface InventoryDTO {
  input: Types.ObjectId // referência ao Input, se necessário
  date: Date // data de criação do registro de estoque
  quantity: number // quantidade informada (em kg ou unidades)
  unity: Unity
  costPerUnit: string // custo informado (como string) por quilo ou por unidade
}

const inventorySchema = new Schema<InventoryDTO>(
  {
    input: { type: Schema.Types.ObjectId, ref: 'Input', required: true },
    date: { type: Date, required: true, default: Date.now },
    quantity: { type: Number, required: true, min: 0 },
    unity: { type: String, enum: ['kg', 'un'], required: true },
    costPerUnit: { type: String, required: true },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

const Inventory = model<InventoryDTO>('Inventory', inventorySchema)

export default Inventory
