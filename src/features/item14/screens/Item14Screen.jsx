/**
 * 項目14画面
 * 会計対応画面
 */

import React from 'react';
import SupportDeskScreen from '../../support/components/SupportDeskScreen';
import { SCREEN_DESCRIPTION, SCREEN_NAME } from '../constants';
import { SUPPORT_DESK_ROLE_TYPES } from '../../../services/supabase/supportTicketService';

/**
 * 項目14画面コンポーネント
 * @param {Object} props - コンポーネントプロパティ
 * @param {Object} props.navigation - React Navigationのnavigationオブジェクト
 * @returns {JSX.Element} 項目14画面
 */
const Item14Screen = ({ navigation }) => {
  return (
    <SupportDeskScreen
      navigation={navigation}
      screenName={SCREEN_NAME}
      screenDescription={SCREEN_DESCRIPTION}
      roleType={SUPPORT_DESK_ROLE_TYPES.ACCOUNTING}
    />
  );
};

export default Item14Screen;

