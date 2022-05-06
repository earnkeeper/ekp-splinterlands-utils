export function config(
  name: string,
  options: { default?: any; cast?: string; required?: boolean } = {
    required: true,
  },
) {
  const value = process.env[name];

  if (value === undefined) {
    if (options.required && options.default === undefined) {
      throw new Error('Could not find required environment variable: ' + name);
    }

    return options.default;
  }

  if (options.cast === 'number') {
    return Number(value);
  }

  return value;
}
