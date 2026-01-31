/**
 * 認証機能の定数
 * パスワード変更に関するエラーメッセージやバリデーション設定を定義
 */

/**
 * パスワードの最小文字数
 */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * パスワード変更に関するエラーメッセージ
 */
export const PASSWORD_ERROR_MESSAGES = {
  // 入力バリデーションエラー
  CURRENT_PASSWORD_REQUIRED: '現在のパスワードを入力してください',
  NEW_PASSWORD_REQUIRED: '新しいパスワードを入力してください',
  NEW_PASSWORD_TOO_SHORT: `パスワードは${MIN_PASSWORD_LENGTH}文字以上で設定してください`,
  CONFIRM_PASSWORD_REQUIRED: '確認用パスワードを入力してください',
  PASSWORD_MISMATCH: 'パスワードが一致しません',
  SAME_AS_CURRENT: '現在のパスワードと異なるパスワードを設定してください',

  // サーバーエラー
  CURRENT_PASSWORD_INCORRECT: '現在のパスワードが正しくありません',
  UPDATE_FAILED: 'パスワードの更新に失敗しました。もう一度お試しください。',
  NETWORK_ERROR: 'ネットワークエラーが発生しました。接続を確認してください。',
};

/**
 * パスワード変更推奨モーダルのテキスト
 */
export const PASSWORD_MODAL_TEXT = {
  TITLE: 'パスワード変更のお願い',
  DESCRIPTION:
    'セキュリティのため、初回ログイン時にパスワードを変更することを推奨します。\n\n仮パスワードから、ご自身で設定したパスワードに変更してください。',
  CHANGE_NOW_BUTTON: '今すぐ変更',
  CHANGE_LATER_BUTTON: '後で変更',
};

/**
 * パスワード変更成功モーダルのテキスト
 */
export const PASSWORD_SUCCESS_TEXT = {
  TITLE: 'パスワードを変更しました',
  DESCRIPTION:
    'パスワードが正常に変更されました。\n次回ログインから新しいパスワードを使用してください。',
  OK_BUTTON: 'OK',
};

/**
 * パスワード変更画面のテキスト
 */
export const PASSWORD_CHANGE_SCREEN_TEXT = {
  TITLE: 'パスワード変更',
  CURRENT_PASSWORD_LABEL: '現在のパスワード',
  CURRENT_PASSWORD_PLACEHOLDER: '現在のパスワードを入力',
  NEW_PASSWORD_LABEL: `新しいパスワード（${MIN_PASSWORD_LENGTH}文字以上）`,
  NEW_PASSWORD_PLACEHOLDER: `新しいパスワードを入力（${MIN_PASSWORD_LENGTH}文字以上）`,
  CONFIRM_PASSWORD_LABEL: '新しいパスワード（確認用）',
  CONFIRM_PASSWORD_PLACEHOLDER: 'もう一度入力してください',
  SUBMIT_BUTTON: 'パスワードを変更',
  CANCEL_BUTTON: 'キャンセル',
};
