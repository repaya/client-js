import { Payment, PaymentResponse } from "./types.js";
export declare function query(data: Record<string, any>): string;
export declare function expandResponsePayment(response: PaymentResponse): Payment;
