declare module "@vercel/ncc" {
  export default function ncc(path: string, opts?: {}): { code: string };
}

declare module "pkg" {
  export function exec(arr: string[]): Promise<void>
}