import {
  PieceAuth,
  Property,
} from '@activepieces/pieces-framework';

export const sqliteAuth = PieceAuth.CustomAuth({
  props: {
    url: Property.ShortText({
      displayName: 'URL',
      required: true,
      description: 'The URL or local file path to the SQLite database (e.g. file:local.db or libsql://db-name.turso.io)',
    }),
    authToken: PieceAuth.SecretText({
      displayName: 'Auth Token',
      description: 'The authentication token (required for remote databases like Turso)',
      required: false,
    }),
  },
  required: true,
});
