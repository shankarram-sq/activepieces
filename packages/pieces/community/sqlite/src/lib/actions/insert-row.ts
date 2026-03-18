import { createAction, Property } from '@activepieces/pieces-framework';
import { sqliteCommon, sqliteConnect, sanitizeColumnName, warningMarkdown } from '../common';
import { sqliteAuth } from '../../auth';

export default createAction({
  auth: sqliteAuth,
  name: 'insert_row',
  displayName: 'Insert Row',
  description: 'Inserts a new row into a table',
  props: {
    table: sqliteCommon.table(),
    values: Property.Object({
      displayName: 'Values',
      required: true,
    }),
  },
  async run(context) {
    const fields = Object.keys(context.propsValue.values);
    const qsFields = fields.map((f) => sanitizeColumnName(f)).join(',');
    const qsValues = fields.map(() => '?').join(',');
    const qs = `INSERT INTO ${sanitizeColumnName(context.propsValue.table)} (${qsFields}) VALUES (${qsValues});`;

    const conn = await sqliteConnect(context.auth);
    try {
      const values = fields.map((f) => context.propsValue.values[f]);
      const result = await conn.execute({
        sql: qs,
        args: values as any[]
      });
      return {
        rowsAffected: result.rowsAffected,
        lastInsertRowid: result.lastInsertRowid?.toString() ?? null,
      };
    } finally {
      conn.close();
    }
  },
});
