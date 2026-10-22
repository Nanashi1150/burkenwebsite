import 'server-only'

// SQLite has one writer. Retry a fresh operation after a transient lock;
// access rules, workflow hooks and conditional claims still run on every attempt.
export async function localWrite<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await operation() } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (attempt >= 5 || !/SQLITE_BUSY|database is locked/i.test(message)) throw error
      await new Promise(resolve => setTimeout(resolve, 80 * 2 ** attempt))
    }
  }
}
