declare module "dns" {
  export interface LookupOptions {
    family?: number;
    hints?: number;
    all?: boolean;
    verbatim?: boolean;
  }

  export interface LookupOneOptions extends LookupOptions {
    all?: false;
  }
}
