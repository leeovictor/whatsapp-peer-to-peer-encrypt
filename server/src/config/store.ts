export function useLocalStore(): boolean {
  return process.env.DATA_STORE === 'local';
}
