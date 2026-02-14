/**
 * Edge Function用CORSヘッダー
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-notify-token',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
};

/**
 * JSONレスポンスを返す
 * @param {unknown} body - レスポンスボディ
 * @param {number} status - HTTPステータス
 * @returns {Response} JSONレスポンス
 */
export const createJsonResponse = (body: unknown, status = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
};

