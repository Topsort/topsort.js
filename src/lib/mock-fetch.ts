type RequestInfo = string | URL | Request;
export function mockFetch(responseData: any, status: number, urlPattern: string) {
    globalThis.fetch = async (input: RequestInfo) => {
        let url: string;

        if (typeof input === "string") {
            url = input;
        } else if (input instanceof URL) {
            url = input.href;
        } else {
            url = input.url;
        }

        if (url.includes(urlPattern)) {
            return new Response(JSON.stringify(responseData), {
                status: status,
                headers: { "Content-Type": "application/json" },
            });
        }

        return new Response(null, { status: 404 });
    };
}

export function resetFetch() {
    globalThis.fetch = async () => {
        return new Response(null, { status: 404 });
    };
}