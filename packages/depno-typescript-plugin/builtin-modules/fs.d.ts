declare module "fs" {
  import { Buffer, BufferEncoding } from "buffer";
  import { Writable, Readable } from "stream";

  // @ts-ignore
  export const constants: {
    // File Access Constants

    /** Constant for fs.access(). File is visible to the calling process. */
    F_OK: number;

    /** Constant for fs.access(). File can be read by the calling process. */
    R_OK: number;

    /** Constant for fs.access(). File can be written by the calling process. */
    W_OK: number;

    /** Constant for fs.access(). File can be executed by the calling process. */
    X_OK: number;

    // File Copy Constants

    /** Constant for fs.copyFile. Flag indicating the destination file should not be overwritten if it already exists. */
    COPYFILE_EXCL: number;

    /**
     * Constant for fs.copyFile. copy operation will attempt to create a copy-on-write reflink.
     * If the underlying platform does not support copy-on-write, then a fallback copy mechanism is used.
     */
    COPYFILE_FICLONE: number;

    /**
     * Constant for fs.copyFile. Copy operation will attempt to create a copy-on-write reflink.
     * If the underlying platform does not support copy-on-write, then the operation will fail with an error.
     */
    COPYFILE_FICLONE_FORCE: number;

    // File Open Constants

    /** Constant for fs.open(). Flag indicating to open a file for read-only access. */
    O_RDONLY: number;

    /** Constant for fs.open(). Flag indicating to open a file for write-only access. */
    O_WRONLY: number;

    /** Constant for fs.open(). Flag indicating to open a file for read-write access. */
    O_RDWR: number;

    /** Constant for fs.open(). Flag indicating to create the file if it does not already exist. */
    O_CREAT: number;

    /** Constant for fs.open(). Flag indicating that opening a file should fail if the O_CREAT flag is set and the file already exists. */
    O_EXCL: number;

    /**
     * Constant for fs.open(). Flag indicating that if path identifies a terminal device,
     * opening the path shall not cause that terminal to become the controlling terminal for the process
     * (if the process does not already have one).
     */
    O_NOCTTY: number;

    /** Constant for fs.open(). Flag indicating that if the file exists and is a regular file, and the file is opened successfully for write access, its length shall be truncated to zero. */
    O_TRUNC: number;

    /** Constant for fs.open(). Flag indicating that data will be appended to the end of the file. */
    O_APPEND: number;

    /** Constant for fs.open(). Flag indicating that the open should fail if the path is not a directory. */
    O_DIRECTORY: number;

    /**
     * constant for fs.open().
     * Flag indicating reading accesses to the file system will no longer result in
     * an update to the atime information associated with the file.
     * This flag is available on Linux operating systems only.
     */
    O_NOATIME: number;

    /** Constant for fs.open(). Flag indicating that the open should fail if the path is a symbolic link. */
    O_NOFOLLOW: number;

    /** Constant for fs.open(). Flag indicating that the file is opened for synchronous I/O. */
    O_SYNC: number;

    /** Constant for fs.open(). Flag indicating that the file is opened for synchronous I/O with write operations waiting for data integrity. */
    O_DSYNC: number;

    /** Constant for fs.open(). Flag indicating to open the symbolic link itself rather than the resource it is pointing to. */
    O_SYMLINK: number;

    /** Constant for fs.open(). When set, an attempt will be made to minimize caching effects of file I/O. */
    O_DIRECT: number;

    /** Constant for fs.open(). Flag indicating to open the file in nonblocking mode when possible. */
    O_NONBLOCK: number;

    // File Type Constants

    /** Constant for fs.Stats mode property for determining a file's type. Bit mask used to extract the file type code. */
    S_IFMT: number;

    /** Constant for fs.Stats mode property for determining a file's type. File type constant for a regular file. */
    S_IFREG: number;

    /** Constant for fs.Stats mode property for determining a file's type. File type constant for a directory. */
    S_IFDIR: number;

    /** Constant for fs.Stats mode property for determining a file's type. File type constant for a character-oriented device file. */
    S_IFCHR: number;

    /** Constant for fs.Stats mode property for determining a file's type. File type constant for a block-oriented device file. */
    S_IFBLK: number;

    /** Constant for fs.Stats mode property for determining a file's type. File type constant for a FIFO/pipe. */
    S_IFIFO: number;

    /** Constant for fs.Stats mode property for determining a file's type. File type constant for a symbolic link. */
    S_IFLNK: number;

    /** Constant for fs.Stats mode property for determining a file's type. File type constant for a socket. */
    S_IFSOCK: number;

    // File Mode Constants

    /** Constant for fs.Stats mode property for determining access permissions for a file. File mode indicating readable, writable and executable by owner. */
    S_IRWXU: number;

    /** Constant for fs.Stats mode property for determining access permissions for a file. File mode indicating readable by owner. */
    S_IRUSR: number;

    /** Constant for fs.Stats mode property for determining access permissions for a file. File mode indicating writable by owner. */
    S_IWUSR: number;

    /** Constant for fs.Stats mode property for determining access permissions for a file. File mode indicating executable by owner. */
    S_IXUSR: number;

    /** Constant for fs.Stats mode property for determining access permissions for a file. File mode indicating readable, writable and executable by group. */
    S_IRWXG: number;

    /** Constant for fs.Stats mode property for determining access permissions for a file. File mode indicating readable by group. */
    S_IRGRP: number;

    /** Constant for fs.Stats mode property for determining access permissions for a file. File mode indicating writable by group. */
    S_IWGRP: number;

    /** Constant for fs.Stats mode property for determining access permissions for a file. File mode indicating executable by group. */
    S_IXGRP: number;

    /** Constant for fs.Stats mode property for determining access permissions for a file. File mode indicating readable, writable and executable by others. */
    S_IRWXO: number;

    /** Constant for fs.Stats mode property for determining access permissions for a file. File mode indicating readable by others. */
    S_IROTH: number;

    /** Constant for fs.Stats mode property for determining access permissions for a file. File mode indicating writable by others. */
    S_IWOTH: number;

    /** Constant for fs.Stats mode property for determining access permissions for a file. File mode indicating executable by others. */
    S_IXOTH: number;

    /**
     * When set, a memory file mapping is used to access the file. This flag
     * is available on Windows operating systems only. On other operating systems,
     * this flag is ignored.
     */
    UV_FS_O_FILEMAP: number;
  };

  class Dirent {
    isFile(): boolean;
    isDirectory(): boolean;
    isBlockDevice(): boolean;
    isCharacterDevice(): boolean;
    isSymbolicLink(): boolean;
    isFIFO(): boolean;
    isSocket(): boolean;
    name: string;
  }

  export type PathLike = string | Buffer | URL;

  /**
   * Synchronously reads the entire contents of a file.
   * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
   * URL support is _experimental_.
   * If a file descriptor is provided, the underlying file will _not_ be closed automatically.
   * @param options An object that may contain an optional flag. If a flag is not provided, it defaults to `'r'`.
   */
  export function readFileSync(
    path: PathLike | number,
    options?: { encoding?: null; flag?: string } | null
  ): Buffer;

  /**
   * Synchronously reads the entire contents of a file.
   * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
   * URL support is _experimental_.
   * If a file descriptor is provided, the underlying file will _not_ be closed automatically.
   * @param options Either the encoding for the result, or an object that contains the encoding and an optional flag.
   * If a flag is not provided, it defaults to `'r'`.
   */
  export function readFileSync(
    path: PathLike | number,
    options: { encoding: string; flag?: string } | string
  ): string;

  /**
   * Synchronously reads the entire contents of a file.
   * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
   * URL support is _experimental_.
   * If a file descriptor is provided, the underlying file will _not_ be closed automatically.
   * @param options Either the encoding for the result, or an object that contains the encoding and an optional flag.
   * If a flag is not provided, it defaults to `'r'`.
   */
  export function readFileSync(
    path: PathLike | number,
    options?: { encoding?: string | null; flag?: string } | string | null
  ): string | Buffer;

  /**
   * Synchronous readdir(3) - read a directory.
   * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
   * @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
   */
  export function readdirSync(
    path: PathLike,
    options?:
      | { encoding: BufferEncoding | null; withFileTypes?: false }
      | BufferEncoding
      | null
  ): string[];

  /**
   * Synchronous readdir(3) - read a directory.
   * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
   * @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
   */
  export function readdirSync(
    path: PathLike,
    options: { encoding: "buffer"; withFileTypes?: false } | "buffer"
  ): Buffer[];

  /**
   * Synchronous readdir(3) - read a directory.
   * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
   * @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
   */
  export function readdirSync(
    path: PathLike,
    options?:
      | { encoding?: string | null; withFileTypes?: false }
      | string
      | null
  ): string[] | Buffer[];

  /**
   * Synchronous readdir(3) - read a directory.
   * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
   * @param options If called with `withFileTypes: true` the result data will be an array of Dirent.
   */
  export function readdirSync(
    path: PathLike,
    options: { encoding?: string | null; withFileTypes: true }
  ): Dirent[];

  class WriteStream extends Writable {
    close(): void;
    bytesWritten: number;
    path: string | Buffer;
    pending: boolean;

    /**
     * events.EventEmitter
     *   1. open
     *   2. close
     *   3. ready
     */
    addListener(event: "close", listener: () => void): this;
    addListener(event: "drain", listener: () => void): this;
    addListener(event: "error", listener: (err: Error) => void): this;
    addListener(event: "finish", listener: () => void): this;
    addListener(event: "open", listener: (fd: number) => void): this;
    addListener(event: "pipe", listener: (src: Readable) => void): this;
    addListener(event: "ready", listener: () => void): this;
    addListener(event: "unpipe", listener: (src: Readable) => void): this;
    addListener(
      event: string | symbol,
      listener: (...args: any[]) => void
    ): this;

    on(event: "close", listener: () => void): this;
    on(event: "drain", listener: () => void): this;
    on(event: "error", listener: (err: Error) => void): this;
    on(event: "finish", listener: () => void): this;
    on(event: "open", listener: (fd: number) => void): this;
    on(event: "pipe", listener: (src: Readable) => void): this;
    on(event: "ready", listener: () => void): this;
    on(event: "unpipe", listener: (src: Readable) => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;

    once(event: "close", listener: () => void): this;
    once(event: "drain", listener: () => void): this;
    once(event: "error", listener: (err: Error) => void): this;
    once(event: "finish", listener: () => void): this;
    once(event: "open", listener: (fd: number) => void): this;
    once(event: "pipe", listener: (src: Readable) => void): this;
    once(event: "ready", listener: () => void): this;
    once(event: "unpipe", listener: (src: Readable) => void): this;
    once(event: string | symbol, listener: (...args: any[]) => void): this;

    prependListener(event: "close", listener: () => void): this;
    prependListener(event: "drain", listener: () => void): this;
    prependListener(event: "error", listener: (err: Error) => void): this;
    prependListener(event: "finish", listener: () => void): this;
    prependListener(event: "open", listener: (fd: number) => void): this;
    prependListener(event: "pipe", listener: (src: Readable) => void): this;
    prependListener(event: "ready", listener: () => void): this;
    prependListener(event: "unpipe", listener: (src: Readable) => void): this;
    prependListener(
      event: string | symbol,
      listener: (...args: any[]) => void
    ): this;

    prependOnceListener(event: "close", listener: () => void): this;
    prependOnceListener(event: "drain", listener: () => void): this;
    prependOnceListener(event: "error", listener: (err: Error) => void): this;
    prependOnceListener(event: "finish", listener: () => void): this;
    prependOnceListener(event: "open", listener: (fd: number) => void): this;
    prependOnceListener(event: "pipe", listener: (src: Readable) => void): this;
    prependOnceListener(event: "ready", listener: () => void): this;
    prependOnceListener(
      event: "unpipe",
      listener: (src: Readable) => void
    ): this;
    prependOnceListener(
      event: string | symbol,
      listener: (...args: any[]) => void
    ): this;
  }

  /**
   * Returns a new `WriteStream` object.
   * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
   * URL support is _experimental_.
   */
  export function createWriteStream(
    path: PathLike,
    options?:
      | string
      | {
          flags?: string;
          encoding?: string;
          fd?: number;
          mode?: number;
          autoClose?: boolean;
          emitClose?: boolean;
          start?: number;
          highWaterMark?: number;
        }
  ): WriteStream;

  type WriteFileOptions =
    | { encoding?: string | null; mode?: number | string; flag?: string }
    | string
    | null;

  /**
   * Synchronously writes data to a file, replacing the file if it already exists.
   * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
   * URL support is _experimental_.
   * If a file descriptor is provided, the underlying file will _not_ be closed automatically.
   * @param data The data to write. If something other than a Buffer or Uint8Array is provided, the value is coerced to a string.
   * @param options Either the encoding for the file, or an object optionally specifying the encoding, file mode, and flag.
   * If `encoding` is not supplied, the default of `'utf8'` is used.
   * If `mode` is not supplied, the default of `0o666` is used.
   * If `mode` is a string, it is parsed as an octal integer.
   * If `flag` is not supplied, the default of `'w'` is used.
   */
  function writeFileSync(
    path: PathLike | number,
    data: any,
    options?: WriteFileOptions
  ): void;
}
