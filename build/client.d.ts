import { CheckoutOptions, Payment, RequestBalanceOptions, BalanceResponse, PaymentSession, PaymentListOptions } from './types.js';
interface Options {
    fetch: (url: string, init: RequestInit) => Promise<Response>;
}
export declare const defaultOptions: {
    fetch: (input: RequestInfo | URL, init?: RequestInit | undefined) => Promise<Response>;
};
export declare class ClientError extends Error {
    readonly code: number;
    readonly data?: any;
    constructor(code: number, message?: string, data?: any);
}
export declare class Client {
    private apiToken;
    private options;
    readonly env: string;
    /** Payment session client */
    readonly sessions: Sessions;
    /** Payment client */
    readonly payments: Payments;
    /** Balances client */
    readonly balances: Balances;
    /**
     * Initialize repaya client
     *
     * @param env - The environment to use. 'https://repaya.io' or 'https://goerli.repaya.io'
     * @param apiToken - The API token to use.
     */
    constructor(env: string, apiToken: string | null, opts?: Options);
    request<T>(path: string, method: 'get' | 'post', data?: Record<string, any>): Promise<T>;
}
export declare class Sessions {
    private client;
    constructor(client: Client);
    /**
     * Create a payment session to initiate the checkout flow
     *
     * @param formId - The id of the payment form
     * @param options - Checkout options
     * @returns Session with checkout url. Redirect customer to this url to start the checkout
     */
    create(formId: string, options: CheckoutOptions): Promise<PaymentSession>;
}
export declare class Payments {
    private client;
    constructor(client: Client);
    /**
     * Get payment by session ID
     *
     * @param sessionId - Payment session id
     * @returns Payment associated with this session if any
     */
    getBySession(sessionId: string): Promise<Payment | null>;
    /**
     * List all payments by payment form
     *
     * @param formId payment form ID
     * @param opts filters
     * @returns Paginated list of payments
     */
    list(formId: string, opts: PaymentListOptions): Promise<{
        items: Payment[];
        total: number;
        totalPages: number;
        page: number;
    } | null>;
}
export declare class Balances {
    private client;
    constructor(client: Client);
    /**
     * Get user balances by form ID
     *
     * @param formId - The id of the payment form
     * @param options - Request filters
     * @returns List of user balances
     */
    getAll(formId: string, opts: RequestBalanceOptions): Promise<BalanceResponse[]>;
}
export {};
