import { createAction } from '@activepieces/pieces-framework';
import { libsqlConnect, libsqlGetTableNames } from '../common';
import { libsqlAuth } from '../..';

export default createAction({
  auth: libsqlAuth,
  name: 'get_tables',
  displayName: 'Get Tables',
  description: 'Returns a list of tables in the database',
  props: {},
  async run(context) {
    const client = libsqlConnect(context.auth);
    try {
      const tables = await libsqlGetTableNames(client);
      return { tables };
    } finally {
      client.close();
    }
  },
});
