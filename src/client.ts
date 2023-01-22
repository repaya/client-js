import { CheckoutOptions, Payment, RequestBalanceOptions, BalanceResponse } from './types.js'
import { query } from './util.js'

interface Options {
    fetch: (url: string, init: RequestInit) => Promise<Response>
}

export const defaultOptions = { fetch }

export class ClientError extends Error {
    readonly code: number
    readonly data?: any

    constructor(code: number, message?: string, data?: any) {
        super(message)
        this.code = code
        this.data = data
    }
}

export class Client {
    private apiToken: string
    private options: Options

    readonly env: string

    /** Payment session client */
    readonly sessions: Sessions = new Sessions(this)

    /** Payment client */
    readonly payments: Payments = new Payments(this)

    /** Balances client */
    readonly balances: Balances = new Balances(this)

    /**
     * Initialize repaya client
     * 
     * @param env - The environment to use. 'https://repaya.io' or 'https://goerli.repaya.io'
     * @param apiToken - The API token to use. 
     */
    constructor(env: string, apiToken: string, opts: Options = defaultOptions) {
        if (!/^https?:\/\/\w+(.\w+)+(:\d+)?$/.test(env)) {
            throw new Error(`invalid environment "${env}" must be one of: "https://repaya.io", "https://goerli.repaya.io"`)
        }

        if (apiToken === '' || typeof apiToken !== 'string') {
            throw new Error('invalid api token')
        }

        this.env = env
        this.apiToken = apiToken
        this.options = opts
    }

    async request<T>(path: string, method: 'get' | 'post', data?: Record<string, any>): Promise<T> {
        let url = `${this.env}${path}`
        if (method === 'get' && data) {
            url += `?${query(data)}`
        }

        const init: RequestInit = {
            method,
            headers: {
                'Authorization': `Bearer ${this.apiToken}`,
            }
        }

        if (method === 'post' && data) {
            init.body = JSON.stringify(data)
            const headers = init.headers! as Record<string, string>
            headers['Content-Type'] = 'application/json'
        }

        const response = await this.options.fetch(url, init)
        const responseData: {
            error?: { code: number, message: string, data: any },
            result: T
        } = await response.json()

        if (responseData.error) throw new ClientError(responseData.error.code, responseData.error.message, responseData.error.data)

        return responseData.result
    }
}

export class Sessions {
    private client: Client

    constructor(client: Client) {
        this.client = client
    }

    /**
     * Create a payment session to initiate the checkout flow
     *
     * @param formId - The id of the payment form
     * @param options - Checkout options
     * @returns Session with checkout url. Redirect customer to this url to start the checkout
     */
    async create(formId: string, options: CheckoutOptions) {
        if (!formId) {
            throw new Error("formId cannot be empty")
        }

        const data: Record<string, any> = {
            formLinkId: formId,
            clientId: options.clientId
        }

        if (options.customer) {
            data.customer = {
                id: options.customer.id
            }

            if (options.customer.data) {
                data.customer.data = JSON.stringify(options.customer.data)
            }
        }

        if ('product' in options) {
            data.product = {
                id: options.product.id,
                name: options.product.name
            }

            if (options.product.data) {
                data.product.data = JSON.stringify(options.product.data)
            }

            data.price = options.price
        }

        const session = await this.client.request<{ checkoutUrl: string }>('/api/public/1/session', 'post', data)
        return session
    }
}

type PaymentResponse = Payment & {
    customer: Payment['customer'] & { data: string }
    product: Payment['product'] & { data: string }
}

export class Payments {
    private client: Client

    constructor(client: Client) {
        this.client = client
    }

    /**
     * Get payment by session ID
     * 
     * @param sessionId - Payment session id
     * @returns Payment associated with this session if any
     */
    async getBySession(sessionId: string): Promise<Payment | null> {
        if (!sessionId) {
            throw new Error("sessionId cannot be empty")
        }

        const data: Record<string, any> = {
            sessionId
        }

        const response = await this.client.request<PaymentResponse | null>('/api/public/1/payment', 'get', data)
        if (response == null) {
            return null
        }

        const payment: Payment = {
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
        return payment
    }
}

export class Balances {
    private client: Client

    constructor(client: Client) {
        this.client = client
    }

    /**
     * Get user balances by form ID
     * 
     * @param formId - The id of the payment form
     * @param options - Request filters
     * @returns List of user balances
     */
    async getAll(formId: string, opts: RequestBalanceOptions) {
        if (!formId) {
            throw new Error("formId cannot be empty")
        }

        const data: Record<string, any> = {
            formLinkId: formId,
        }

        if (opts.customerId != null) {
            data.customerId = opts.customerId
        }

        if (opts.productId != null) {
            data.productId = opts.productId
        }

        if (opts.coin) {
            data.coin = opts.coin
        }

        const balances = await this.client.request<BalanceResponse[]>('/api/public/1/balance', 'get', data)
        return balances
    }
}