/**
 * @description Exposes agentforcews__c records (with both picklists set) as plottable points for a 1-7 matrix.
 * @author Agentforce
 * @group Agentforce Prioritization
 * @date 2025-12-11
 *
 * Security:
 * - with sharing to respect org sharing rules
 * - SOQL uses WITH SECURITY_ENFORCED
 * - Returns only fields required by the client
 */
public with sharing class AgentforcePrioritizationController {
    /**
     * Lightweight DTO for plotting.
     */
    public class PlotPoint {
        @AuraEnabled public Id id { get; set; }
        @AuraEnabled public String name { get; set; }
        @AuraEnabled public Integer impact { get; set; }      // businessimpact__c
        @AuraEnabled public Integer feasibility { get; set; }  // feasibility__c

        public PlotPoint(Id id, String name, Integer impact, Integer feasibility) {
            this.id = id;
            this.name = name;
            this.impact = impact;
            this.feasibility = feasibility;
        }
    }

    /**
     * Get eligible records and convert picklist "1"-"7" to integers.
     * Returns empty list on any handled error.
     */
    @AuraEnabled(cacheable=true)
    public static List<PlotPoint> getPlottableRecords() {
        List<PlotPoint> results = new List<PlotPoint>();
        try {
            // Query in USER MODE and enforce FLS/CRUD via WITH SECURITY_ENFORCED
            // Note: picklists are stored as Strings; we coerce to Integer safely below.
            List<agentforcews__c> rows = [
                SELECT Id, Name, businessimpact__c, feasibility__c
                FROM agentforcews__c
                WHERE businessimpact__c != null
                  AND feasibility__c != null
                WITH SECURITY_ENFORCED
            ];

            for (agentforcews__c r : rows) {
                Integer impact = parsePicklistToInt(r.businessimpact__c);
                Integer feas = parsePicklistToInt(r.feasibility__c);
                // Accept only values within 1..7
                if (impact != null && feas != null && impact >= 1 && impact <= 7 && feas >= 1 && feas <= 7) {
                    results.add(new PlotPoint(r.Id, r.Name, impact, feas));
                }
            }
        } catch (Exception e) {
            // Return empty results on failure (cacheable method). Consider platform events/logging for ops.
            // Intentionally no System.debug in production per rules.
        }
        return results;
    }

    /**
     * Convert picklist string ("1".."7") to Integer. Returns null if invalid.
     */
    private static Integer parsePicklistToInt(String val) {
        if (String.isBlank(val)) {
            return null;
        }
        // Trim and coerce
        String s = val.trim();
        // Quick check: single digit 1..7
        if (s.length() == 1 && s.substring(0, 1) >= '1' && s.substring(0, 1) <= '7') {
            return Integer.valueOf(s);
        }
        // Fallback parse
        try {
            return Integer.valueOf(s);
        } catch (Exception e) {
            return null;
        }
    }
}