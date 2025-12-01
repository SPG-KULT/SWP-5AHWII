import { API_HUG_MS } from "./config.ts";

export function sleep_api_hug_ms() {
    return sleep_ms(API_HUG_MS);
}

export function sleep_ms(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export const api_result_codes = new Map<number, string>([
    [0, "Success - Returned results successfully."],
    [1, "No Results - Could not return results."],
    [2, "Invalid Parameter - Arguments passed in aren't valid."],
    [3, "Token Not Found - Session Token does not exist."],
    [4, "Token Empty - Session Token has returned all possible questions."],
    [5, "Rate Limit - Too many requests have occurred."],
]);

export type TheirCategory = { name: string; id: string };
