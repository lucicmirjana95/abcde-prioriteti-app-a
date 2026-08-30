class SafeStorage implements Storage {
  private mem: Record<string, string> = {};

  get length() {
    return Object.keys(this.mem).length;
  }

  clear() {
    try {
      window.localStorage.clear();
    } catch {}
    this.mem = {};
  }

  getItem(key: string) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return this.mem[key] || null;
    }
  }

  key(index: number) {
    try {
      return window.localStorage.key(index);
    } catch {
      return Object.keys(this.mem)[index] || null;
    }
  }

  removeItem(key: string) {
    try {
      window.localStorage.removeItem(key);
    } catch {}
    delete this.mem[key];
  }

  setItem(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch {}
    this.mem[key] = value;
  }
}

const safeStorageInstance = new SafeStorage();
(window as any).safeStorage = safeStorageInstance;
export const safeStorage = safeStorageInstance;
