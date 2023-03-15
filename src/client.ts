import {
    CheckoutOptions,
    Payment,
    RequestBalanceOptions,
    BalanceResponse,
    PaymentSession,
    PaymentListOptions,
    PaymentListResponse,
    PaymentResponse
} from './types.js'
import { expandResponsePayment, query } from './util.js'

interface Options {
    fetch: (url: string, init: RequestInit) => Promise<Response>
}

export const defaultOptions = {
    fetch: (...args: Parameters<typeof fetch>) => {
        if (typeof window !== 'undefined') return window.fetch(...args)
        return fetch(...args)
    }
}

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
    private apiToken: string | null
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
    constructor(env: string, apiToken: string | null, opts: Options = defaultOptions) {
        if (!/^https?:\/\/\w+(.\w+)+(:\d+)?$/.test(env)) {
            throw new Error(`invalid environment "${env}" must be one of: "https://repaya.io", "https://goerli.repaya.io"`)
        }

        if (apiToken !== null && (apiToken === '' || typeof apiToken !== 'string')) {
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

        const headers: Record<string, string> = {}
        if (this.apiToken) {
            headers['Authorization'] = `Bearer ${this.apiToken}`
        }

        const init: RequestInit = {
            method,
            headers
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

        const session = await this.client.request<PaymentSession>('/api/public/1/session', 'post', data)
        return session
    }
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

        return expandResponsePayment(response)
    }

    /**
     * List all payments by payment form
     * 
     * @param formId payment form ID
     * @param opts filters
     * @returns Paginated list of payments
     */
    async list(formId: string, opts: PaymentListOptions) {
        if (!formId) {
            throw new Error("formId cannot be empty")
        }

        let from = opts.from && typeof opts.from === 'string' ? new Date(opts.from) : opts.from
        let till = opts.till && typeof opts.till === 'string' ? new Date(opts.till) : opts.till

        const data: Record<string, any> = {
            formId,
            limit: opts.limit ?? 1000,
            page: opts.page ?? 1,
            sort: opts.sort ?? 'desc',
            fromTimestamp: from ? +from : 0,
            tillTimestamp: till ? +till : (Date.now() + 3600 * 1e3),
        }

        const response = await this.client.request<PaymentListResponse | null>('/api/public/1/payment/list', 'get', data)
        if (response === null) {
            return null
        }

        return {
            ...response,
            items: response.items.map(expandResponsePayment)
        }
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