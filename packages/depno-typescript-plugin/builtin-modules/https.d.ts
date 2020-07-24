declare module "https" {
  import * as http from "http";
  import * as tls from "tls";

  type RequestOptions = http.RequestOptions &
    tls.SecureContextOptions & {
      rejectUnauthorized?: boolean; // Defaults to true
      servername?: string; // SNI TLS Extension
    };

  export function request(
    options: RequestOptions | string | URL,
    callback?: (res: http.IncomingMessage) => void
  ): http.ClientRequest;
  export function request(
    url: string | URL,
    options: RequestOptions,
    callback?: (res: http.IncomingMessage) => void
  ): http.ClientRequest;
}
