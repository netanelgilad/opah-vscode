declare module "zlib" {
  import { Transform } from "stream";

  interface Zlib {
    /** @deprecated Use bytesWritten instead. */
    readonly bytesRead: number;
    readonly bytesWritten: number;
    shell?: boolean | string;
    close(callback?: () => void): void;
    flush(kind?: number | (() => void), callback?: () => void): void;
  }

  interface ZlibReset {
    reset(): void;
  }

  interface ZlibParams {
    params(level: number, strategy: number, callback: () => void): void;
  }

  export interface DeflateRaw extends Transform, Zlib, ZlibReset, ZlibParams {}
}
