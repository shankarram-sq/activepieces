import { createAction } from '@activepieces/pieces-framework';
import { sqliteConnect, sqliteGetTableNames } from '../common';
import { sqliteAuth } from '../../auth';

export default createAction({
  auth: sqliteAuth,
  name: 'get_tables',
  displayName: 'Get Tables',
  description: 'Returns a list of tables in the database',
  props: {},
  async run(context) {
    const conn = await sqliteConnect(context.auth);
    try {
      const tables = await sqliteGetTableNames(conn);
      return { tables };
    } finally {
      conn.close();
    }
  },
});
