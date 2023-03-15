import { Client, ClientError, defaultOptions } from "./client.js"
import { PaymentResponse } from "./types.js"
import { expandResponsePayment } from "./util.js"

interface LastRequest {
    url: URL | null
    method: string | null
    body: any | null
    headers: Record<string, string> | null
}

interface Mock {
    last(): LastRequest
    response(next: Response): void
    fetch(url: string, init: RequestInit): Promise<Response>
}

function createMock(): Mock {
    let last: LastRequest
    let next: Response

    return {
        last() {
            return last
        },
        response(response: Response) {
            next = response
        },
        async fetch(url: string, init: RequestInit) {
            last = {
                url: null,
                method: null,
                body: null,
                headers: null
            }

            last.url = new URL(url)
            last.method = init.method ?? 'get'
            last.body = init.body ? JSON.parse(init.body.toString()) : null
            last.headers = init.headers as Record<string, string>

            return next as Response
        }
    }
}

function jsonResponse(data: any): Response {
    const response = new Response(null, {
        status: 200,
        headers: {
            'Content-Type': 'application/json'
        }
    })

    response.json = () => Promise.resolve(data)

    return response
}

async function expectToReject(fn: () => Promise<any>) {
    try {
        await fn()
    } catch (error) {
        expect(error).toBeInstanceOf(Error)
        return
    }
    fail()
}

const env = 'https://repaya.io'
const token = 'API_TOKEN'
const mock = createMock()

test('test client not created with invalid params', () => {
    expect(() => {
        new Client('example.com', token, { fetch: mock.fetch })
    }).toThrow()

    expect(() => {
        new Client(env, '', { fetch: mock.fetch })
    }).toThrow()
})

test('test client uses default options', () => {
    const client = new Client(env, token)
    // @ts-ignore
    expect(client.options).toStrictEqual(defaultOptions)
})

test('test basic payment session is created', async () => {
    const client = new Client(env, token, { fetch: mock.fetch })

    mock.response(jsonResponse({ result: { checkoutUrl: 'CHECKOUT_URL' } }))

    await expectToReject(async () => await client.sessions.create('', {}))

    const session = await client.sessions.create('FORM_ID', {})
    const request = mock.last()

    expect(request.url?.href).toBe('https://repaya.io/api/public/1/session');
    expect(request.method).toBe('post')
    expect(request.headers).toStrictEqual({
        'Authorization': 'Bearer API_TOKEN',
        'Content-Type': 'application/json'
    })
    expect(request.body).toStrictEqual({ formLinkId: 'FORM_ID' })
    expect(session.checkoutUrl).toBe('CHECKOUT_URL')
})

test('test basic payment session is created without apiToken', async () => {
    const client = new Client(env, null, { fetch: mock.fetch })

    mock.response(jsonResponse({ result: { checkoutUrl: 'CHECKOUT_URL' } }))

    await expectToReject(async () => await client.sessions.create('', {}))

    const session = await client.sessions.create('FORM_ID', {})
    const request = mock.last()

    expect(request.url?.href).toBe('https://repaya.io/api/public/1/session');
    expect(request.method).toBe('post')
    expect(request.headers).toStrictEqual({
        'Content-Type': 'application/json'
    })
    expect(request.body).toStrictEqual({ formLinkId: 'FORM_ID' })
    expect(session.checkoutUrl).toBe('CHECKOUT_URL')
})

test('test basic customer payment session is created', async () => {
    const client = new Client(env, token, { fetch: mock.fetch })

    mock.response(jsonResponse({ result: { checkoutUrl: 'CHECKOUT_URL' } }))
    const session = await client.sessions.create('FORM_ID', {
        customer: {
            id: 'CUSTOMER_ID',
            data: { customer: "FOO" }
        }
    })
    const request = mock.last()

    expect(request.url?.href).toBe('https://repaya.io/api/public/1/session');
    expect(request.method).toBe('post')
    expect(request.headers).toStrictEqual({
        'Authorization': 'Bearer API_TOKEN',
        'Content-Type': 'application/json'
    })
    expect(request.body).toStrictEqual({
        formLinkId: 'FORM_ID',
        customer: {
            id: 'CUSTOMER_ID',
            data: JSON.stringify({ customer: 'FOO' })
        }
    })

    expect(session.checkoutUrl).toBe('CHECKOUT_URL')
})

test('test basic product payment session is created', async () => {
    const client = new Client(env, token, { fetch: mock.fetch })

    mock.response(jsonResponse({ result: { checkoutUrl: 'CHECKOUT_URL' } }))
    const session = await client.sessions.create('FORM_ID', {
        customer: {
            id: 'CUSTOMER_ID',
            data: { customer: "FOO" }
        },
        product: {
            id: 'PRODUCT_ID',
            name: 'PRODUCT_NAME',
            data: { product: "BAR" }
        }
    })
    const request = mock.last()

    expect(request.url?.href).toBe('https://repaya.io/api/public/1/session');
    expect(request.method).toBe('post')
    expect(request.headers).toStrictEqual({
        'Authorization': 'Bearer API_TOKEN',
        'Content-Type': 'application/json'
    })
    expect(request.body).toStrictEqual({
        formLinkId: 'FORM_ID',
        customer: {
            id: 'CUSTOMER_ID',
            data: JSON.stringify({ customer: 'FOO' })
        },
        product: {
            id: 'PRODUCT_ID',
            name: 'PRODUCT_NAME',
            data: JSON.stringify({ product: 'BAR' })
        }
    })

    expect(session.checkoutUrl).toBe('CHECKOUT_URL')
})

test('test error response handling', async () => {
    const client = new Client(env, token, { fetch: mock.fetch })

    const data = { errorData: 'DATA' }
    mock.response(jsonResponse({ error: { code: 42, message: 'MSG', data } }))
    try {
        await client.request('/test', 'post', { request: 'REQUEST' })
    } catch (error) {
        expect(error instanceof ClientError).toBeTruthy()
        expect((error as ClientError).code).toBe(42)
        expect((error as ClientError).message).toBe('MSG')
        expect((error as ClientError).data).toStrictEqual(data)
    }

    const request = mock.last()

    expect(request.url?.href).toBe('https://repaya.io/test');
    expect(request.method).toBe('post')
    expect(request.headers).toStrictEqual({
        'Authorization': 'Bearer API_TOKEN',
        'Content-Type': 'application/json'
    })
    expect(request.body).toStrictEqual({ request: 'REQUEST' })
})

test('test get payment by session', async () => {
    const client = new Client(env, token, { fetch: mock.fetch })

    const data = {
        id: 'PAYMENT_ID',
        customer: {
            id: '42',
            data: JSON.stringify({ customer: 'foo' })
        },
        product: {
            id: '73',
            data: JSON.stringify({ product: 'bar' })
        }
    }

    mock.response(jsonResponse({ result: data }))
    await expectToReject(() => client.payments.getBySession(''))
    const payment = await client.payments.getBySession('SESSION_ID')
    const request = mock.last()

    expect(request.url?.href).toBe('https://repaya.io/api/public/1/payment?sessionId=SESSION_ID');
    expect(request.method).toBe('get')
    expect(request.headers).toStrictEqual({
        'Authorization': 'Bearer API_TOKEN',
    })
    expect(payment).toStrictEqual({
        id: 'PAYMENT_ID',
        customer: {
            id: '42',
            data: { customer: 'foo' }
        },
        product: {
            id: '73',
            data: { product: 'bar' }
        },
    })
})

test('test get payment by session without data', async () => {
    const client = new Client(env, token, { fetch: mock.fetch })

    const data = {
        id: 'PAYMENT_ID',
        customer: {
            id: '42',
        },
        product: {
            id: '73',
        }
    }

    mock.response(jsonResponse({ result: data }))
    await expectToReject(() => client.payments.getBySession(''))
    const payment = await client.payments.getBySession('SESSION_ID')
    const request = mock.last()

    expect(request.url?.href).toBe('https://repaya.io/api/public/1/payment?sessionId=SESSION_ID');
    expect(request.method).toBe('get')
    expect(request.headers).toStrictEqual({
        'Authorization': 'Bearer API_TOKEN',
    })
    expect(payment).toStrictEqual({
        id: 'PAYMENT_ID',
        customer: {
            id: '42',
            data: null
        },
        product: {
            id: '73',
            data: null
        },
    })
})


test('test not found payment by session', async () => {
    const client = new Client(env, token, { fetch: mock.fetch })

    const data = null

    mock.response(jsonResponse({ result: data }))
    const payment = await client.payments.getBySession('SESSION_ID')
    const request = mock.last()

    expect(request.url?.href).toBe('https://repaya.io/api/public/1/payment?sessionId=SESSION_ID');
    expect(request.method).toBe('get')
    expect(request.headers).toStrictEqual({
        'Authorization': 'Bearer API_TOKEN',
    })
    expect(payment).toStrictEqual(null)
})

test('test get balance', async () => {
    const client = new Client(env, token, { fetch: mock.fetch })

    const data = [{
        customerId: '42',
        productId: '73',
        balance: '0.0',
        coin: {
            name: 'Coin Name',
            code: 'COIN_CODE'
        }
    }]
    mock.response(jsonResponse({
        result: data
    }))
    await expectToReject(() => client.balances.getAll('', {}))
    const payment = await client.balances.getAll('FORM_ID', {
        customerId: '42',
        productId: '73',
        coin: 'COIN_CODE'
    })
    const request = mock.last()

    expect(request.method).toBe('get')
    const params = Array.from(request.url!.searchParams).reduce((acc, [k, v]) => {
        acc[k] = v
        return acc
    }, {} as Record<string, string>)

    expect(params).toStrictEqual({
        formLinkId: 'FORM_ID',
        customerId: '42',
        productId: '73',
        coin: 'COIN_CODE'
    })
    expect(request.headers).toStrictEqual({
        'Authorization': 'Bearer API_TOKEN',
    })
    expect(payment).toStrictEqual(data)
})


test('test get balance empty filter', async () => {
    const client = new Client(env, token, { fetch: mock.fetch })

    const data = [{
        customerId: '',
        productId: '',
        balance: '0.0',
        coin: {
            name: 'Coin Name',
            code: 'COIN_CODE'
        }
    }]
    mock.response(jsonResponse({ result: data }))

    const balance = await client.balances.getAll('FORM_ID', {
        customerId: '',
        productId: '',
        coin: 'COIN_CODE'
    })
    const request = mock.last()

    expect(request.method).toBe('get')
    const params = Array.from(request.url!.searchParams).reduce((acc, [k, v]) => {
        acc[k] = v
        return acc
    }, {} as Record<string, string>)

    expect(params).toStrictEqual({
        formLinkId: 'FORM_ID',
        customerId: '',
        productId: '',
        coin: 'COIN_CODE'
    })
    expect(request.headers).toStrictEqual({
        'Authorization': 'Bearer API_TOKEN',
    })
    expect(balance).toStrictEqual(data)
})

test('test get balance no filter', async () => {
    const client = new Client(env, token, { fetch: mock.fetch })

    const data = [{
        customerId: '',
        productId: '',
        balance: '0.0',
        coin: {
            name: 'Coin Name',
            code: 'COIN_CODE'
        }
    }]
    mock.response(jsonResponse({ result: data }))

    const balance = await client.balances.getAll('FORM_ID', {
        coin: 'COIN_CODE'
    })
    const request = mock.last()

    expect(request.method).toBe('get')
    const params = Array.from(request.url!.searchParams).reduce((acc, [k, v]) => {
        acc[k] = v
        return acc
    }, {} as Record<string, string>)

    expect(params).toStrictEqual({
        formLinkId: 'FORM_ID',
        coin: 'COIN_CODE'
    })
    expect(request.headers).toStrictEqual({
        'Authorization': 'Bearer API_TOKEN',
    })
    expect(balance).toStrictEqual(data)
})


const paymentResponseData = {
    total: 1,
    totalPages: 1,
    page: 1,
    items: [{
        id: 'id_1234',
        customer: {
            id: 'customer_1231',
            data: '{}'
        },
        product: {
            name: 'product_name',
            id: 'product_1234',
            data: '{}'
        },
        sender: '0x001',
        receiver: '0x002',
        amount: '10.0',
        paidAmount: '10.0',
        status: 'completed',
        coin: {
            code: 'USD_MULTI_1',
            name: 'USD Stablecoins'
        },
        created: Date.now()
    }] as PaymentResponse[]
}

const paymentResponseDataCheck = {
    ...paymentResponseData,
    items: paymentResponseData.items.map(expandResponsePayment)
}

test('test get payments no filter', async () => {
    const client = new Client(env, token, { fetch: mock.fetch })

    mock.response(jsonResponse({ result: paymentResponseData }))

    const payments = await client.payments.list('FORM_ID', {})
    const request = mock.last()

    expect(request.method).toBe('get')
    const params = Array.from(request.url!.searchParams).reduce((acc, [k, v]) => {
        acc[k] = v
        return acc
    }, {} as Record<string, string>)

    const till = (Date.now() + 3600 * 1e3)
    expect(params).toStrictEqual({
        formId: 'FORM_ID',
        limit: '1000',
        page: '1',
        sort: 'desc',
        fromTimestamp: '0',
        tillTimestamp: `${+till}`
    })
    expect(request.headers).toStrictEqual({
        'Authorization': 'Bearer API_TOKEN',
    })
    expect(payments).toStrictEqual(paymentResponseDataCheck)
})

test('test get payments filters', async () => {
    const client = new Client(env, token, { fetch: mock.fetch })

    mock.response(jsonResponse({ result: paymentResponseData }))

    const from = new Date(Date.now() - 4 * 3600e3)
    const till = new Date(Date.now() + 4 * 3600e3)
    const payments = await client.payments.list('FORM_ID', {
        limit: 2,
        page: 3,
        sort: 'asc',
        from,
        till
    })
    const request = mock.last()

    expect(request.method).toBe('get')
    const params = Array.from(request.url!.searchParams).reduce((acc, [k, v]) => {
        acc[k] = v
        return acc
    }, {} as Record<string, string>)

    expect(params).toStrictEqual({
        formId: 'FORM_ID',
        limit: '2',
        page: '3',
        sort: 'asc',
        fromTimestamp: `${+from}`,
        tillTimestamp: `${+till}`
    })
    expect(request.headers).toStrictEqual({
        'Authorization': 'Bearer API_TOKEN',
    })
    expect(payments).toStrictEqual(paymentResponseDataCheck)
})