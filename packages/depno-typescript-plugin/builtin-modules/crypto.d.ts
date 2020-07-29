declare module "crypto" {
  import { TransformOptions, Transform } from "stream";
  import { Buffer } from "buffer";

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

  type BinaryLike = string | ArrayBufferView;

  interface HashOptions extends TransformOptions {
    /**
     * For XOF hash functions such as `shake256`, the
     * outputLength option can be used to specify the desired output length in bytes.
     */
    outputLength?: number;
  }

  type Utf8AsciiLatin1Encoding = "utf8" | "ascii" | "latin1";
  type HexBase64Latin1Encoding = "latin1" | "hex" | "base64";

  class Hash extends Transform {
    private constructor();
    copy(): Hash;
    update(data: BinaryLike): Hash;
    update(data: string, input_encoding: Utf8AsciiLatin1Encoding): Hash;
    digest(): Buffer;
    digest(encoding: HexBase64Latin1Encoding): string;
  }

  type KeyType = "rsa" | "dsa" | "ec";
  type KeyFormat = "pem" | "der";
  type KeyObjectType = "secret" | "public" | "private";

  interface KeyExportOptions<T extends KeyFormat> {
    type: "pkcs1" | "spki" | "pkcs8" | "sec1";
    format: T;
    cipher?: string;
    passphrase?: string | Buffer;
  }

  class KeyObject {
    private constructor();
    asymmetricKeyType?: KeyType;
    /**
     * For asymmetric keys, this property represents the size of the embedded key in
     * bytes. This property is `undefined` for symmetric keys.
     */
    asymmetricKeySize?: number;
    export(options: KeyExportOptions<"pem">): string | Buffer;
    export(options?: KeyExportOptions<"der">): Buffer;
    symmetricKeySize?: number;
    type: KeyObjectType;
  }

  function createHash(algorithm: string, options?: HashOptions): Hash;
  function createHmac(
    algorithm: string,
    key: BinaryLike | KeyObject,
    options?: TransformOptions
  ): Hmac;
}
