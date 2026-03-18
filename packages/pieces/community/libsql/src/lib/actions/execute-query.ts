import { createAction, Property } from '@activepieces/pieces-framework';
import { libsqlConnect, warningMarkdown } from '../common';
import { libsqlAuth } from '../..';
import type { ResultSet } from '@libsql/client';

export default createAction({
  auth: libsqlAuth,
  name: 'execute_query',
  displayName: 'Execute Query',
  description: 'Executes a query on the SQLite/Turso database and returns the results',
  props: {
    markdown: warningMarkdown,
    query: Property.ShortText({
      displayName: 'Query',
      description:
        'The query string to execute. Use ? for positional arguments to avoid SQL injection.',
      required: true,
    }),
    args: Property.Array({
      displayName: 'Arguments',
      description:
        'Arguments to use in the query, if any. Should be in the same order as the ? placeholders.',
      required: false,
    }),
  },
  async run(context) {
    const client = libsqlConnect(context.auth);
    try {
      const result: ResultSet = await client.execute({
        sql: context.propsValue.query,
        args: (context.propsValue.args as unknown[]) ?? [],
      });
      if (result.columns.length > 0) {
        // SELECT-style result: convert rows to plain objects
        const rows = result.rows.map((row) => {
          const obj: Record<string, unknown> = {};
          result.columns.forEach((col: string, i: number) => {
            obj[col] = row[i];
          });
          return obj;
        });
        return { results: rows };
      }
      // Return raw libSQL metadata (e.g., rowsAffected and lastInsertRowid).
      return result;
    } finally {
      client.close();
    }
  },
});
