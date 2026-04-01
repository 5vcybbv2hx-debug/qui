/**
 * serviceBase.js
 * Thin wrapper around base44 entities so feature services stay consistent.
 * All data access goes through here — never call base44 directly from UI.
 */
import { base44 } from '@/api/base44Client';

export const entities = base44.entities;
export const functions = base44.functions;
export const auth = base44.auth;

/** Invoke a backend function with typed response */
export async function invoke(name, payload = {}) {
    const res = await functions.invoke(name, payload);
    return res.data;
}