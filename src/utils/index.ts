export function parseStringToFloat(value: string): number {
  return parseFloat(value.replace(',', '.'))
}
