function doGet(e) {
  // パラメータがない場合は従来のHTML表示
  if (!e.parameter || !e.parameter.action) {
    return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('落とし物管理システム')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  
  const action = e.parameter.action;
  const location = e.parameter.location;
  
  let result;
  switch (action) {
    case 'getItems':
      result = getLostItems(location);
      break;
    case 'getReturnedItems':
      result = getReturnedItems(location);
      break;
    case 'getLocations':
      result = { success: true, locations: getLocations() };
      break;
    default:
      result = { success: false, error: 'Unknown action' };
  }
  
  // CORSヘッダー付きでレスポンス
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  
  let result;
  switch (data.action) {
    case 'submit':
      result = submitLostItem(data);
      break;
    case 'markAsReturned':
      result = markAsReturned(data.tag, data.returnTime);
      break;
    default:
      result = { success: false, error: 'Unknown action' };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// 設定
const FOLDER_ID = '1vYFTR2YsP1ZmV6wn_hv5nuoMByh_rPhO'; // Driveフォルダ
const NORMAL_SHEET = '一般'; // 通常の落とし物シート
const URGENT_SHEET = '緊急'; // 緊急の落とし物シート
const OWNER_SHEET = '落とし主'; // 落とし主シート

// フォーム送信処理
function submitLostItem(formData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 緊急性に応じてシートを選択
    const sheetName = formData.isUrgent === 'あり' ? URGENT_SHEET : NORMAL_SHEET;
    const sheet = ss.getSheetByName(sheetName);
    
    // 画像をDriveに保存
    const folder = DriveApp.getFolderById(FOLDER_ID);
    // タグを先に生成してファイル名に使用する
    const tag = generateTag(sheet, formData.location, formData.isUrgent);

    // ファイル名を「lostitem_{識別タグ}.jpg」で作成
    const imageBlob = Utilities.newBlob(
      Utilities.base64Decode(formData.imageData.split(',')[1]),
      formData.imageType,
      'lostitem_' + tag + '.jpg'
    );
    const file = folder.createFile(imageBlob);

    // ファイルを「リンクを知っている全員」に共有設定
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // 直接表示用のURLを生成
    const imageUrl = 'https://drive.google.com/uc?export=view&id=' + file.getId();

    // 時間整形（HHMM → HH:MM）
    const timeFormatted = formData.time.substring(0, 2) + ':' + formData.time.substring(2, 4);

    // 日付取得
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}/${month}/${day}`;

    // スプレッドシートに追記
    // B列: =IMAGE()関数でスプレッドシート上に写真を表示（職員向け目視確認用）
    // H列: プレーンテキストURLでERPアプリがCSV経由で写真を取得（CSV出力時IMAGE関数は空文字になるため）
    sheet.appendRow([
      tag,
      `=IMAGE("${imageUrl}")`, // B列: スプレッドシート表示用（=IMAGE関数）
      formData.itemName,
      `${dateStr} ${timeFormatted}`,
      formData.location,
      formData.studentId || '',
      '', // G列: 返却日（空欄）
      imageUrl  // H列: ERP読み込み用プレーンテキストURL
    ]);

    return { success: true, tag: tag, sheet: sheetName };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// タグ生成関数
function generateTag(sheet, location, isUrgent) {
  const locationPrefix = {
    '西門前': 'N',
    'B館前': 'B',
    '人工芝グラウンド': 'J'
  };
  
  const prefix = locationPrefix[location] + (isUrgent === 'あり' ? '赤' : '');
  
  // 既存のタグから最大番号を取得
  const data = sheet.getDataRange().getValues();
  let maxNum = 0;
  
  for (let i = 1; i < data.length; i++) {
    const tag = data[i][0];
    if (tag && tag.startsWith(prefix + '-')) {
      const num = parseInt(tag.split('-')[1]);
      if (num > maxNum) maxNum = num;
    }
  }
  
  const newNum = String(maxNum + 1).padStart(3, '0');
  return `${prefix}-${newNum}`;
}

// 場所リスト取得
function getLocations() {
  return ['西門前', 'B館前', '人工芝グラウンド'];
}

// シートからアイテムを直接読み込む共通処理
function collectItemsFromSheet(sheet, isUrgent) {
  const items = [];
  const range = sheet.getDataRange();
  if (range.getNumRows() <= 1) return items;

  const data = range.getValues();
  const formulas = range.getFormulas();

  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue; // タグがない行はスキップ

    // IMAGE関数からファイルIDを抽出
    let imageUrl = '';
    const imageFormula = formulas[i][1];
    if (imageFormula && typeof imageFormula === 'string') {
      const match = imageFormula.match(/id=([^&"]+)/);
      if (match) {
        imageUrl = `https://lh3.googleusercontent.com/d/${match[1]}`;
      }
    }

    // 時間データを文字列化
    let timeString = '';
    if (data[i][3]) {
      if (data[i][3] instanceof Date) {
        const d = data[i][3];
        timeString = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      } else {
        timeString = data[i][3].toString();
      }
    }

    // 返却日を文字列化
    let returnDateString = '';
    if (data[i][6]) {
      if (data[i][6] instanceof Date) {
        const d = data[i][6];
        returnDateString = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      } else {
        returnDateString = data[i][6].toString();
      }
    }

    items.push({
      tag: data[i][0],
      imageUrl: imageUrl,
      itemName: data[i][2],
      time: timeString,
      location: data[i][4],
      studentId: data[i][5] || '',
      returnDate: returnDateString,
      isUrgent: isUrgent
    });
  }
  return items;
}

// 落とし物データ取得（シート直読み）
function getLostItems(location) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let items = [
      ...collectItemsFromSheet(ss.getSheetByName(NORMAL_SHEET), false),
      ...collectItemsFromSheet(ss.getSheetByName(URGENT_SHEET), true)
    ].filter(item => !item.returnDate);

    // 場所でフィルタリング
    if (location && location !== 'すべて') {
      items = items.filter(item => item.location === location);
    }

    return { success: true, items: items };
  } catch (error) {
    Logger.log('getLostItems エラー: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

// 返却処理
function markAsReturned(tag, returnTime) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const normalSheet = ss.getSheetByName(NORMAL_SHEET);
    const urgentSheet = ss.getSheetByName(URGENT_SHEET);
    
    // 両方のシートから該当タグを探す
    const sheets = [
      { sheet: normalSheet, name: NORMAL_SHEET },
      { sheet: urgentSheet, name: URGENT_SHEET }
    ];
    
    for (const sheetInfo of sheets) {
      const sheet = sheetInfo.sheet;
      const data = sheet.getDataRange().getValues();
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === tag) { // A列のタグが一致
          // 返却日時を生成（YYYY/MM/DD HH:MM形式）
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          const timeFormatted = returnTime.substring(0, 2) + ':' + returnTime.substring(2, 4);
          const returnDateTime = `${year}/${month}/${day} ${timeFormatted}`;
          
          // G列（7列目）に返却日時を記録
          sheet.getRange(i + 1, 7).setValue(returnDateTime);

          return { success: true, message: `${tag} を返却済みにしました` };
        }
      }
    }
    
    return { success: false, error: '該当するタグが見つかりませんでした' };
    
  } catch (error) {
    Logger.log('markAsReturned エラー: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

// 返却済み落とし物データ取得（シート直読み）
function getReturnedItems(location) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let items = [
      ...collectItemsFromSheet(ss.getSheetByName(NORMAL_SHEET), false),
      ...collectItemsFromSheet(ss.getSheetByName(URGENT_SHEET), true)
    ].filter(item => item.returnDate);

    // 場所でフィルタリング
    if (location && location !== 'すべて') {
      items = items.filter(item => item.location === location);
    }

    return { success: true, items: items };
  } catch (error) {
    Logger.log('getReturnedItems エラー: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

// 落とし主登録処理
function submitOwner(formData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(OWNER_SHEET);
    if (!sheet) return { success: false, error: '落とし主シートが見つかりません' };

    // 識別番号生成（最大値+1）
    const data = sheet.getDataRange().getValues();
    let maxId = 0;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && !isNaN(data[i][0])) {
        const id = parseInt(data[i][0]);
        if (id > maxId) maxId = id;
      }
    }
    const newId = maxId + 1;

    sheet.appendRow([
      newId,
      formData.lostItem,
      formData.location,
      formData.noticedTime,
      formData.contact,
      formData.studentId || '',
      formData.ownerName,
      '' // 対応日（空欄）
    ]);

    return { success: true, id: newId };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// 落とし主シートからデータ収集
function collectOwnersFromSheet(sheet) {
  if (!sheet) return [];
  const items = [];
  const range = sheet.getDataRange();
  if (range.getNumRows() <= 1) return items;

  const data = range.getValues();
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;

    let noticedTimeStr = '';
    if (data[i][3]) {
      if (data[i][3] instanceof Date) {
        const d = data[i][3];
        noticedTimeStr = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      } else {
        noticedTimeStr = data[i][3].toString();
      }
    }

    let resolvedDateStr = '';
    if (data[i][7]) {
      if (data[i][7] instanceof Date) {
        const d = data[i][7];
        resolvedDateStr = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      } else {
        resolvedDateStr = data[i][7].toString();
      }
    }

    items.push({
      id: data[i][0],
      lostItem: data[i][1],
      location: data[i][2],
      noticedTime: noticedTimeStr,
      contact: data[i][4],
      studentId: data[i][5] || '',
      ownerName: data[i][6],
      resolvedDate: resolvedDateStr
    });
  }
  return items;
}

// 落とし主一覧取得（未対応）
function getOwners() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const items = collectOwnersFromSheet(ss.getSheetByName(OWNER_SHEET))
      .filter(item => !item.resolvedDate);
    return { success: true, items: items };
  } catch (error) {
    Logger.log('getOwners エラー: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

// 落とし主一覧取得（対応済み）
function getResolvedOwners() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const items = collectOwnersFromSheet(ss.getSheetByName(OWNER_SHEET))
      .filter(item => item.resolvedDate);
    return { success: true, items: items };
  } catch (error) {
    Logger.log('getResolvedOwners エラー: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

// 落とし主対応済み登録
function markOwnerAsResolved(id, returnTime) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(OWNER_SHEET);
    if (!sheet) return { success: false, error: '落とし主シートが見つかりません' };

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == id) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const timeFormatted = returnTime.substring(0, 2) + ':' + returnTime.substring(2, 4);
        const resolvedDateTime = `${year}/${month}/${day} ${timeFormatted}`;

        // H列（8列目）に対応日時を記録
        sheet.getRange(i + 1, 8).setValue(resolvedDateTime);

        return { success: true, message: `受付番号 ${id} を対応済みにしました` };
      }
    }

    return { success: false, error: '該当する受付番号が見つかりませんでした' };
  } catch (error) {
    Logger.log('markOwnerAsResolved エラー: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}