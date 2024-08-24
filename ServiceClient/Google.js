const { google } = require('googleapis');
const serviceAccountKeyFile = "./credentials.json";
const config  = require('./../config.json');
const headerIndex = 16;
const columnIndexDict = {
  no: [1, 3],
  nickname: [3, 8],
  gender: [8, 11],
  birth: [11, 15],
  position: [15, 21],
  entrydate: [21, 26],
};

async function GetGoogleSheetClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: serviceAccountKeyFile,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const authClient = await auth.getClient();
  return google.sheets({
    version: 'v4',
    auth: authClient,
  });
}

async function GetMemberIndexs(googleSheetClient) {
  const res = await googleSheetClient.spreadsheets.values.get({
    spreadsheetId: config.sheetId,
    range: `${config.tabName}!${'B17:B'}`,
  });

  return res.data.values;
}

async function Append(googleSheetClient, columnType, index, data)
{
  var indexArr = columnIndexDict[columnType];
  var startRowIndex = headerIndex + index;
  var res = await googleSheetClient.spreadsheets.batchUpdate({
    spreadsheetId: config.sheetId,
    resource: {
      requests: [{
          updateCells: {
            range: {
              sheetId: 0,
              startRowIndex: startRowIndex,
              endRowIndex: startRowIndex + 1,
              startColumnIndex: indexArr[0],
              endColumnIndex: indexArr[0] + 1,
            },
            rows: [{
                values:[
                  { userEnteredValue: { stringValue: data } },
                ],
              }],
            fields: 'userEnteredValue',
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: startRowIndex,
              endRowIndex: startRowIndex + 1,
              startColumnIndex: indexArr[0],
              endColumnIndex: indexArr[1],
            },
            mergeType: 'MERGE_ALL',
          },
        },
        {
          repeatCell: {
            range: {
              sheetId: 0,
              startRowIndex: startRowIndex,
              endRowIndex: startRowIndex + 1,
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
              },
            },
            fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment)',
          },
        },
      ],
    },
  });
}

module.exports = {GetGoogleSheetClient, GetMemberIndexs, Append};
