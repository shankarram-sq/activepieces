import {
  AppConnectionValueForAuthProperty,
  Property,
} from '@activepieces/pieces-framework';
import { createClient, Client } from '@libsql/client';
import { libsqlAuth } from '../..';

export const warningMarkdown = Property.MarkDown({
  value: `
  **DO NOT** use dynamic input directly in the query string or column names.
  \n
  Use **?** in the query and dynamic values in args/values for parameterized queries to prevent **SQL injection**.`,
});

export function libsqlConnect(
  auth: AppConnectionValueForAuthProperty<typeof libsqlAuth>
): Client {
  const authWithFallback = auth as
    | AppConnectionValueForAuthProperty<typeof libsqlAuth>
    | { url?: string; authToken?: string };
  const url = (
    authWithFallback.props?.url ??
    authWithFallback.url ??
    ''
  ).trim();
  const authToken =
    (
      authWithFallback.props?.authToken ??
      authWithFallback.authToken ??
      undefined
    )?.trim() || undefined;
  return createClient({ url, authToken });
}

export async function libsqlGetTableNames(client: Client): Promise<string[]> {
  const result = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"
  );
  return result.rows.map((row) => (row['name'] as string) ?? (row[0] as string));
}

export const libsqlCommon = {
  table: (required = true) =>
    Property.Dropdown({
      auth: libsqlAuth,
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
        const client = libsqlConnect(
          auth as AppConnectionValueForAuthProperty<typeof libsqlAuth>
        );
        try {
          const tables = await libsqlGetTableNames(client);
          return {
            disabled: false,
            options: tables.map((table) => ({
              label: table,
              value: table,
            })),
          };
        } finally {
          client.close();
        }
      },
    }),
};

/**
 * Escape an identifier (table or column name) for SQLite using double-quote
 * wrapping with internal double-quotes doubled.
 */
export function sanitizeColumnName(name: string | undefined): string {
  if (name === '*') {
    return name;
  }
  if (!name) {
    throw new Error('Column or table name is required.');
  }
  // Escape any double-quotes inside the identifier, then wrap in double-quotes
  return `"${name.replace(/"/g, '""')}"`;
}
