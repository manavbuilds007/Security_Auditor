/** Text files the app can read. Anything else is refused with a message instead of being loaded as garbage. */
export const SUPPORTED_EXTENSIONS = ['.txt', '.csv'] as const;

export function isSupportedTextFile(name: string, mimeType = ''): boolean {
  const n = name.toLowerCase();
  if (SUPPORTED_EXTENSIONS.some((e) => n.endsWith(e))) return true;
  // Extension-less or oddly named files are fine if the browser says they are plain text / CSV.
  return mimeType === 'text/plain' || mimeType === 'text/csv';
}

export const UNSUPPORTED_FILE_MESSAGE = 'Only .txt and .csv files can be loaded.';
