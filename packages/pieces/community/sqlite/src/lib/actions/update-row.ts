import { createAction, Property } from '@activepieces/pieces-framework';
import { sqliteCommon, sqliteConnect, sanitizeColumnName } from '../common/index';
import { sqliteAuth } from '../../auth';

export default createAction({
  auth: sqliteAuth,
  name: 'update_row',
  displayName: 'Update Row',
  description: 'Updates one or more rows in a table',
  props: {
    table: sqliteCommon.table(),
    values: Property.Object({
      displayName: 'Values',
      required: true,
    }),
    search_column: Property.ShortText({
      displayName: 'Search Column',
      required: true,
    }),
    search_value: Property.ShortText({
      displayName: 'Search Value',
      required: true,
    }),
  },
  async run(context) {
    const fields = Object.keys(context.propsValue.values);
    const qsValues = fields.map((f) => sanitizeColumnName(f) + '=?').join(',');
    const qs = `UPDATE ${sanitizeColumnName(context.propsValue.table)} SET ${qsValues} WHERE ${sanitizeColumnName(context.propsValue.search_column)}=?;`;
    const conn = await sqliteConnect(context.auth);
    try {
      const values = fields.map((f) => context.propsValue.values[f]);
      const result = await conn.execute({
        sql: qs,
        args: [
          ...values,
          context.propsValue.search_value,
        ] as any[]
      });
      return { rowsAffected: result.rowsAffected };
    } finally {
      conn.close();
    }
  },
});
