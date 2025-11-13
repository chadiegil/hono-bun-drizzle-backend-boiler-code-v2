// Test helpers
export function createMockContext(
  options: {
    body?: any
    headers?: Record<string, string>
    params?: Record<string, string>
  } = {}
) {
  const headers = new Map(Object.entries(options.headers || {}))

  return {
    req: {
      json: async () => options.body || {},
      header: (key: string) => headers.get(key),
      param: (key: string) => options.params?.[key]
    },
    json: (data: any, status?: number) => ({
      data,
      status: status || 200
    }),
    get: (key: string) => {
      const store = new Map()
      return store.get(key)
    },
    set: (key: string, value: any) => {
      // Mock set implementation
    }
  } as any
}
