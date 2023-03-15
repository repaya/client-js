import { Payment, PaymentResponse } from "./types.js"

export function query(data: Record<string, any>): string {
    return Object.keys(data)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
        .join('&')
}

export function expandResponsePayment(response: PaymentResponse): Payment {
    return {
        ...response,
        customer: {
            ...response.customer,
            data: response.customer.data ? JSON.parse(response.customer.data) : null
        },
        product: {
            ...response.product,
            data: response.product.data ? JSON.parse(response.product.data) : null
        },
    }
}
