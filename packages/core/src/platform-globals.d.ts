interface AbortSignal {
  readonly aborted: boolean;
  addEventListener(type: "abort", listener: () => void): void;
}

declare class AbortController {
  readonly signal: AbortSignal;
  abort(): void;
}

declare class URL {
  constructor(url: string);
  href: string;
}

declare function setTimeout(handler: () => void, timeout?: number): number;
