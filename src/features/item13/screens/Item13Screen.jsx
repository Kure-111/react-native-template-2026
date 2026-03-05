/**
 * 項目13画面
 * 本部サポート画面
 */

import React from 'react';
import SupportDeskScreen from '../../support/components/SupportDeskScreen';
import { SCREEN_DESCRIPTION, SCREEN_NAME } from '../constants';
import { SUPPORT_DESK_ROLE_TYPES } from '../../../services/supabase/supportTicketService';

/**
 * 項目13画面コンポーネント
 * @param {Object} props - コンポーネントプロパティ
 * @param {Object} props.navigation - React Navigationのnavigationオブジェクト
 * @param {Object} props.route - React Navigationのrouteオブジェクト
 * @param {string} [props.route.params.initialTab] - 通知タップ時などに直接開くタブキー
 * @returns {JSX.Element} 項目13画面
 */
const Item13Screen = ({ navigation, route }) => {
  /** 通知タップや外部からのdeeplink経由で直接開くタブ */
  const initialTab = route?.params?.initialTab || null;

  return (
    <SupportDeskScreen
      navigation={navigation}
      screenName={SCREEN_NAME}
      screenDescription={SCREEN_DESCRIPTION}
      roleType={SUPPORT_DESK_ROLE_TYPES.HQ}
      initialTab={initialTab}
    />
  );
};

export default Item13Screen;

