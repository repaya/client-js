# API Client Library

Typescript client library for [repaya.io](https://repaya.io) web3 payment APIs.

<p>
    <a href="https://www.npmjs.com/package/@repaya/client" rel="nofollow"><img src="https://img.shields.io/npm/v/@repaya/client" alt="npm"></a>
    <img src="https://img.shields.io/bundlephobia/minzip/@repaya/client" alt="npm size">
    <img src="https://img.shields.io/npm/l/@repaya/client" alt="license">
<p>

`yarn add @repaya/client`

Documentation [docs.repaya.io](https://docs.repaya.io/).

## Usage

Import the client

```js
import { Client } from '@repaya/client'
```

Create payment session

```js
const formId = '<FORM_ID>'

// Create payment session
const session = await client.sessions.create(formid, { customer: { id: '42' } })
```

After the session was created, use the `session.checkoutUrl` to redirect the customer to the payment page.

---

After the payment is completed, request its status and customer balances by the session ID.

```js
const payment = await client.payments.getBySession(session.id)
// payment.status === 'completed'    // check payment status

const balances = await client.balances.getAll(formId, { customerId: '42' })
```

