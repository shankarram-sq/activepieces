import {
  Property,
} from '@activepieces/pieces-framework';
import { createClient, Client } from '@libsql/client';
import { sqliteAuth } from '../../auth';
export const warningMarkdown = Property.MarkDown({
  value: `
  **DO NOT** use dynamic input directly in the query string or column names.
  \n
  Use **?** in the query and dynamic values in args/values for parameterized queries to prevent **SQL injection**.`
});

export async function sqliteConnect(
  auth: any
): Promise<Client> {
  const url = (auth?.url || auth?.props?.url || '') as string;
  const authToken = auth?.authToken || auth?.props?.authToken;

  if (/^file:/i.test(url.trim())) {
    throw new Error(
      'Local file: URLs are not permitted. Use a remote libSQL/Turso URL (libsql:// or https://) instead.'
    );
  }

  const client = createClient({
    url: url,
    authToken: authToken || undefined,
  });
  return client;
}

export async function sqliteGetTableNames(conn: Client): Promise<string[]> {
  const result = await conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");
  return result.rows.map((row) => row.name as string);
}

export const sqliteCommon = {
  table: (required = true) => {
    return Property.Dropdown({
      auth: sqliteAuth,
      displayName: 'Table',
      required,
      refreshers: [],
      options: async ({ auth }) => {
        if (!auth) {
          return {
            disabled: true,
            placeholder: 'Connect to your database first',
            options: [],
          };
        }
        const conn = await sqliteConnect(auth);
        try {
          const tables = await sqliteGetTableNames(conn);
          return {
            disabled: false,
            options: tables.map((table) => {
              return {
                label: table,
                value: table,
              };
            }),
          };
        } finally {
          conn.close();
        }
      },
    });
  },
};

/**
 * Escape an identifier (table or column name) for SQLite using double-quote
 * wrapping with internal double-quotes doubled.
 */
export function sanitizeColumnName(name: string | undefined): string {
  if (name === '*') {
    return name;
  }
  // Escape any double-quotes inside the identifier, then wrap in double-quotes
  return `"${(name ?? '').replace(/"/g, '""')}"`;
}
