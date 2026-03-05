export function formatCurrency(amount: number, currency = 'NGN', locale = 'en-NG', options: Intl.NumberFormatOptions = {}): string {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        ...options
    }).format(amount);
}
