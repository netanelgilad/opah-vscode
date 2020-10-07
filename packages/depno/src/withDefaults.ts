export function withDefaults<TRequired, TDefaults>(
  defaults: TDefaults,
  opts: TRequired
): TRequired & TDefaults {
  return {
    ...defaults,
    ...(Object.fromEntries(
      Object.entries(opts).filter(([, val]) => typeof val !== 'undefined')
    ) as TRequired),
  };
}
