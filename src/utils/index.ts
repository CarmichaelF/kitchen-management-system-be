export function parseStringToFloat(value: string): number {
  return parseFloat(value.replace(',', '.'))
}

export const roundToNearest90 = (price: number): number => {
  return Math.round(price) + 0.9
}
