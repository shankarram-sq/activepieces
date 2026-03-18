import { createPiece } from '@activepieces/pieces-framework';
import { PieceCategory } from '@activepieces/shared';
import actions from './lib/actions';
import { sqliteAuth } from './auth';

export const sqlite = createPiece({
  displayName: 'SQLite',
  description: 'The most used database engine in the world',

  minimumSupportedRelease: '0.30.0',
  logoUrl: 'https://cdn.activepieces.com/pieces/sqlite.png',
  categories: [PieceCategory.DEVELOPER_TOOLS],
  authors: [],
  auth: sqliteAuth,
  actions,
  triggers: [],
});
