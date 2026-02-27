/**
 * シフトリマインド通知スクリプト（Google Apps Script）
 *
 * 使い方:
 * 1. このファイルの内容をGoogle Apps Scriptのエディタにコピー
 * 2. スクリプトプロパティに以下を設定:
 *    - SUPABASE_URL: SupabaseプロジェクトのURL
 *    - SUPABASE_ANON_KEY: Supabaseのanon key
 *    - INTERNAL_NOTIFY_TOKEN: dispatch-notification Edge FunctionのInternal Token
 *    - SPREADSHEET_ID: シフト表スプレッドシートのID
 * 3. sendShiftReminders関数に時間ベーストリガーを設定（5分間隔推奨）
 */

/**
 * スクリプトプロパティを取得するヘルパー
 * @param {string} key - プロパティキー
 * @returns {string} プロパティ値
 */
function getProperty(key) {
  var value = PropertiesService.getScriptProperties().getProperty(key);
  if (!value) {
    throw new Error(key + ' がスクリプトプロパティに設定されていません');
  }
  return value;
}

/**
 * 現在の日付からシート名を生成
 * @returns {string} シート名（例: "2026年11月3日"）
 */
function getSheetName() {
  var now = new Date();
  var year = now.getFullYear();
  var month = now.getMonth() + 1;
  var day = now.getDate();
  return year + '年' + month + '月' + day + '日';
}

/**
 * 時間文字列を分に変換
 * @param {string} timeStr - 時間文字列（例: "10:00"）
 * @returns {number} 分数（例: 600）
 */
function timeToMinutes(timeStr) {
  var parts = timeStr.trim().split(':');
  if (parts.length !== 2) {
    return -1;
  }
  var hours = parseInt(parts[0], 10);
  var minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) {
    return -1;
  }
  return hours * 60 + minutes;
}

/**
 * 現在時刻を分に変換
 * @returns {number} 現在時刻の分数
 */
function getCurrentMinutes() {
  var now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * 送信済みキーを生成（重複防止用）
 * @param {string} memberName - メンバー名
 * @param {string} timeSlot - 時間帯
 * @param {string} date - 日付
 * @returns {string} 送信済みキー
 */
function getSentKey(memberName, timeSlot, date) {
  return date + '_' + memberName + '_' + timeSlot;
}

/**
 * 送信済みフラグを確認
 * @param {string} key - 送信済みキー
 * @returns {boolean} 送信済みの場合true
 */
function isSent(key) {
  var sent = PropertiesService.getScriptProperties().getProperty('SENT_' + key);
  return sent === 'true';
}

/**
 * 送信済みフラグを記録
 * @param {string} key - 送信済みキー
 */
function markAsSent(key) {
  PropertiesService.getScriptProperties().setProperty('SENT_' + key, 'true');
}

/**
 * 日付変更時に送信済みフラグをクリア
 */
function clearSentFlags() {
  var props = PropertiesService.getScriptProperties();
  var allProps = props.getProperties();
  var keysToDelete = [];

  for (var key in allProps) {
    if (key.indexOf('SENT_') === 0) {
      keysToDelete.push(key);
    }
  }

  for (var i = 0; i < keysToDelete.length; i++) {
    props.deleteProperty(keysToDelete[i]);
  }
}

/**
 * Supabase APIでユーザー名からuser_idを取得
 * @param {string} memberName - メンバー名
 * @returns {string|null} user_id（見つからない場合null）
 */
function getUserIdByName(memberName) {
  var supabaseUrl = getProperty('SUPABASE_URL');
  var supabaseKey = getProperty('SUPABASE_ANON_KEY');

  var url = supabaseUrl + '/rest/v1/user_profiles?name=eq.' + encodeURIComponent(memberName) + '&select=user_id';

  var response = UrlFetchApp.fetch(url, {
    method: 'GET',
    headers: {
      'apikey': supabaseKey,
      'Authorization': 'Bearer ' + supabaseKey,
      'Content-Type': 'application/json',
    },
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() !== 200) {
    Logger.log('ユーザー取得エラー: ' + response.getContentText());
    return null;
  }

  var data = JSON.parse(response.getContentText());
  if (data.length === 0) {
    return null;
  }

  return data[0].user_id;
}

/**
 * dispatch-notification Edge Functionを呼び出して通知を送信
 * @param {string} userId - 送信先ユーザーID
 * @param {string} title - 通知タイトル
 * @param {string} body - 通知本文
 * @param {Object} metadata - メタデータ
 */
function sendNotification(userId, title, body, metadata) {
  var supabaseUrl = getProperty('SUPABASE_URL');
  var internalToken = getProperty('INTERNAL_NOTIFY_TOKEN');

  var url = supabaseUrl + '/functions/v1/dispatch-notification';

  var payload = {
    targetType: 'user',
    userId: userId,
    title: title,
    body: body,
    metadata: metadata,
  };

  var response = UrlFetchApp.fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Notify-Token': internalToken,
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() !== 200) {
    Logger.log('通知送信エラー (' + userId + '): ' + response.getContentText());
  } else {
    Logger.log('通知送信成功: ' + userId);
  }
}

/**
 * スプレッドシートからシフトデータを解析
 * @param {Sheet} sheet - シートオブジェクト
 * @returns {Array<Object>} メンバーとシフトのリスト
 */
function parseShiftData(sheet) {
  var data = sheet.getDataRange().getValues();
  var results = [];
  var currentOrgName = null;
  var headerRow = null;

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var firstCell = String(row[0]).trim();

    // 団体名行の判定（括弧付き）
    if (firstCell.indexOf('(') >= 0 || firstCell.indexOf('（') >= 0) {
      // 団体名を抽出
      var halfIdx = firstCell.indexOf('(');
      var fullIdx = firstCell.indexOf('（');
      var endIdx;
      if (halfIdx >= 0 && fullIdx >= 0) {
        endIdx = Math.min(halfIdx, fullIdx);
      } else if (halfIdx >= 0) {
        endIdx = halfIdx;
      } else {
        endIdx = fullIdx;
      }
      currentOrgName = firstCell.substring(0, endIdx).trim();
      headerRow = null;
      continue;
    }

    // ヘッダー行の判定
    if (firstCell === '名前') {
      headerRow = [];
      for (var h = 1; h < row.length; h++) {
        headerRow.push(String(row[h]).trim());
      }
      continue;
    }

    // データ行（名前がある行）
    if (firstCell !== '' && headerRow && currentOrgName) {
      var memberName = firstCell;
      for (var c = 0; c < headerRow.length; c++) {
        var cellValue = String(row[c + 1] || '').trim();
        if (cellValue !== '' && headerRow[c] !== '') {
          results.push({
            memberName: memberName,
            timeSlot: headerRow[c],
            areaName: cellValue,
            organizationName: currentOrgName,
          });
        }
      }
    }
  }

  return results;
}

/**
 * 分数を時間文字列に変換
 * @param {number} minutes - 分数（例: 600）
 * @returns {string} 時間文字列（例: "10:00"）
 */
function minutesToTimeStr(minutes) {
  var h = Math.floor(minutes / 60);
  var m = minutes % 60;
  var hStr = h < 10 ? '0' + h : String(h);
  var mStr = m < 10 ? '0' + m : String(m);
  return hStr + ':' + mStr;
}

/**
 * 連続する同一エリアのシフトをまとめた時間帯文字列を返す
 * 例: 10:00-10:30, 10:30-11:00 が同一エリアなら "10:00〜11:00"
 * @param {Array<Object>} shifts - 全シフト一覧
 * @param {Object} targetShift - 対象シフト
 * @returns {string} まとめた時間帯（例: "10:00〜11:00"）
 */
function getMergedTimeRange(shifts, targetShift) {
  var initParts = targetShift.timeSlot.split(/[-〜~]/);
  if (initParts.length < 2) {
    return targetShift.timeSlot;
  }

  /** 現在のマージ開始分 */
  var mergedStart = timeToMinutes(initParts[0]);
  /** 現在のマージ終了分 */
  var mergedEnd = timeToMinutes(initParts[1]);

  if (mergedStart < 0 || mergedEnd < 0) {
    return targetShift.timeSlot;
  }

  // 隣接スロットがなくなるまで前後に拡張する
  var changed = true;
  while (changed) {
    changed = false;
    for (var i = 0; i < shifts.length; i++) {
      var s = shifts[i];
      // 同一メンバー・同一エリアのみ対象
      if (s.memberName !== targetShift.memberName || s.areaName !== targetShift.areaName) {
        continue;
      }
      var sParts = s.timeSlot.split(/[-〜~]/);
      if (sParts.length < 2) {
        continue;
      }
      var sStart = timeToMinutes(sParts[0]);
      var sEnd = timeToMinutes(sParts[1]);
      if (sStart < 0 || sEnd < 0) {
        continue;
      }
      // このスロットの終わりが現在の開始と一致 → 前に拡張
      if (sEnd === mergedStart) {
        mergedStart = sStart;
        changed = true;
      }
      // このスロットの開始が現在の終わりと一致 → 後ろに拡張
      if (sStart === mergedEnd) {
        mergedEnd = sEnd;
        changed = true;
      }
    }
  }

  return minutesToTimeStr(mergedStart) + '〜' + minutesToTimeStr(mergedEnd);
}

/**
 * メイン関数: シフトリマインド通知を送信
 * 時間ベーストリガーで5分間隔で実行する
 */
function sendShiftReminders() {
  try {
    var spreadsheetId = getProperty('SPREADSHEET_ID');
    var sheetName = getSheetName();

    // スプレッドシートを開く
    var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    var sheet = spreadsheet.getSheetByName(sheetName);

    if (!sheet) {
      Logger.log('シート "' + sheetName + '" が見つかりません');
      return;
    }

    // シフトデータを解析
    var shifts = parseShiftData(sheet);
    Logger.log('シフト件数: ' + shifts.length);

    // 現在時刻 + 20分 = リマインド対象時刻
    var currentMinutes = getCurrentMinutes();
    /** リマインド対象の時刻（20分後） */
    var reminderTargetMinutes = currentMinutes + 20;

    /** 日付文字列（重複防止用） */
    var today = new Date();
    var dateStr = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();

    /** 送信カウンター */
    var sentCount = 0;

    for (var i = 0; i < shifts.length; i++) {
      var shift = shifts[i];

      // 時間帯の開始時刻を取得（例: "10:00-10:30" → "10:00"）
      var timeParts = shift.timeSlot.split(/[-〜~]/);
      if (timeParts.length < 2) {
        continue;
      }

      var shiftStartMinutes = timeToMinutes(timeParts[0]);
      if (shiftStartMinutes < 0) {
        continue;
      }

      // リマインド対象時刻の範囲チェック（±5分の誤差を許容）
      if (Math.abs(shiftStartMinutes - reminderTargetMinutes) > 5) {
        continue;
      }

      // 送信済みチェック
      var sentKey = getSentKey(shift.memberName, shift.timeSlot, dateStr);
      if (isSent(sentKey)) {
        continue;
      }

      // 連続同一エリアチェック:
      // 現在進行中のシフトと20分後のシフトが同じエリアなら通知不要（既にその場所にいる）
      var currentAreaForMember = null;
      for (var j = 0; j < shifts.length; j++) {
        var otherShift = shifts[j];
        if (otherShift.memberName !== shift.memberName) {
          continue;
        }
        var otherTimeParts = otherShift.timeSlot.split(/[-〜~]/);
        if (otherTimeParts.length < 2) {
          continue;
        }
        var otherStartMinutes = timeToMinutes(otherTimeParts[0]);
        var otherEndMinutes = timeToMinutes(otherTimeParts[1]);
        if (otherStartMinutes < 0 || otherEndMinutes < 0) {
          continue;
        }
        // 現在時刻がこのシフトの時間帯に含まれるか判定
        if (currentMinutes >= otherStartMinutes && currentMinutes < otherEndMinutes) {
          currentAreaForMember = otherShift.areaName;
          break;
        }
      }

      // 現在のシフトと次のシフトが同一エリアならスキップ（送信済みとして記録し再チェック防止）
      if (currentAreaForMember !== null && currentAreaForMember === shift.areaName) {
        Logger.log('連続同一エリアのためスキップ: ' + shift.memberName + ' ' + shift.timeSlot + ' (' + shift.areaName + ')');
        markAsSent(sentKey);
        continue;
      }

      // ユーザーIDを取得
      var userId = getUserIdByName(shift.memberName);
      if (!userId) {
        Logger.log('ユーザーが見つかりません: ' + shift.memberName);
        continue;
      }

      // 通知を送信（連続同一エリアのスロットをまとめた時間帯で表示）
      var mergedTimeRange = getMergedTimeRange(shifts, shift);
      var notificationBody = '20分後にシフトが始まります。' + mergedTimeRange + ' - ' + shift.areaName;
      var metadata = {
        type: 'shift_reminder',
        date: dateStr,
        time_slot: shift.timeSlot,
        area_name: shift.areaName,
      };

      sendNotification(userId, '⏰ シフトリマインド', notificationBody, metadata);

      // 送信済みフラグを記録
      markAsSent(sentKey);
      sentCount++;
    }

    Logger.log('リマインド通知送信完了: ' + sentCount + '件');
  } catch (error) {
    Logger.log('エラー: ' + error.message);
  }
}

/**
 * 日次クリーンアップ関数
 * 毎日0時に実行し、前日の送信済みフラグをクリアする
 * 日次トリガーで設定する
 */
function dailyCleanup() {
  clearSentFlags();
  Logger.log('送信済みフラグをクリアしました');
}

/**
 * トリガーをセットアップする
 * GASエディタからこの関数を一度だけ実行してトリガーを登録する
 * 既存のトリガーはすべて削除してから再作成する
 */
function setupTrigger() {
  // 既存のトリガーをすべて削除
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }

  // sendShiftReminders を5分間隔で実行
  ScriptApp.newTrigger('sendShiftReminders')
    .timeBased()
    .everyMinutes(5)
    .create();

  // dailyCleanup を毎日0〜1時に実行
  ScriptApp.newTrigger('dailyCleanup')
    .timeBased()
    .everyDays(1)
    .atHour(0)
    .create();

  Logger.log('トリガーを設定しました: sendShiftReminders（5分間隔）, dailyCleanup（毎日0時）');
}

/**
 * リマインド関連のトリガーをすべて削除する
 */
function removeTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  var targetFunctions = ['sendShiftReminders', 'dailyCleanup'];
  var count = 0;

  for (var i = 0; i < triggers.length; i++) {
    if (targetFunctions.indexOf(triggers[i].getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(triggers[i]);
      count++;
    }
  }

  if (count > 0) {
    SpreadsheetApp.getUi().alert('リマインド通知を無効にしました。\n（削除したトリガー: ' + count + '件）');
  } else {
    SpreadsheetApp.getUi().alert('有効なリマインド通知のトリガーは見つかりませんでした。');
  }

  Logger.log('リマインドトリガーを' + count + '件削除しました');
}
