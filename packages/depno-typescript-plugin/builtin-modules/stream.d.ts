declare module "stream" {
  import { EventEmitter } from "events";
  import { Buffer } from "buffer";
  import { BufferEncoding } from "buffer";

  interface WritableStream extends EventEmitter {
    writable: boolean;
    write(
      buffer: Uint8Array | string,
      cb?: (err?: Error | null) => void
    ): boolean;
    write(
      str: string,
      encoding?: string,
      cb?: (err?: Error | null) => void
    ): boolean;
    end(cb?: () => void): void;
    end(data: string | Uint8Array, cb?: () => void): void;
    end(str: string, encoding?: string, cb?: () => void): void;
  }

  interface ReadableStream extends EventEmitter {
    readable: boolean;
    read(size?: number): string | Buffer;
    setEncoding(encoding: string): this;
    pause(): this;
    resume(): this;
    isPaused(): boolean;
    pipe<T extends WritableStream>(
      destination: T,
      options?: { end?: boolean }
    ): T;
    unpipe(destination?: WritableStream): this;
    unshift(chunk: string | Uint8Array, encoding?: BufferEncoding): void;
    wrap(oldStream: ReadableStream): this;
    [Symbol.asyncIterator](): AsyncIterableIterator<string | Buffer>;
  }

  export class internal extends EventEmitter {
    pipe<T extends WritableStream>(
      destination: T,
      options?: { end?: boolean }
    ): T;
  }

  export interface ReadableOptions {
    highWaterMark?: number;
    encoding?: string;
    objectMode?: boolean;
    read?(this: Readable, size: number): void;
    destroy?(
      this: Readable,
      error: Error | null,
      callback: (error: Error | null) => void
    ): void;
    autoDestroy?: boolean;
  }

  export class Stream extends internal {
    constructor(opts?: ReadableOptions);
  }

  export class Readable extends Stream implements ReadableStream {
    /**
     * A utility method for creating Readable Streams out of iterators.
     */
    static from(
      iterable: Iterable<any> | AsyncIterable<any>,
      options?: ReadableOptions
    ): Readable;

    readable: boolean;
    readonly readableHighWaterMark: number;
    readonly readableLength: number;
    readonly readableObjectMode: boolean;
    destroyed: boolean;
    constructor(opts?: ReadableOptions);
    _read(size: number): void;
    read(size?: number): any;
    setEncoding(encoding: string): this;
    pause(): this;
    resume(): this;
    isPaused(): boolean;
    unpipe(destination?: WritableStream): this;
    unshift(chunk: any, encoding?: BufferEncoding): void;
    wrap(oldStream: ReadableStream): this;
    push(chunk: any, encoding?: string): boolean;
    _destroy(
      error: Error | null,
      callback: (error?: Error | null) => void
    ): void;
    destroy(error?: Error): void;

    /**
     * Event emitter
     * The defined events on documents including:
     * 1. close
     * 2. data
     * 3. end
     * 4. error
     * 5. pause
     * 6. readable
     * 7. resume
     */
    addListener(event: "close", listener: () => void): this;
    addListener(event: "data", listener: (chunk: any) => void): this;
    addListener(event: "end", listener: () => void): this;
    addListener(event: "error", listener: (err: Error) => void): this;
    addListener(event: "pause", listener: () => void): this;
    addListener(event: "readable", listener: () => void): this;
    addListener(event: "resume", listener: () => void): this;
    addListener(
      event: string | symbol,
      listener: (...args: any[]) => void
    ): this;

    emit(event: "close"): boolean;
    emit(event: "data", chunk: any): boolean;
    emit(event: "end"): boolean;
    emit(event: "error", err: Error): boolean;
    emit(event: "pause"): boolean;
    emit(event: "readable"): boolean;
    emit(event: "resume"): boolean;
    emit(event: string | symbol, ...args: any[]): boolean;

    on(event: "close", listener: () => void): this;
    on(event: "data", listener: (chunk: any) => void): this;
    on(event: "end", listener: () => void): this;
    on(event: "error", listener: (err: Error) => void): this;
    on(event: "pause", listener: () => void): this;
    on(event: "readable", listener: () => void): this;
    on(event: "resume", listener: () => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;

    once(event: "close", listener: () => void): this;
    once(event: "data", listener: (chunk: any) => void): this;
    once(event: "end", listener: () => void): this;
    once(event: "error", listener: (err: Error) => void): this;
    once(event: "pause", listener: () => void): this;
    once(event: "readable", listener: () => void): this;
    once(event: "resume", listener: () => void): this;
    once(event: string | symbol, listener: (...args: any[]) => void): this;

    prependListener(event: "close", listener: () => void): this;
    prependListener(event: "data", listener: (chunk: any) => void): this;
    prependListener(event: "end", listener: () => void): this;
    prependListener(event: "error", listener: (err: Error) => void): this;
    prependListener(event: "pause", listener: () => void): this;
    prependListener(event: "readable", listener: () => void): this;
    prependListener(event: "resume", listener: () => void): this;
    prependListener(
      event: string | symbol,
      listener: (...args: any[]) => void
    ): this;

    prependOnceListener(event: "close", listener: () => void): this;
    prependOnceListener(event: "data", listener: (chunk: any) => void): this;
    prependOnceListener(event: "end", listener: () => void): this;
    prependOnceListener(event: "error", listener: (err: Error) => void): this;
    prependOnceListener(event: "pause", listener: () => void): this;
    prependOnceListener(event: "readable", listener: () => void): this;
    prependOnceListener(event: "resume", listener: () => void): this;
    prependOnceListener(
      event: string | symbol,
      listener: (...args: any[]) => void
    ): this;

    removeListener(event: "close", listener: () => void): this;
    removeListener(event: "data", listener: (chunk: any) => void): this;
    removeListener(event: "end", listener: () => void): this;
    removeListener(event: "error", listener: (err: Error) => void): this;
    removeListener(event: "pause", listener: () => void): this;
    removeListener(event: "readable", listener: () => void): this;
    removeListener(event: "resume", listener: () => void): this;
    removeListener(
      event: string | symbol,
      listener: (...args: any[]) => void
    ): this;

    [Symbol.asyncIterator](): AsyncIterableIterator<any>;
  }

  export interface WritableOptions {
    highWaterMark?: number;
    decodeStrings?: boolean;
    defaultEncoding?: string;
    objectMode?: boolean;
    emitClose?: boolean;
    write?(
      this: Writable,
      chunk: any,
      encoding: string,
      callback: (error?: Error | null) => void
    ): void;
    writev?(
      this: Writable,
      chunks: Array<{ chunk: any; encoding: string }>,
      callback: (error?: Error | null) => void
    ): void;
    destroy?(
      this: Writable,
      error: Error | null,
      callback: (error: Error | null) => void
    ): void;
    final?(this: Writable, callback: (error?: Error | null) => void): void;
    autoDestroy?: boolean;
  }

  export class Writable extends Stream implements WritableStream {
    readonly writable: boolean;
    readonly writableEnded: boolean;
    readonly writableFinished: boolean;
    readonly writableHighWaterMark: number;
    readonly writableLength: number;
    readonly writableObjectMode: boolean;
    readonly writableCorked: number;
    destroyed: boolean;
    constructor(opts?: WritableOptions);
    _write(
      chunk: any,
      encoding: string,
      callback: (error?: Error | null) => void
    ): void;
    _writev?(
      chunks: Array<{ chunk: any; encoding: string }>,
      callback: (error?: Error | null) => void
    ): void;
    _destroy(
      error: Error | null,
      callback: (error?: Error | null) => void
    ): void;
    _final(callback: (error?: Error | null) => void): void;
    write(chunk: any, cb?: (error: Error | null | undefined) => void): boolean;
    write(
      chunk: any,
      encoding: string,
      cb?: (error: Error | null | undefined) => void
    ): boolean;
    setDefaultEncoding(encoding: string): this;
    end(cb?: () => void): void;
    end(chunk: any, cb?: () => void): void;
    end(chunk: any, encoding: string, cb?: () => void): void;
    cork(): void;
    uncork(): void;
    destroy(error?: Error): void;

    /**
     * Event emitter
     * The defined events on documents including:
     * 1. close
     * 2. drain
     * 3. error
     * 4. finish
     * 5. pipe
     * 6. unpipe
     */
    addListener(event: "close", listener: () => void): this;
    addListener(event: "drain", listener: () => void): this;
    addListener(event: "error", listener: (err: Error) => void): this;
    addListener(event: "finish", listener: () => void): this;
    addListener(event: "pipe", listener: (src: Readable) => void): this;
    addListener(event: "unpipe", listener: (src: Readable) => void): this;
    addListener(
      event: string | symbol,
      listener: (...args: any[]) => void
    ): this;

    emit(event: "close"): boolean;
    emit(event: "drain"): boolean;
    emit(event: "error", err: Error): boolean;
    emit(event: "finish"): boolean;
    emit(event: "pipe", src: Readable): boolean;
    emit(event: "unpipe", src: Readable): boolean;
    emit(event: string | symbol, ...args: any[]): boolean;

    on(event: "close", listener: () => void): this;
    on(event: "drain", listener: () => void): this;
    on(event: "error", listener: (err: Error) => void): this;
    on(event: "finish", listener: () => void): this;
    on(event: "pipe", listener: (src: Readable) => void): this;
    on(event: "unpipe", listener: (src: Readable) => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;

    once(event: "close", listener: () => void): this;
    once(event: "drain", listener: () => void): this;
    once(event: "error", listener: (err: Error) => void): this;
    once(event: "finish", listener: () => void): this;
    once(event: "pipe", listener: (src: Readable) => void): this;
    once(event: "unpipe", listener: (src: Readable) => void): this;
    once(event: string | symbol, listener: (...args: any[]) => void): this;

    prependListener(event: "close", listener: () => void): this;
    prependListener(event: "drain", listener: () => void): this;
    prependListener(event: "error", listener: (err: Error) => void): this;
    prependListener(event: "finish", listener: () => void): this;
    prependListener(event: "pipe", listener: (src: Readable) => void): this;
    prependListener(event: "unpipe", listener: (src: Readable) => void): this;
    prependListener(
      event: string | symbol,
      listener: (...args: any[]) => void
    ): this;

    prependOnceListener(event: "close", listener: () => void): this;
    prependOnceListener(event: "drain", listener: () => void): this;
    prependOnceListener(event: "error", listener: (err: Error) => void): this;
    prependOnceListener(event: "finish", listener: () => void): this;
    prependOnceListener(event: "pipe", listener: (src: Readable) => void): this;
    prependOnceListener(
      event: "unpipe",
      listener: (src: Readable) => void
    ): this;
    prependOnceListener(
      event: string | symbol,
      listener: (...args: any[]) => void
    ): this;

    removeListener(event: "close", listener: () => void): this;
    removeListener(event: "drain", listener: () => void): this;
    removeListener(event: "error", listener: (err: Error) => void): this;
    removeListener(event: "finish", listener: () => void): this;
    removeListener(event: "pipe", listener: (src: Readable) => void): this;
    removeListener(event: "unpipe", listener: (src: Readable) => void): this;
    removeListener(
      event: string | symbol,
      listener: (...args: any[]) => void
    ): this;
  }

  export interface DuplexOptions extends ReadableOptions, WritableOptions {
    allowHalfOpen?: boolean;
    readableObjectMode?: boolean;
    writableObjectMode?: boolean;
    readableHighWaterMark?: number;
    writableHighWaterMark?: number;
    writableCorked?: number;
    read?(this: Duplex, size: number): void;
    write?(
      this: Duplex,
      chunk: any,
      encoding: string,
      callback: (error?: Error | null) => void
    ): void;
    writev?(
      this: Duplex,
      chunks: Array<{ chunk: any; encoding: string }>,
      callback: (error?: Error | null) => void
    ): void;
    final?(this: Duplex, callback: (error?: Error | null) => void): void;
    destroy?(
      this: Duplex,
      error: Error | null,
      callback: (error: Error | null) => void
    ): void;
  }

  export class Duplex extends Readable implements Writable {
    readonly writable: boolean;
    readonly writableEnded: boolean;
    readonly writableFinished: boolean;
    readonly writableHighWaterMark: number;
    readonly writableLength: number;
    readonly writableObjectMode: boolean;
    readonly writableCorked: number;
    constructor(opts?: DuplexOptions);
    _write(
      chunk: any,
      encoding: string,
      callback: (error?: Error | null) => void
    ): void;
    _writev?(
      chunks: Array<{ chunk: any; encoding: string }>,
      callback: (error?: Error | null) => void
    ): void;
    _destroy(
      error: Error | null,
      callback: (error: Error | null) => void
    ): void;
    _final(callback: (error?: Error | null) => void): void;
    write(
      chunk: any,
      encoding?: string,
      cb?: (error: Error | null | undefined) => void
    ): boolean;
    write(chunk: any, cb?: (error: Error | null | undefined) => void): boolean;
    setDefaultEncoding(encoding: string): this;
    end(cb?: () => void): void;
    end(chunk: any, cb?: () => void): void;
    end(chunk: any, encoding?: string, cb?: () => void): void;
    cork(): void;
    uncork(): void;
  }
}
