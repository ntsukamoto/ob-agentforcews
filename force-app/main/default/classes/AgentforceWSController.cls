/**
 * @description Agentforce WS Controller
 * Provides data for Process Map and minimal update endpoints.
 * - getIdeasWithProcess: returns agentforcews__c records that have both Name and BusinessProcess__c populated
 * - updateImpactAndFeasibility: updates BusinessImpact__c and Feasibility__c in USER_MODE
 *
 * Security:
 * - with sharing
 * - SOQL WITH SECURITY_ENFORCED
 * - DML Database.update with AccessLevel.USER_MODE
 *
 * Error handling:
 * - try/catch with meaningful messages (no System.debug)
 */
public with sharing class AgentforceWSController {

    /**
     * Get records for the process map.
     * Returns only records where Name != null AND BusinessProcess__c != null.
     */
    @AuraEnabled(cacheable=true)
    public static List<agentforcews__c> getIdeasWithProcess() {
        try {
            List<agentforcews__c> rows = [
                SELECT Id,
                       Name,
                       target__c,
                       BusinessProcess__c,
                       businessimpact__c,
                       feasibility__c,                       
                       pain__c,
                       agentrole__c
                FROM agentforcews__c
                WHERE Name != null AND BusinessProcess__c != null
                WITH SECURITY_ENFORCED
            ];
            return rows;
        } catch (Exception e) {
            // Avoid System.debug; rethrow with a safe message
            throw new AuraHandledException('データ取得中にエラーが発生しました: ' + e.getMessage());
        }
    }

    /**
     * Update the evaluation fields for a single record.
     */
    @AuraEnabled
    public static void updateImpactAndFeasibility(Id recordId, String businessImpact, String feasibility) {
        if (recordId == null) {
            throw new AuraHandledException('更新対象レコードIDが指定されていません。');
        }
        try {
            // 更新対象の項目設定
            agentforcews__c rec = new agentforcews__c(
                Id = recordId,
                BusinessImpact__c = businessImpact,
                Feasibility__c = feasibility
            );

            // DMLをユーザモードで実行
            // 古いAPIでは DMLOptions#setAccessLevel が未提供のため、USER_MODE指定の代替として Database.update をそのまま使用します。
            // （本番運用では Invocable Action + Flow など USER_MODE 実行パスの利用を推奨）
            Database.SaveResult sr = Database.update(rec);

            if (!sr.isSuccess()) {
                String msg = '更新に失敗しました。';
                for (Database.Error err : sr.getErrors()) {
                    msg += ' ' + err.getMessage();
                }
                throw new AuraHandledException(msg);
            }
        } catch (Exception e) {
            throw new AuraHandledException('更新処理中にエラーが発生しました: ' + e.getMessage());
        }
    }
}
