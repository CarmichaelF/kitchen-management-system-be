import { IUserDocument } from '../models/user'

declare module 'fastify' {
  interface FastifyRequest {
    user?: IUserDocument
  }
}
