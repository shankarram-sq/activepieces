import { createAction, Property } from '@activepieces/pieces-framework';
import { libsqlCommon, libsqlConnect, sanitizeColumnName } from '../common';
import { libsqlAuth } from '../..';

export default createAction({
  auth: libsqlAuth,
  name: 'insert_row',
  displayName: 'Insert Row',
  description: 'Inserts a new row into a table',
  props: {
    table: libsqlCommon.table(),
    values: Property.Object({
      displayName: 'Values',
      required: true,
    }),
  },
  async run(context) {
    const fields = Object.keys(context.propsValue.values);
    const sanitizedFields = fields.map((f) => sanitizeColumnName(f)).join(', ');
    const placeholders = fields.map(() => '?').join(', ');
    const sql = `INSERT INTO ${sanitizeColumnName(context.propsValue.table)} (${sanitizedFields}) VALUES (${placeholders});`;

    const client = libsqlConnect(context.auth);
    try {
      const args = fields.map((f) => context.propsValue.values[f]);
      const result = await client.execute({ sql, args });
      // Return raw libSQL metadata (e.g., rowsAffected and lastInsertRowid).
      return result;
    } finally {
      client.close();
    }
  },
});
