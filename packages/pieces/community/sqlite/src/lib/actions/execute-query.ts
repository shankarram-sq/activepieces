import { createAction, Property } from '@activepieces/pieces-framework';
import { sqliteCommon, sqliteConnect, warningMarkdown } from '../common';
import { sqliteAuth } from '../../auth';

export default createAction({
  auth: sqliteAuth,
  name: 'execute_query',
  displayName: 'Execute Query',
  description: 'Executes a query on the sqlite database and returns the results',
  props: {
    markdown: warningMarkdown,
    query: Property.ShortText({
      displayName: 'Query',
      description: 'The query string to execute, use ? or named parameters for arguments to avoid SQL injection.',
      required: true,
    }),
    args: Property.Array({
      displayName: 'Positional Arguments',
      description: 'Positional arguments for ? placeholders, in order.',
      required: false,
    }),
    namedArgs: Property.Object({
      displayName: 'Named Arguments',
      description: 'Named arguments for :name, @name, or $name placeholders. When provided, Positional Arguments is ignored.',
      required: false,
    }),
  },
  async run(context) {
    const namedArgs = context.propsValue.namedArgs as Record<string, unknown> | undefined;
    const hasNamedArgs = namedArgs && Object.keys(namedArgs).length > 0;
    const args = hasNamedArgs
      ? (namedArgs as Record<string, unknown>)
      : ((context.propsValue.args as unknown[]) || []);

    const conn = await sqliteConnect(context.auth);
    try {
      const results = await conn.execute({
        sql: context.propsValue.query,
        args: args as any,
      });
      if (results.columns.length > 0) {
        const rows = results.rows.map((row) => {
          const obj: Record<string, unknown> = {};
          results.columns.forEach((col: string, i: number) => {
            obj[col] = row[i];
          });
          return obj;
        });
        return { results: rows };
      }
      return {
        rowsAffected: results.rowsAffected,
        lastInsertRowid: results.lastInsertRowid?.toString() ?? null,
      };
    } finally {
      conn.close();
    }
  },
});
