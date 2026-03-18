import { createAction, Property } from '@activepieces/pieces-framework';
import { sqliteCommon, sqliteConnect, sanitizeColumnName, warningMarkdown } from '../common';
import { sqliteAuth } from '../../auth';

export default createAction({
  auth: sqliteAuth,
  name: 'find_rows',
  displayName: 'Find Rows',
  description: 'Reads rows from a table',
  props: {
    markdown: warningMarkdown,
    table: sqliteCommon.table(),
    condition: Property.ShortText({
      displayName: 'Condition',
      description: 'SQL condition, can also include logic operators, etc.',
      required: true,
    }),
    args: Property.Array({
      displayName: 'Arguments',
      description: 'Arguments can be used using ? in the condition',
      required: false,
    }),
    columns: Property.Array({
      displayName: 'Columns',
      description: 'Specify the columns you want to select',
      required: false,
    }),
  },
  async run(context) {
    const columns = (context.propsValue.columns as string[]) || ['*'];
    const qsColumns = columns
      .map((c) => sanitizeColumnName(c))
      .join(',');

    const qs = `SELECT ${qsColumns} FROM ${sanitizeColumnName(context.propsValue.table)} WHERE ${context.propsValue.condition};`;

    const conn = await sqliteConnect(context.auth);

    try {
      const results = await conn.execute({
        sql: qs,
        args: (context.propsValue.args as any[]) || []
      });
      const rows = results.rows.map((row) => {
        const obj: Record<string, unknown> = {};
        results.columns.forEach((col: string, i: number) => {
          obj[col] = row[i];
        });
        return obj;
      });
      return { results: rows };
    } finally {
      conn.close();
    }
  },
});
