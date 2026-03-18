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
      displayName: 'Arguments',
      description: 'Arguments to use in the query, if any. Should be in the same order as the ? in the query string.',
      required: false,
    }),
  },
  async run(context) {
    const conn = await sqliteConnect(context.auth);
    try {
      const results = await conn.execute({
        sql: context.propsValue.query,
        args: (context.propsValue.args as any[]) || []
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
