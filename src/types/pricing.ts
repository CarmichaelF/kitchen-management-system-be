export interface PricingResponse {
  _id: string
  profitMargin: number
  tax: number
  platformFee: number
  createdAt: string
  input: {
    _id: string
    name: string
    cost: number
  }
}
