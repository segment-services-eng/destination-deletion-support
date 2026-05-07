import { describe, it, expect } from "vitest";
import { classifyDestination } from "./classifier";

describe("classifyDestination", () => {
  it("returns 'commented-out' when onDelete is fully commented", () => {
    const content = `
      // onDelete: async (request, { settings, payload }) => {
      //   return request('https://example.com/delete')
      // },
    `;
    expect(classifyDestination(content)).toBe("commented-out");
  });

  it("returns 'commented-out' when no onDelete line is found at all", () => {
    const content = `
      const destination = {
        name: 'Test',
        actions: {}
      };
    `;
    expect(classifyDestination(content)).toBe("commented-out");
  });

  it("returns 'active' when onDelete makes a request() call", () => {
    const content = `
  onDelete: async (request, { payload }) => {
    return request('https://api.example.com/delete', {
      method: 'POST',
      json: { userId: payload.userId }
    })
  },
    `;
    expect(classifyDestination(content)).toBe("active");
  });

  it("returns 'active' when onDelete uses payload.userId", () => {
    const content = `
  onDelete: async (request, { payload }) => {
    const id = payload.userId
    return request(\`/users/\${id}\`)
  },
    `;
    expect(classifyDestination(content)).toBe("active");
  });

  it("returns 'active' when onDelete uses payload.anonymousId", () => {
    const content = `
  onDelete: async (request, { payload }) => {
    const id = payload.anonymousId
    return request(\`/anon/\${id}\`)
  },
    `;
    expect(classifyDestination(content)).toBe("active");
  });

  it("returns 'active' when onDelete uses payload[] bracket access", () => {
    const content = `
  onDelete: async (request, { payload }) => {
    const id = payload['userId']
    return true
  },
    `;
    expect(classifyDestination(content)).toBe("active");
  });

  it("returns 'active' when onDelete uses fetch()", () => {
    const content = `
  onDelete: async (request, { payload }) => {
    await fetch('https://api.example.com/delete')
  },
    `;
    expect(classifyDestination(content)).toBe("active");
  });

  it("returns 'active' when onDelete uses .delete() method", () => {
    const content = `
  onDelete: async (request, { payload }) => {
    await client.delete('/user/123')
  },
    `;
    expect(classifyDestination(content)).toBe("active");
  });

  it("returns 'active' when onDelete uses .post() method", () => {
    const content = `
  onDelete: async (request, { payload }) => {
    await client.post('/gdpr/delete', { userId: '123' })
  },
    `;
    expect(classifyDestination(content)).toBe("active");
  });

  it("returns 'active' when onDelete uses .put() method", () => {
    const content = `
  onDelete: async (request, { payload }) => {
    await client.put('/user/anonymize', {})
  },
    `;
    expect(classifyDestination(content)).toBe("active");
  });

  it("returns 'active' when onDelete is delegated to a named function", () => {
    const content = `
  onDelete: deleteUser,
  actions: {}
    `;
    expect(classifyDestination(content)).toBe("active");
  });

  it("returns 'noop' when onDelete is declared but empty", () => {
    const content = `
  onDelete: async () => {
    // Return a request that performs a GDPR delete for the provided Segment userId or anonymousId
    // provided in the payload. If your destination does not support GDPR deletion you should not
    // implement this function and should remove it completely.
  },

  actions: {
    `;
    expect(classifyDestination(content)).toBe("noop");
  });

  it("returns 'noop' when onDelete only contains comments", () => {
    const content = `
  onDelete: async (_request) => {
    // TODO: implement deletion
  },

  actions: {
    `;
    expect(classifyDestination(content)).toBe("noop");
  });
});
