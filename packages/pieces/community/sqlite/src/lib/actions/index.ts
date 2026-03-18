import executeQuery from './execute-query';
import getTables from './get-tables';
import insertRow from './insert-row';
import updateRow from './update-row';
import deleteRow from './delete-row';
import findRows from './find-rows';

export default [
  findRows,
  insertRow,
  updateRow,
  deleteRow,
  getTables,
  executeQuery,
];
