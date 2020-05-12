export function createMacro<T>(
	macroFn: (props: {
		reference: unknown;
		types: unknown;
		state: unknown;
	}) => unknown
): T;
