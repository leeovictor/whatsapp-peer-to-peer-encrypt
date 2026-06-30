const publicKeys = new Map<string, string>();

export const keysStore = {
  setPublicKey(userId: string, publicKey: string): void {
    publicKeys.set(userId, publicKey);
  },

  getPublicKey(userId: string): string | undefined {
    return publicKeys.get(userId);
  },

  removePublicKey(userId: string): void {
    publicKeys.delete(userId);
  },
};
