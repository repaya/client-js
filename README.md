# Client

[repaya.io](https://repaya.io) client library

`yarn add @repaya/client`

## Usage

Documentation [docs.repaya.io](https://docs.repaya.io/).

Typescript definitions are included.

```js
const client = new Client('https://repaya.io', '<API_TOKEN>')

const formId = '<FORM_UD>'

// Create payment session
const session = await client.sessions.create(formid, { customer: { id: '42' } })
// session.checkoutUrl   // redirect URL for the customer

// Get payment status
const payment = await client.payments.getBySession(session.id)
// payment.status === 'completed'    // check payment status

// Get customer balance
const balances = await client.balances.getAll(formId, { customerId: '42' })

```

