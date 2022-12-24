import { Client } from "./client.js";
import { inspect } from 'util';
const env = process.env.REPAYA_ENV;
const token = process.env.REPAYA_API_TOKEN;
const client = new Client(env, token);
const args = process.argv.slice(2);
const argStr = args.join(" ");
if (argStr.includes('--help') || argStr.includes('-h')) {
    console.log(`
Usage: node cli.js balances.getAll aBcD customerId=12345 coin=ETH

Methods:
    - sessions.create <FORM_ID> <KEY.SUBKEY=VALUE...>
    - payments.getBySession <SESSION_ID> <KEY.SUBKEY=VALUE...>
    - balances.getAll <FORM_ID> <KEY.SUBKEY=VALUE...>
`);
    process.exit(0);
}
const [sub, method] = args[0].split('.');
const params = [];
const opts = args.slice(1).reduce((acc, arg) => {
    if (!arg.includes('=')) {
        params.push(arg);
        return acc;
    }
    const [keyArg, value] = arg.split('=');
    const keys = keyArg.split('.');
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
    }
    return acc;
}, {});
params.push(opts);
// @ts-ignore
const result = await client[sub][method](...params);
console.log(inspect(result, false, 10));
