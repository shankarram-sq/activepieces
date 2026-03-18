import { createAction, Property } from '@activepieces/pieces-framework';
import { libsqlCommon, libsqlConnect, sanitizeColumnName } from '../common';
import { libsqlAuth } from '../..';

export default createAction({
  auth: libsqlAuth,
  name: 'update_row',
  displayName: 'Update Row',
  description: 'Updates one or more rows in a table',
  props: {
    table: libsqlCommon.table(),
    values: Property.Object({
      displayName: 'Values',
      required: true,
    }),
    search_column: Property.ShortText({
      displayName: 'Search Column',
      description: 'The column to use for finding the row(s) to update',
      required: true,
    }),
    search_value: Property.ShortText({
      displayName: 'Search Value',
      description: 'The value to match in the search column',
      required: true,
    }),
  },
  async run(context) {
    const fields = Object.keys(context.propsValue.values);
    const setClause = fields.map((f) => `${sanitizeColumnName(f)} = ?`).join(', ');
    const sql = `UPDATE ${sanitizeColumnName(context.propsValue.table)} SET ${setClause} WHERE ${sanitizeColumnName(context.propsValue.search_column)} = ?;`;

    const client = libsqlConnect(context.auth);
    try {
      const args = [
        ...fields.map((f) => context.propsValue.values[f]),
        context.propsValue.search_value,
      ];
      const result = await client.execute({ sql, args });
      // Return raw libSQL metadata (e.g., rowsAffected and lastInsertRowid).
      return result;
    } finally {
      client.close();
    }
  },
});
