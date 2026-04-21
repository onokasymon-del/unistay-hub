export function formatPrice(amount: number, currency: string = "KES") {
  return `${currency} ${amount.toLocaleString("en-KE")}`;
}
