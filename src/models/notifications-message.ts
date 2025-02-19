import { Schema, model } from 'mongoose'

const messageSchema = new Schema(
  {
    senderId: { type: String, required: true },
    recipientId: { type: String, required: false },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    messageType: {
      type: String,
      enum: ['order', 'notification-update'],
      default: 'order',
    },
    orderId: { type: String, required: false },
  },
  { versionKey: false },
)

const Message = model('Message', messageSchema)

export default Message
