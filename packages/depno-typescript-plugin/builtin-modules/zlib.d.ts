declare module "zlib" {
  import { Transform } from "stream";

  class ZlibBase extends Transform {
    reset(): void;
  }

  class Zlib extends ZlibBase {
    constructor(opts: ZlibOptions);

    /** @deprecated Use bytesWritten instead. */
    readonly bytesRead: number;
    readonly bytesWritten: number;
    shell?: boolean | string;
    close(callback?: () => void): void;
    flush(kind?: number | (() => void), callback?: () => void): void;
    params(level: number, strategy: number, callback: () => void): void;
  }

  const Z_NO_FLUSH: number;
  const Z_FINISH: number;

  type TypedArray =
    | Uint8Array
    | Uint8ClampedArray
    | Uint16Array
    | Uint32Array
    | Int8Array
    | Int16Array
    | Int32Array
    | Float32Array
    | Float64Array;
  type ArrayBufferView = TypedArray | DataView;

  interface ZlibOptions {
    /**
     * @default Z_NO_FLUSH
     */
    flush?: number;
    /**
     * @default Z_FINISH
     */
    finishFlush?: number;
    /**
     * @default 16*1024
     */
    chunkSize?: number;
    windowBits?: number;
    level?: number; // compression only
    memLevel?: number; // compression only
    strategy?: number; // compression only
    dictionary?: ArrayBufferView | ArrayBuffer; // deflate/inflate only, empty dictionary by default
  }

  export class DeflateRaw extends Zlib {}
  function createDeflateRaw(options?: ZlibOptions): DeflateRaw;
}
