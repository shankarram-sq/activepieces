import { createAction, Property } from '@activepieces/pieces-framework';
import {
  libsqlCommon,
  libsqlConnect,
  sanitizeColumnName,
  warningMarkdown,
} from '../common';
import { libsqlAuth } from '../..';
import type { ResultSet } from '@libsql/client';

export default createAction({
  auth: libsqlAuth,
  name: 'find_rows',
  displayName: 'Find Rows',
  description: 'Reads rows from a table',
  props: {
    markdown: warningMarkdown,
    table: libsqlCommon.table(),
    condition: Property.ShortText({
      displayName: 'Condition',
      description: 'SQL condition, can also include logic operators, e.g. id = ? AND status = ?',
      required: true,
    }),
    args: Property.Array({
      displayName: 'Arguments',
      description: 'Arguments can be used with ? in the condition',
      required: false,
    }),
    columns: Property.Array({
      displayName: 'Columns',
      description: 'Specify the columns you want to select. Leave empty to select all columns.',
      required: false,
    }),
  },
  async run(context) {
    const columns = (context.propsValue.columns as string[]) || ['*'];
    const sanitizedColumns = columns.map((c) => sanitizeColumnName(c)).join(', ');
    const sql = `SELECT ${sanitizedColumns} FROM ${sanitizeColumnName(context.propsValue.table)} WHERE ${context.propsValue.condition};`;

    const client = libsqlConnect(context.auth);
    try {
      const result: ResultSet = await client.execute({
        sql,
        args: (context.propsValue.args as string[]) ?? [],
      });
      const rows = result.rows.map((row) => {
        const obj: Record<string, unknown> = {};
        result.columns.forEach((col: string, i: number) => {
          obj[col] = row[i];
        });
        return obj;
      });
      return { results: rows };
    } finally {
      client.close();
    }
  },
});
