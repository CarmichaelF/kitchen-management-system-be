import { FastifyInstance } from 'fastify'
import {
  createInput,
  deleteInput,
  getAllInputs,
  getInputById,
  updateInput,
} from '../controllers/input'
import { createUser, loginUser, validateToken } from '../controllers/user'
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
  getFixedCosts,
  getPricings,
  recalculatePricing,
  updateFixedCosts,
  updatePricing,
} from '../controllers/pricing'
import {
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
} from '../controllers/product'
import {
  cancelOrder,
  createOrder,
  generateOrderReport,
  getOrderById,
  getOrders,
  getSalesAndProductionCost,
  updateOrderStatus,
} from '../controllers/order'
import {
  createCustomer,
  deleteCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
} from '../controllers/customer'
import { authMiddleware, requireRole } from '../middlewares/auth'
import { startWebsocket } from '../controllers/websocket'
import { getMessages } from '../controllers/notifications-message'

export async function routes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)
  // user
  app.post('/auth/register', createUser)
  app.post('/auth/login', loginUser)
  app.post('/auth/validate', validateToken)

  // input
  app.get('/input', getAllInputs)
  app.get('/input/:id', getInputById)
  app.post('/input', createInput)
  app.put('/input/:id', updateInput)
  app.delete(
    '/input/:id',
    { preHandler: requireRole(['admin', 'editor']) },
    deleteInput,
  )

  // inventory
  app.get('/inventory', getAllInventories)

  app.get('/inventory/:id', getInventoryById)

  app.post('/inventory', createInventory)

  app.put('/inventory/:id', updateInventory)

  app.delete(
    '/inventory/:id',
    { preHandler: requireRole(['admin', 'editor']) },
    deleteInventory,
  )

  // pricing

  // Criar nova precificação
  app.post('/pricing', createPricing)
  app.get('/pricing', getPricings)
  app.put('/pricing/:id', updatePricing)
  app.delete(
    '/pricing/:id',
    { preHandler: requireRole(['admin', 'editor']) },
    deletePricing,
  )
  app.post('/pricing/:pricingId/recalculate', recalculatePricing)
  app.get('/pricing/fixed-costs', getFixedCosts)
  app.post(
    '/pricing/fixed-costs',
    { preHandler: requireRole(['admin', 'editor']) },
    updateFixedCosts,
  )

  // products
  app.post('/product', createProduct)
  app.get('/product', getProducts)
  app.put('/product/:id', updateProduct)
  app.delete(
    '/product/:id',
    { preHandler: requireRole(['admin', 'editor']) },
    deleteProduct,
  )

  // order

  app.post('/order', createOrder)
  app.get('/order', getOrders)
  app.get('/order/:id', getOrderById)
  app.get('/order/sales', getSalesAndProductionCost)
  app.patch('/order/:id/status', updateOrderStatus)
  app.delete('/order/:id', cancelOrder)
  app.get('/order/notifications', getOrders)

  app.get('/orders/report', generateOrderReport)

  // customer
  app.post('/customer', createCustomer)
  app.get('/customer', getAllCustomers)
  app.get('/customer/:id', getCustomerById)
  app.put('/customer/:id', updateCustomer)
  app.delete(
    '/customer/:id',
    { preHandler: requireRole(['admin', 'editor']) },
    deleteCustomer,
  )

  // Rota para WebSocket
  app.get('/ws', { websocket: true }, startWebsocket)
  app.get('/notifications', getMessages)

  // iFood

  app.post('/webhook/ifood', async (request, reply) => {
    const pedido = request.body
    // Lógica para processar o pedido recebido
    // Por exemplo, salvar no banco de dados, atualizar status, etc.
    console.log('pedido', pedido)
    reply.code(200).send({ message: 'Pedido recebido com sucesso' })
  })
}
