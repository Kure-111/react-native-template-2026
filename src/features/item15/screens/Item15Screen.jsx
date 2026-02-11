/**
 * 項目15画面
 * 物品対応画面
 */

import React from 'react';
import SupportDeskScreen from '../../support/components/SupportDeskScreen';
import { SCREEN_DESCRIPTION, SCREEN_NAME } from '../constants';
import { SUPPORT_DESK_ROLE_TYPES } from '../../../services/supabase/supportTicketService';

/**
 * 項目15画面コンポーネント
 * @param {Object} props - コンポーネントプロパティ
 * @param {Object} props.navigation - React Navigationのnavigationオブジェクト
 * @returns {JSX.Element} 項目15画面
 */
const Item15Screen = ({ navigation }) => {
  return (
    <SupportDeskScreen
      navigation={navigation}
      screenName={SCREEN_NAME}
      screenDescription={SCREEN_DESCRIPTION}
      roleType={SUPPORT_DESK_ROLE_TYPES.PROPERTY}
    />
  );
};

export default Item15Screen;

