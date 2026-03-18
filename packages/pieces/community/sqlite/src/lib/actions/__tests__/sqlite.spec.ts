import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@libsql/client';

// Mock sqliteConnect to bypass the file: URL security check so integration
// tests can use a local test DB while still exercising action logic.
vi.mock('../common', async () => {
  const mod = await vi.importActual<typeof import('../common')>('../common');
  return {
    ...mod,
    sqliteConnect: async (auth: any) => {
      const url = auth?.url || auth?.props?.url;
      const authToken = auth?.authToken || auth?.props?.authToken;
      return createClient({ url, authToken: authToken || undefined });
    },
  };
});

import insertRow from '../insert-row';
import findRows from '../find-rows';
import updateRow from '../update-row';
import deleteRow from '../delete-row';
import getTables from '../get-tables';
import executeQuery from '../execute-query';
import fs from 'fs';
import path from 'path';

const dbPath = path.resolve(__dirname, 'test.db');
const dbUrl = `file:${dbPath}`;

const mockAuth = {
  url: dbUrl,
};

describe('SQLite Piece End-to-End', () => {
  let client;

  beforeAll(async () => {
    // Ensure cleanup of any old test DB
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    client = createClient({ url: dbUrl });

    // Initialize schema
    await client.execute(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL
      );
    `);
  });

  afterAll(async () => {
    client.close();
    // Cleanup the database file
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  it('should list tables', async () => {
    const context = {
      auth: mockAuth,
      propsValue: {},
    };

    const result = await getTables.run(context as any);
    expect(result.tables).toContain('users');
  });

  it('should insert a row', async () => {
    const context = {
      auth: mockAuth,
      propsValue: {
        table: 'users',
        values: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      },
    };

    const result = await insertRow.run(context as any);
    expect(result.rowsAffected).toBe(1);
  });

  it('should execute a query to verify insert', async () => {
    const context = {
      auth: mockAuth,
      propsValue: {
        query: 'SELECT * FROM users WHERE email = ?',
        args: ['john@example.com'],
      },
    };

    const result = await executeQuery.run(context as any);
    expect(result.results.length).toBe(1);
    expect(result.results[0].name).toBe('John Doe');
  });

  it('should find rows', async () => {
    const context = {
      auth: mockAuth,
      propsValue: {
        table: 'users',
        condition: 'name = ?',
        args: ['John Doe'],
        columns: ['email'],
      },
    };

    const result = await findRows.run(context as any);
    expect(result.results.length).toBe(1);
    expect(result.results[0].email).toBe('john@example.com');
  });

  it('should update a row', async () => {
    const context = {
      auth: mockAuth,
      propsValue: {
        table: 'users',
        search_column: 'email',
        search_value: 'john@example.com',
        values: {
          name: 'Jane Doe',
        },
      },
    };

    const result = await updateRow.run(context as any);
    expect(result.rowsAffected).toBe(1);

    // Verify update
    const findContext = {
      auth: mockAuth,
      propsValue: {
        table: 'users',
        condition: 'email = ?',
        args: ['john@example.com'],
      },
    };
    const findResult = await findRows.run(findContext as any);
    expect(findResult.results[0].name).toBe('Jane Doe');
  });

  it('should delete a row', async () => {
    const context = {
      auth: mockAuth,
      propsValue: {
        table: 'users',
        search_column: 'email',
        search_value: 'john@example.com',
      },
    };

    const result = await deleteRow.run(context as any);
    expect(result.rowsAffected).toBe(1);

    // Verify deletion
    const findContext = {
      auth: mockAuth,
      propsValue: {
        table: 'users',
        condition: 'email = ?',
        args: ['john@example.com'],
      },
    };
    const findResult = await findRows.run(findContext as any);
    expect(findResult.results.length).toBe(0);
  });

  it('should insert a row using DEFAULT VALUES when no fields are provided', async () => {
    // Create a separate table that uses all defaults
    await client.execute(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    const context = {
      auth: mockAuth,
      propsValue: {
        table: 'logs',
        values: {},
      },
    };

    const result = await insertRow.run(context as any);
    expect(result.rowsAffected).toBe(1);
  });

  it('should execute a query with named parameters', async () => {
    const context = {
      auth: mockAuth,
      propsValue: {
        query: 'SELECT * FROM users WHERE email = :email',
        args: [],
        namedArgs: { email: 'john@example.com' },
      },
    };

    // Insert a fresh row for this test
    await client.execute(`INSERT INTO users (name, email) VALUES ('Named Test', 'john@example.com') ON CONFLICT(email) DO NOTHING;`);

    const result = await executeQuery.run(context as any);
    expect(Array.isArray(result.results)).toBe(true);
  });
});

describe('sqliteConnect URL security', () => {
  it('should reject file: URLs', async () => {
    const { sqliteConnect } = await vi.importActual<typeof import('../common')>('../common');
    await expect(sqliteConnect({ url: 'file:/etc/passwd' })).rejects.toThrow(
      'Local file: URLs are not permitted'
    );
  });

  it('should reject file: URLs case-insensitively', async () => {
    const { sqliteConnect } = await vi.importActual<typeof import('../common')>('../common');
    await expect(sqliteConnect({ url: 'FILE:database.db' })).rejects.toThrow(
      'Local file: URLs are not permitted'
    );
  });
});
