/**
 * 権限管理サービス
 * ユーザーの役職に基づいたアクセス権限をチェックします
 */

/**
 * ユーザーが特定の画面にアクセス可能かをチェック
 * @param {Array} userRoles - ユーザーの役職一覧（rolesオブジェクトの配列）
 * @param {String} screenName - 画面名（例: 'item1'）
 * @returns {Boolean} アクセス可能な場合true
 */
export const canAccessScreen = (userRoles, screenName) => {
  // 役職が1つもない場合はアクセス不可
  if (!userRoles || userRoles.length === 0) {
    return false;
  }

  // いずれかの役職でアクセス可能な場合はtrue
  return userRoles.some((role) => {
    // permissionsがない、またはscreensがない場合はfalse
    if (!role.permissions || !role.permissions.screens) {
      return false;
    }

    // screensに該当の画面名が含まれているかチェック
    return role.permissions.screens.includes(screenName);
  });
};

/**
 * ユーザーが特定の画面で特定の機能を使用可能かをチェック
 * @param {Array} userRoles - ユーザーの役職一覧
 * @param {String} screenName - 画面名（例: 'item1'）
 * @param {String} featureName - 機能名（例: 'edit', 'delete'）
 * @returns {Boolean} 使用可能な場合true
 */
export const canUseFeature = (userRoles, screenName, featureName) => {
  // 役職が1つもない場合は使用不可
  if (!userRoles || userRoles.length === 0) {
    return false;
  }

  // いずれかの役職で使用可能な場合はtrue
  return userRoles.some((role) => {
    // permissionsがない、またはfeaturesがない場合はfalse
    if (!role.permissions || !role.permissions.features) {
      return false;
    }

    // 該当画面のfeatures配列を取得
    const screenFeatures = role.permissions.features[screenName];

    // 該当画面のfeaturesがない場合はfalse
    if (!screenFeatures || !Array.isArray(screenFeatures)) {
      return false;
    }

    // 機能名が含まれているかチェック
    return screenFeatures.includes(featureName);
  });
};

/**
 * ユーザーがアクセス可能な画面一覧を取得
 * @param {Array} userRoles - ユーザーの役職一覧
 * @returns {Array} アクセス可能な画面名の配列
 */
export const getAccessibleScreens = (userRoles) => {
  // 役職が1つもない場合は空配列
  if (!userRoles || userRoles.length === 0) {
    return [];
  }

  // 全ての役職からアクセス可能な画面を収集
  const screenSet = new Set();

  userRoles.forEach((role) => {
    if (role.permissions && role.permissions.screens) {
      role.permissions.screens.forEach((screen) => {
        screenSet.add(screen);
      });
    }
  });

  // Setを配列に変換して返す
  return Array.from(screenSet);
};

/**
 * ユーザーが管理者かどうかをチェック
 * @param {Array} userRoles - ユーザーの役職一覧
 * @returns {Boolean} 管理者の場合true
 */
export const isAdmin = (userRoles) => {
  // 役職が1つもない場合は管理者ではない
  if (!userRoles || userRoles.length === 0) {
    return false;
  }

  // 「管理者」という名前の役職を持っているかチェック
  return userRoles.some((role) => role.name === '管理者');
};

/**
 * ユーザーが特定の役職を持っているかをチェック
 * @param {Array} userRoles - ユーザーの役職一覧
 * @param {String} roleName - 役職名（例: '事務部', '実長'）
 * @returns {Boolean} 該当の役職を持っている場合true
 */
export const hasRole = (userRoles, roleName) => {
  // 役職が1つもない場合は持っていない
  if (!userRoles || userRoles.length === 0) {
    return false;
  }

  // 該当の役職名を持っているかチェック
  return userRoles.some((role) => role.name === roleName);
};
