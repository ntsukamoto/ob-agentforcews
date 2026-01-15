/**
 * @description Apex controller for Agentforce Workshop LWC to fetch recent ideas.
 * Provides cacheable method to retrieve agentforcews__c records ordered by CreatedDate DESC.
 * Security:
 *  - with sharing to respect org sharing rules
 *  - WITH SECURITY_ENFORCED to enforce FLS and object permissions
 *  - Returns only required fields
 * Notes:
 *  - Designed for use with @wire in LWC
 */
public with sharing class AgentWorkshopController {
    /**
     * @description Returns a single agentforcews__c record by Id with fields required for business cards
     * @param recordId Id of the agentforcews__c record
     */
    @AuraEnabled(cacheable=true)
    public static agentforcews__c getAgentById(Id recordId) {
        if (recordId == null) {
            return null;
        }
        return [
            SELECT Id, Name, Target__c, Pain__c, AgentRole__c, BusinessProcess__c
            FROM agentforcews__c
            WHERE Id = :recordId
            LIMIT 1
        ];
    }

    /**
     * @description Returns latest agentforcews__c ideas ordered by CreatedDate DESC.
     * @return List<agentforcews__c> list of sObjects with required fields only
     */
    @AuraEnabled(cacheable=true)
    public static List<agentforcews__c> getAgents() {
        return [
            SELECT Id,
                   Name,
                   target__c,
                   pain__c,
                   agentrole__c,
                   BusinessProcess__c
            FROM agentforcews__c
            WITH SECURITY_ENFORCED
            ORDER BY CreatedDate DESC
            LIMIT 200
        ];
    }
}
