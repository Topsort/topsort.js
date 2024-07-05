import { describe, it, expect, afterEach } from "bun:test";
import { reportEvent } from "../functions/report-event";
import { TopsortEvent } from "../interfaces/events.interface";
import { mockFetch, resetFetch } from "../lib/mock-fetch";

describe("reportEvent", () => {
    afterEach(() => {
        resetFetch();
    });

    it("should report event successfully", async () => {
        mockFetch({}, 200, "https://api.topsort.com/v2/events");
        const result = await reportEvent({} as TopsortEvent, { token: "token" });
        expect(result).toEqual({
            ok: true,
            retry: false,
        });
    });


    it("should report event successfully", async () => {
        mockFetch({}, 200, "https://api.topsort.com/v2/events");
        const result = await reportEvent({} as TopsortEvent, { token: "token" });
        expect(result).toEqual({
            ok: true,
            retry: false,
        });
    });

    it("should handle network error and retry", async () => {
        mockFetch({ error: "Server Error" }, 500, "https://error.api.topsort.com/v2/events");
        const result = await reportEvent({} as TopsortEvent, {
            token: "token",
            url: "https://error.api.topsort.com",
        });
        expect(result).toEqual({
            ok: false,
            retry: true,
        });
    });

    it("should handle permanent error", async () => {
        mockFetch({ error: "Client Error" }, 400, "https://api.topsort.com/v2/events");
        const result = await reportEvent({} as TopsortEvent, { token: "token" });
        expect(result).toEqual({
            ok: false,
            retry: false,
        });
    });

    it("should handle authentication error", async () => {
        mockFetch({ error: "Unauthorized" }, 401, "https://api.topsort.com/v2/events");
        const result = await reportEvent({} as TopsortEvent, { token: "token" });
        expect(result).toEqual({
            ok: false,
            retry: false,
        });
    });

    it("should handle retryable error", async () => {
        mockFetch({ error: "Too Many Requests" }, 429, "https://api.topsort.com/v2/events");
        const result = await reportEvent({} as TopsortEvent, { token: "token" });
        expect(result).toEqual({
            ok: false,
            retry: true,
        });
    });

    it("should handle server error", async () => {
        mockFetch({ error: "Internal Server Error" }, 500, "https://api.topsort.com/v2/events");
        const result = await reportEvent({} as TopsortEvent, { token: "token" });
        expect(result).toEqual({
            ok: false,
            retry: true,
        });
    });

    it("should handle custom url", async () => {
        mockFetch({}, 200, "https://demo.api.topsort.com/v2/events");
        const result = await reportEvent({} as TopsortEvent, {
            token: "token",
            url: "https://demo.api.topsort.com",
        });
        expect(result).toEqual({ ok: true, retry: false });
    });
});