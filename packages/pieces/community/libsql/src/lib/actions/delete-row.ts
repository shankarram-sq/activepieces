import { createAction, Property } from '@activepieces/pieces-framework';
import {
  libsqlCommon,
  libsqlConnect,
  sanitizeColumnName,
  warningMarkdown,
} from '../common';
import { libsqlAuth } from '../..';

export default createAction({
  auth: libsqlAuth,
  name: 'delete_row',
  displayName: 'Delete Row',
  description: 'Deletes one or more rows from a table',
  props: {
    markdown: warningMarkdown,
    table: libsqlCommon.table(),
    search_column: Property.ShortText({
      displayName: 'Search Column',
      description: 'The column to use for finding the row(s) to delete',
      required: true,
    }),
    search_value: Property.ShortText({
      displayName: 'Search Value',
      description: 'The value to match in the search column',
      required: true,
    }),
  },
  async run(context) {
    const tableName = sanitizeColumnName(context.propsValue.table);
    const searchColumn = sanitizeColumnName(context.propsValue.search_column);
    const sql = `DELETE FROM ${tableName} WHERE ${searchColumn} = ?;`;

    const client = libsqlConnect(context.auth);
    try {
      const result = await client.execute({
        sql,
        args: [context.propsValue.search_value],
      });
      return {
        rowsAffected: result.rowsAffected,
      };
    } finally {
      client.close();
    }
  },
});
