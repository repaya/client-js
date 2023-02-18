export type CoinCode = ('USD_MULTI_1' | 'ETH' | 'USDT' | 'USDC' | 'DAI' | string);
export interface IntegrationCheckoutOptions {
    /**
     * customer.id is used to match the sender of a payment with a user in your own database
     *
     * When it's not provided you will only be able to match customer payments by their crypto addresses
    */
    customer?: {
        id: string;
        data?: any;
    };
    /** Product information */
    product: {
        id: string;
        name: string;
        data?: any;
    };
    /** Product prices */
    price: {
        [coin: CoinCode]: string;
    };
}
export interface RequestCheckoutOptions {
    customer?: {
        id: string;
        data: any;
    };
}
export interface CommonCheckoutOptions {
    /** If provided, acts as an idempotency key for payments */
    clientId?: string;
}
export type CheckoutOptions = CommonCheckoutOptions & (IntegrationCheckoutOptions | RequestCheckoutOptions);
export interface PaymentSession {
    id: string;
    checkoutUrl: string;
}
export interface Payment {
    id: string;
    customer: {
        id: string | null;
        data: any;
    };
    product: {
        name: string | null;
        id: string | null;
        data: any;
    };
    sender: string;
    receiver: string;
    amount: string;
    paidAmount: string;
    status: 'completed' | 'pending' | 'failed' | 'canceled';
    coin: {
        code: string;
        name: string;
    };
    created: number;
}
export interface RequestBalanceOptions {
    customerId?: string;
    productId?: string;
    coin?: string;
}
export interface BalanceResponse {
    customerId: string | null;
    productId: string | null;
    balance: string;
    coin: {
        name: string;
        code: string;
    };
}
