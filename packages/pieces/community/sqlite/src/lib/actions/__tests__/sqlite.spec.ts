import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@libsql/client';
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
});
