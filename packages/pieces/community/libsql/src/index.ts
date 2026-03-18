import {
  PieceAuth,
  Property,
  createPiece,
} from '@activepieces/pieces-framework';
import { PieceCategory } from '@activepieces/shared';
import actions from './lib/actions';

export const libsqlAuth = PieceAuth.CustomAuth({
  props: {
    url: Property.ShortText({
      displayName: 'Database URL',
      required: true,
      description:
        'Connection URL for your database.\n\n' +
        '- **Local file**: `file:./mydb.sqlite` or `file:/absolute/path/to/mydb.sqlite`\n' +
        '- **In-memory** (testing): `:memory:`\n' +
        '- **Remote (Turso)**: `libsql://your-database.turso.io` or `https://your-database.turso.io`',
    }),
    authToken: PieceAuth.SecretText({
      displayName: 'Auth Token',
      description:
        'Authentication token for remote databases (Turso). Leave empty for local SQLite files.',
      required: false,
    }),
  },
  required: true,
  validate: async ({ auth }) => {
    const { createClient } = await import('@libsql/client');
    const url = auth.url?.trim();
    if (!url) {
      return { valid: false, error: 'Database URL is required.' };
    }
    const client = createClient({
      url,
      authToken: auth.authToken?.trim() || undefined,
    });
    try {
      await client.execute('SELECT 1;');
      return { valid: true };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return { valid: false, error: `Connection failed: ${message}` };
    } finally {
      client.close();
    }
  },
});

export const libsql = createPiece({
  displayName: 'LibSQL / SQLite',
  description:
    'Connect to local SQLite databases or remote Turso (libSQL) cloud databases',
  minimumSupportedRelease: '0.36.1',
  logoUrl: 'https://cdn.activepieces.com/pieces/libsql.png',
  categories: [PieceCategory.DEVELOPER_TOOLS],
  authors: ['community'],
  auth: libsqlAuth,
  actions,
  triggers: [],
});
