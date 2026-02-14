// 通知サービス（将来的にERP通知システムと連携）
// 現在は未実装

export const notificationService = {
  // 全員に通知送信（現在は未実装）
  sendToAll: async (notification) => {
    // 将来的にERPの通知APIを呼び出す
    console.log('通知送信（未実装）:', notification);
    
    // return await fetch('/api/erp/notifications/send-all', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(notification),
    // });
  },
  
  // ERP画面切替（現在は未実装）
  switchToEvacuationScreen: async (disasterType) => {
    // 将来的にERPのAPIを呼び出して全員の画面を切り替える
    console.log('画面切替（未実装）:', disasterType);
    
    // return await fetch('/api/erp/emergency/switch-screen', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ disasterType }),
    // });
  },
};
