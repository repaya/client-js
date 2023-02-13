#!/usr/bin/env node
import { Client } from "./client.js";
import { inspect } from 'util';
const args = process.argv.slice(2);
const argStr = args.join(" ");
const commands = {
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
            'product.data': {
                isRequired: false,
                description: 'Arbitrary product data',
                example: '"data"'
            },
            'price.<COIN>': {
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
};
function printUsage() {
    console.log(`\
Usage: REPAYA_API_TOKEN=<API_TOKEN> npx @repaya/client [command] [params...] <key=value>
`);
}
function printCommandHelp() {
    console.log('Commands:');
    for (const command in commands) {
        console.log(`\t${command}   - ${commands[command].description}`);
    }
}
if (!(args[0] in commands)) {
    printUsage();
    console.log();
    printCommandHelp();
    process.exit(0);
}
function printCommandHeelp(command) {
    const desc = commands[command];
    const usage = [`Usage: REPAYA_API_TOKEN=<API_TOKEN> npx @repaya/client`, command];
    for (const param of desc.parameters) {
        usage.push(`[${param}]`);
    }
    if (Object.keys(desc.options).length > 0)
        usage.push('<OPTIONS...>');
    for (const option in desc.options) {
        const cfg = desc.options[option];
        if (!cfg.isRequired)
            continue;
        usage.push(`${option}=${cfg.example}`);
    }
    console.log(usage.join(' '));
    console.log();
    console.log('Options: ');
    for (const option in desc.options) {
        const cfg = desc.options[option];
        console.log(`\t${option}=\t\t- ${cfg.description}`);
    }
}
const command = args[0];
const desc = commands[command];
if (argStr.includes('--help') || argStr.includes('-h')) {
    printCommandHeelp(command);
    process.exit(0);
}
const hasRequiredOptions = Object.keys(desc.options).filter(k => desc.options[k].isRequired).length > 0;
const isRequiredArguments = desc.parameters.length > 0 || hasRequiredOptions;
if (isRequiredArguments && args.length === 1) {
    printCommandHeelp(command);
    process.exit(0);
}
if (!process.env.REPAYA_API_TOKEN) {
    console.log(`\
REPAYA_API_TOKEN environment variable must be set
`);
    process.exit(1);
}
const env = process.env.REPAYA_ENV ?? 'https://repaya.io';
const token = process.env.REPAYA_API_TOKEN;
const client = new Client(env, token);
const [sub, method] = command.split('.');
const params = [];
const options = {};
for (const arg of args.slice(1)) {
    if (arg.includes('=')) {
        const pair = arg.split('=');
        const key = pair[0];
        const value = pair[1] ?? '';
        options[key] = value;
    }
    else
        params.push(arg);
}
if (params.length < desc.parameters.length) {
    console.log(`Missing required parameters: ${desc.parameters.slice(params.length).join(', ')}`);
}
for (const option in desc.options) {
    const cfg = desc.options[option];
    if (!cfg.isRequired)
        continue;
    if (!(option in options)) {
        console.log(`Missing required option "${option}"`);
        process.exit(1);
    }
}
for (const option in options) {
    if (!(option in desc.options)) {
        console.log(`Unknown option "${option}"`);
        process.exit(1);
    }
}
const methodOptions = Object.keys(options).reduce((acc, key) => {
    const value = options[key];
    const keys = key.split('.');
    let prev = acc;
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (i === keys.length - 1) {
            prev[key] = value;
        }
        else if (!(key in prev)) {
            prev[key] = {};
            prev = prev[key];
        }
        else {
            prev = prev[key];
        }
    }
    return acc;
}, {});
// @ts-ignore
const result = await client[sub][method](...[...params, methodOptions]);
console.log(inspect(result, false, 10));
