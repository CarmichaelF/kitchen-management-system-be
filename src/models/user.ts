import mongoose, { Document, Model, Schema } from 'mongoose'

// Definindo a interface para o usuário
export interface IUser {
  name: string
  email: string
  password: string
  role: 'admin' | 'user'
}

// Estendendo o Document com a interface IUser
export interface IUserDocument extends IUser, Document<string> {}

// Criando o Schema
const userSchema = new Schema<IUserDocument>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['admin', 'editor', 'user'] },
})

// Criando o Model com a tipagem correta
export const User: Model<IUserDocument> = mongoose.model<IUserDocument>(
  'User',
  userSchema,
)
