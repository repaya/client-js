#!/usr/bin/env node

import { Client } from "./client.js"
import { inspect } from 'util'

const args = process.argv.slice(2)
const argStr = args.join(" ")

type CommandSpec = {
    [method: string]: {
        description: string,
        parameters: string[],
        options: {
            [k: string]: {
                isRequired: boolean,
                description?: string
                example: string
            }
        }
    }
}

const priceOptionKey = 'price.<COIN>'

const commands: CommandSpec = {
    'sessions.create': {
        description: 'Create payment session',
        parameters: ['formId'],
        options: {
            'customer.id': {
                isRequired: false,
                description: 'Customer ID',
                example: '12345678'
            },
            'customer.data': {
                isRequired: false,
                description: 'Arbitrary customer data',
                example: '"data"'
            },
            'product.id': {
                isRequired: false,
                description: 'Product ID',
                example: '12345678'
            },
            'product.name': {
                isRequired: false,
                description: 'Product Name',
                example: 'Awesome product'
            },
            'product.data': {
                isRequired: false,
                description: 'Arbitrary product data',
                example: '"data"'
            },
            [priceOptionKey]: {
                isRequired: false,
                description: 'Product prices',
                example: '15.0'
            },
            'clientId': {
                isRequired: false,
                description: 'Client ID',
                example: '12345678'
            },
        }
    },
    'payments.getBySession': {
        description: 'Get payment by session ID',
        parameters: ['sessionId'],
        options: {}
    },
    'payments.list': {
        description: 'List payments by payment form ID',
        parameters: ['formId'],
        options: {
            'from': {
                isRequired: false,
                description: 'Start from date (default timestamp 0)',
                example: '2021-02-03T04:05:06'
            },
            'till': {
                isRequired: false,
                description: 'End on date (default 1 hour from now)',
                example: '2021-02-03T04:05:06'
            },
            'sort': {
                isRequired: false,
                description: 'Sort direction "asc" or "desc" (default "asc")',
                example: 'desc'
            },
            'limit': {
                isRequired: false,
                description: 'Limit results (default 1000)',
                example: '100',
            },
            'page': {
                isRequired: false,
                description: 'Page number starting from 1 (default 1)',
                example: '4',
            },
        }
    },
    'balances.getAll': {
        description: 'Get user balances by form ID',
        parameters: ['formId'],
        options: {
            'customerId': {
                isRequired: false,
                description: 'Customer ID, put empty string to get total balances',
                example: '12345678'
            },
            'productId': {
                isRequired: false,
                description: 'Product ID, put empty string to get total balances',
                example: '12345678'
            },
            'coin': {
                isRequired: false,
                description: 'Coin',
                example: 'ETH'
            },
        }
    }
}

function printUsage() {
    console.log(`\
Usage: npx @repaya/client [command] [params...] <key=value>
`)
}

function printHelp() {
    console.log('Commands:')

    for (const command in commands) {
        console.log(`\t${command}\t - ${commands[command].description}`)
    }

    console.log()
    console.log('Environment variables:')
    
    console.log(`\tREPAYA_API_TOKEN\t - API Token to use`)
    console.log(`\tREPAYA_ENV\t\t - Environment to use. 'https://repaya.io' or 'https://goerli.repaya.io'`)
    console.log(`\t\t\t\t   (default 'https://repaya.io')`)
}

if (!(args[0] in commands)) {
    printUsage()
    console.log()
    printHelp()
    process.exit(0)
}

function printCommandHelp(command: string) {
    const desc = commands[command]!

    const usage = [`Usage: npx @repaya/client`, command]

    for (const param of desc.parameters) {
        usage.push(`[${param}]`)
    }

    const hasOptions = Object.keys(desc.options).length > 0
    if (hasOptions) usage.push('<OPTIONS...>')

    for (const option in desc.options) {
        const cfg = desc.options[option]
        if (!cfg.isRequired) continue

        usage.push(`${option}=${cfg.example}`)
    }

    console.log(usage.join(' '))

    if (!hasOptions) return

    console.log('Options: ')

    for (const option in desc.options) {
        const cfg = desc.options[option]
        console.log(`\t${option}=\t\t- ${cfg.description}`)
    }
}

const command = args[0]
const desc = commands[command]

if (argStr.includes('--help') || argStr.includes('-h')) {
    printCommandHelp(command)
    process.exit(0)
}

const hasRequiredOptions = Object.keys(desc.options).filter(k => desc.options[k].isRequired).length > 0
const isRequiredArguments = desc.parameters.length > 0 || hasRequiredOptions
if (isRequiredArguments && args.length === 1) {
    printCommandHelp(command)
    process.exit(0)
}

if (!process.env.REPAYA_API_TOKEN) {
    console.log(`\
REPAYA_API_TOKEN environment variable must be set
`)
    process.exit(1)
}

const env = process.env.REPAYA_ENV ?? 'https://repaya.io'
const token = process.env.REPAYA_API_TOKEN!

const client = new Client(env, token)

const [sub, method] = command.split('.')
const params: any[] = []
const options: {[k: string]: string} = {}

for (const arg of args.slice(1)) {
    if (arg.includes('=')) {
        const pair = arg.split('=')
        const key = pair[0] 
        const value = pair[1] ?? ''

        options[key] = value
    } else params.push(arg)
}

if (params.length < desc.parameters.length) {
    console.log(`Missing required parameters: ${desc.parameters.slice(params.length).join(', ')}`)
}

for (const option in desc.options) {
    const cfg = desc.options[option]
    if (!cfg.isRequired) continue
    if (!(option in options)) {
        console.log(`Missing required option "${option}"`)
        process.exit(1)
    }
}

for (const option in options) {
    if (option.startsWith('price.') && priceOptionKey in desc.options) continue

    if (!(option in desc.options)) {
        console.log(`Unknown option "${option}"`)
        process.exit(1)
    }
}

const methodOptions = Object.keys(options).reduce((acc, key) => {
    const value = options[key]
    const keys = key.split('.')

    let prev = acc
    for (let i = 0; i < keys.length; i ++) {
        const key = keys[i]
        if (i === keys.length - 1) {
            prev[key] = value
        } else if (!(key in prev)) {
            prev[key] = {}
            prev = prev[key]
        } else {
            prev = prev[key]
        }
    }

    return acc
}, {} as Record<string, any>)

// @ts-ignore
const result = await client[sub][method](...[...params, methodOptions])
console.log(inspect(result, false, 10))
