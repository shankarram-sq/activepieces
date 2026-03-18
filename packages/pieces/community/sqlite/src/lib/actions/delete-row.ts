import { createAction, Property } from '@activepieces/pieces-framework';
import { sqliteCommon, sqliteConnect, sanitizeColumnName, warningMarkdown } from '../common';
import { sqliteAuth } from '../../auth';

export default createAction({
  auth: sqliteAuth,
  name: 'delete_row',
  displayName: 'Delete Row',
  description: 'Deletes one or more rows from a table',
  props: {
    markdown: warningMarkdown,
    table: sqliteCommon.table(),
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
    const tableName = sanitizeColumnName(context.propsValue.table);
    const searchColumn = sanitizeColumnName(context.propsValue.search_column);
    const searchValue = context.propsValue.search_value;

    const queryString = `DELETE FROM ${tableName} WHERE ${searchColumn}=?;`;

    const connection = await sqliteConnect(context.auth);
    try {
      const result = await connection.execute({
        sql: queryString,
        args: [searchValue] as any[]
      });
      return { rowsAffected: result.rowsAffected };
    } finally {
      connection.close();
    }
  },
});
