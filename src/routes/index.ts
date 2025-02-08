import { FastifyInstance } from 'fastify'
import {
  createInput,
  deleteInput,
  getAllInputs,
  getInputById,
  updateInput,
} from '../controllers/input'
import { createUser, loginUser } from '../controllers/user'
import {
  createInventory,
  deleteInventory,
  getAllInventories,
  getInventoryById,
  updateInventory,
} from '../controllers/inventory'
import {
  createPricing,
  deletePricing,
  getPricings,
  updatePricing,
} from '../controllers/pricing'
import {
  createProduct,
  getProducts,
  updateProduct,
} from '../controllers/product'
import {
  createOrder,
  getOrders,
  updateOrderPosition,
  updateOrderStatus,
} from '../controllers/order'
import {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
} from '../controllers/customer'

export async function routes(app: FastifyInstance) {
  // input
  app.get('/input', getAllInputs)
  app.get('/input/:id', getInputById)
  app.post('/input', createInput)
  app.put('/input/:id', updateInput)
  app.delete('/input/:id', deleteInput)

  // inventory
  app.get('/inventory', getAllInventories)

  app.get('/inventory/:id', getInventoryById)

  app.post('/inventory', createInventory)

  app.put('/inventory/:id', updateInventory)

  app.delete('/inventory/:id', deleteInventory)

  // pricing

  // Criar nova precificação
  app.post('/pricing', createPricing)
  app.get('/pricing', getPricings)
  app.put('/pricing/:id', updatePricing)
  app.delete('/pricing/:id', deletePricing)

  // products
  app.post('/product', createProduct)
  app.get('/product', getProducts)
  app.put('/product/:id', updateProduct)

  // user

  app.post('/auth/register', createUser)
  app.post('/auth/login', loginUser)

  // order

  app.post('/order', createOrder)
  app.get('/order', getOrders)
  app.patch('/order/:id/status', updateOrderStatus)
  app.patch('/order/:id/position', updateOrderPosition)

  // customer
  app.post('/customer', createCustomer)
  app.get('/customer', getAllCustomers)
  app.get('/customer/:id', getCustomerById)
  app.put('/customer/:id', updateCustomer)
}
