/**
 * End-to-end tests for the libsql piece.
 *
 * These tests exercise the core database operations against an in-memory
 * SQLite database launched locally via @libsql/client.  They verify that
 * every helper function used by the piece actions behaves correctly before
 * the piece is wired into the Activepieces framework.
 *
 * Run with:  npx vitest run packages/pieces/community/libsql
 */

import { createClient, type Client } from '@libsql/client';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers copied verbatim from src/lib/common/index.ts so the tests remain
// independent of the Activepieces workspace (no workspace:* deps required).
// ---------------------------------------------------------------------------

function sanitizeColumnName(name: string | undefined): string {
  if (name === '*') return name;
  return `"${(name ?? '').replace(/"/g, '""')}"`;
}

function libsqlConnect(url: string, authToken?: string): Client {
  return createClient({ url, authToken: authToken || undefined });
}

async function libsqlGetTableNames(client: Client): Promise<string[]> {
  const result = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"
  );
  return result.rows.map((row) => row[0] as string);
}

async function executeQuery(
  client: Client,
  sql: string,
  args?: unknown[]
): Promise<Record<string, unknown>> {
  const result = await client.execute({ sql, args: (args ?? []) as never });
  if (result.columns.length > 0) {
    const rows = result.rows.map((row) => {
      const obj: Record<string, unknown> = {};
      result.columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });
    return { results: rows };
  }
  return {
    rowsAffected: result.rowsAffected,
    lastInsertRowid: result.lastInsertRowid?.toString() ?? null,
  };
}

async function insertRow(
  client: Client,
  table: string,
  values: Record<string, unknown>
) {
  const fields = Object.keys(values);
  const qsFields = fields.map((f) => sanitizeColumnName(f)).join(', ');
  const qsPlaceholders = fields.map(() => '?').join(', ');
  const sql = `INSERT INTO ${sanitizeColumnName(table)} (${qsFields}) VALUES (${qsPlaceholders});`;
  const result = await client.execute({
    sql,
    args: fields.map((f) => values[f]) as never,
  });
  return {
    rowsAffected: result.rowsAffected,
    lastInsertRowid: result.lastInsertRowid?.toString() ?? null,
  };
}

async function findRows(
  client: Client,
  table: string,
  condition: string,
  args?: unknown[],
  columns?: string[]
) {
  const cols = columns && columns.length > 0 ? columns : ['*'];
  const qsColumns = cols.map((c) => sanitizeColumnName(c)).join(', ');
  const sql = `SELECT ${qsColumns} FROM ${sanitizeColumnName(table)} WHERE ${condition};`;
  const result = await client.execute({
    sql,
    args: (args ?? []) as never,
  });
  const rows = result.rows.map((row) => {
    const obj: Record<string, unknown> = {};
    result.columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
  return { results: rows };
}

async function updateRow(
  client: Client,
  table: string,
  values: Record<string, unknown>,
  searchColumn: string,
  searchValue: unknown
) {
  const fields = Object.keys(values);
  const qsSet = fields.map((f) => `${sanitizeColumnName(f)} = ?`).join(', ');
  const sql = `UPDATE ${sanitizeColumnName(table)} SET ${qsSet} WHERE ${sanitizeColumnName(searchColumn)} = ?;`;
  const args = [...fields.map((f) => values[f]), searchValue];
  const result = await client.execute({ sql, args: args as never });
  return { rowsAffected: result.rowsAffected };
}

async function deleteRow(
  client: Client,
  table: string,
  searchColumn: string,
  searchValue: unknown
) {
  const sql = `DELETE FROM ${sanitizeColumnName(table)} WHERE ${sanitizeColumnName(searchColumn)} = ?;`;
  const result = await client.execute({
    sql,
    args: [searchValue] as never,
  });
  return { rowsAffected: result.rowsAffected };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('libsql piece – in-memory SQLite database (local)', () => {
  let client: Client;

  beforeAll(async () => {
    // Launch a local in-memory SQLite database (no server required)
    client = libsqlConnect(':memory:');
    await client.execute(`
      CREATE TABLE users (
        id    INTEGER PRIMARY KEY AUTOINCREMENT,
        name  TEXT    NOT NULL,
        email TEXT    UNIQUE,
        age   INTEGER
      );
    `);
  });

  afterAll(() => {
    client.close();
  });

  // --- sanitizeColumnName -------------------------------------------------

  it('sanitizeColumnName wraps identifier in double quotes', () => {
    expect(sanitizeColumnName('name')).toBe('"name"');
  });

  it('sanitizeColumnName returns * unchanged', () => {
    expect(sanitizeColumnName('*')).toBe('*');
  });

  it('sanitizeColumnName escapes embedded double-quotes', () => {
    expect(sanitizeColumnName('my"col')).toBe('"my""col"');
  });

  it('sanitizeColumnName handles undefined gracefully', () => {
    expect(sanitizeColumnName(undefined)).toBe('""');
  });

  // --- get tables ---------------------------------------------------------

  it('get tables returns a list that includes the test table', async () => {
    const tables = await libsqlGetTableNames(client);
    expect(Array.isArray(tables)).toBe(true);
    expect(tables).toContain('users');
  });

  // --- insert row ---------------------------------------------------------

  it('insert row adds a new record and returns rowsAffected = 1', async () => {
    const result = await insertRow(client, 'users', {
      name: 'Alice',
      email: 'alice@example.com',
      age: 30,
    });
    expect(result.rowsAffected).toBe(1);
    expect(result.lastInsertRowid).toBe('1');
  });

  it('insert row adds a second record', async () => {
    const result = await insertRow(client, 'users', {
      name: 'Bob',
      email: 'bob@example.com',
      age: 25,
    });
    expect(result.rowsAffected).toBe(1);
    expect(result.lastInsertRowid).toBe('2');
  });

  // --- find rows ----------------------------------------------------------

  it('find rows returns all matching records', async () => {
    const result = await findRows(client, 'users', 'age > ?', [20]);
    expect(result.results.length).toBe(2);
    expect(result.results.map((r) => r['name'])).toContain('Alice');
    expect(result.results.map((r) => r['name'])).toContain('Bob');
  });

  it('find rows with specific columns only returns those columns', async () => {
    const result = await findRows(
      client,
      'users',
      'name = ?',
      ['Alice'],
      ['name', 'email']
    );
    expect(result.results.length).toBe(1);
    expect(result.results[0]['name']).toBe('Alice');
    expect(result.results[0]['email']).toBe('alice@example.com');
    expect(result.results[0]['age']).toBeUndefined();
  });

  // --- update row ---------------------------------------------------------

  it('update row modifies the matching record', async () => {
    const result = await updateRow(client, 'users', { age: 31 }, 'name', 'Alice');
    expect(result.rowsAffected).toBe(1);

    const found = await findRows(client, 'users', 'name = ?', ['Alice']);
    expect(found.results[0]['age']).toBe(31);
  });

  // --- delete row ---------------------------------------------------------

  it('delete row removes the matching record', async () => {
    const result = await deleteRow(client, 'users', 'name', 'Bob');
    expect(result.rowsAffected).toBe(1);

    const found = await findRows(client, 'users', 'name = ?', ['Bob']);
    expect(found.results.length).toBe(0);
  });

  // --- execute query (raw) ------------------------------------------------

  it('execute query with SELECT returns results array', async () => {
    const result = (await executeQuery(client, 'SELECT * FROM users WHERE name = ?', [
      'Alice',
    ])) as { results: Record<string, unknown>[] };
    expect(result.results.length).toBe(1);
    expect(result.results[0]['name']).toBe('Alice');
  });

  it('execute query with DDL (CREATE TABLE) works', async () => {
    const result = await executeQuery(
      client,
      'CREATE TABLE products (id INTEGER PRIMARY KEY, title TEXT);'
    );
    expect((result as { rowsAffected: number }).rowsAffected).toBe(0);
  });

  it('execute query with INSERT returns rowsAffected', async () => {
    const result = (await executeQuery(
      client,
      'INSERT INTO products (title) VALUES (?)',
      ['Widget']
    )) as { rowsAffected: number; lastInsertRowid: string };
    expect(result.rowsAffected).toBe(1);
    expect(result.lastInsertRowid).toBeDefined();
  });

  it('get tables returns all tables after DDL', async () => {
    const tables = await libsqlGetTableNames(client);
    expect(tables).toContain('users');
    expect(tables).toContain('products');
  });
});

// ---------------------------------------------------------------------------
// Local file-based database
// ---------------------------------------------------------------------------

describe('libsql piece – local file SQLite database', () => {
  const DB_PATH = '/tmp/test-libsql-piece.db';
  let client: Client;

  beforeAll(async () => {
    client = libsqlConnect(`file:${DB_PATH}`);
    await client.execute(
      'CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL);'
    );
    // Clean slate before each test run
    await client.execute('DELETE FROM items;');
  });

  afterAll(() => {
    client.close();
  });

  it('inserts a record into a file-backed database', async () => {
    const result = await insertRow(client, 'items', { label: 'hello' });
    expect(result.rowsAffected).toBe(1);
  });

  it('reads the record back from the file-backed database', async () => {
    const result = await findRows(client, 'items', "label = 'hello'");
    expect(result.results.length).toBe(1);
    expect(result.results[0]['label']).toBe('hello');
  });

  it('updates the record in the file-backed database', async () => {
    const result = await updateRow(client, 'items', { label: 'world' }, 'label', 'hello');
    expect(result.rowsAffected).toBe(1);

    const found = await findRows(client, 'items', "label = 'world'");
    expect(found.results[0]['label']).toBe('world');
  });

  it('deletes the record from the file-backed database', async () => {
    const result = await deleteRow(client, 'items', 'label', 'world');
    expect(result.rowsAffected).toBe(1);

    const all = await findRows(client, 'items', '1=1');
    expect(all.results.length).toBe(0);
  });
});
