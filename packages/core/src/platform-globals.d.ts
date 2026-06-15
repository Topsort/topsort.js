declare class AbortController {
  readonly signal: AbortSignal;
  abort(): void;
}

type AbortSignal = object;

declare class URL {
  constructor(url: string);
  href: string;
}

declare function setTimeout(handler: () => void, timeout?: number): number;
