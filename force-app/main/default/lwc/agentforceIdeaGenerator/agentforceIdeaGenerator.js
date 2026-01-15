import { LightningElement, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getAgents from '@salesforce/apex/AgentWorkshopController.getAgents';
import getAgentById from '@salesforce/apex/AgentWorkshopController.getAgentById';
import { refreshApex } from '@salesforce/apex';

export default class AgentforceIdeaGenerator extends LightningElement {
    agents;
    wiredAgentsResult;
    isModalOpen = false;
    selectedRecordId;

    modalStyles = 'display: none;';

    @wire(getAgents)
    wiredAgents(response) {
        this.wiredAgentsResult = response;
        const { data, error } = response;
        if (data) {
            // Normalize field names used in the template
            this.agents = (data || []).map((r) => ({
                id: r.Id,
                name: r.Name,
                target: r.target__c,
                pain: r.pain__c,
                agentRole: r.agentrole__c,
                businessProcess: r.BusinessProcess__c
            }));
        } else if (error) {
            // Basic error surface via toast
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'データ取得エラー',
                    message: this._normalizeError(error),
                    variant: 'error'
                })
            );
        }
    }

    openModal(event) {
        // Ensure we always read the dataset from the card wrapper element
        const recordId = event?.currentTarget?.dataset?.recordId;
        if (!recordId) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'レコード未特定',
                    message: '編集対象のレコードを特定できませんでした。もう一度お試しください。',
                    variant: 'error'
                })
            );
            return;
        }
        this.selectedRecordId = recordId;
        this.isModalOpen = true;
        this.modalStyles = '';
    }

    closeModal() {
        this.isModalOpen = false;
        this.modalStyles = 'display: none;';
        this.selectedRecordId = null;
    }

    async handleSuccess(event) {
        // 1) Show success toast
        this.dispatchEvent(
            new ShowToastEvent({
                title: '保存しました',
                message: 'アイデアが正常に保存されました。',
                variant: 'success'
            })
        );

        // 2) Reset input fields in the lightning-record-edit-form
        const form = this.template.querySelector('lightning-record-edit-form');
        if (form) {
            const inputs = form.querySelectorAll('lightning-input-field');
            inputs.forEach((input) => {
                if (typeof input.reset === 'function') {
                    input.reset();
                }
            });
        }

        // 3) Immediately fetch the created/updated record and merge to UI
        try {
            const newId = event?.detail?.id;
            if (newId) {
                const rec = await getAgentById({ recordId: newId });
                if (rec) {
                    const normalized = {
                        id: rec.Id,
                        name: rec.Name,
                        target: rec.Target__c,
                        pain: rec.Pain__c,
                        agentRole: rec.AgentRole__c,
                        businessProcess: rec.BusinessProcess__c
                    };
                    // merge: update if exists, otherwise add to head
                    let merged = false;
                    if (Array.isArray(this.agents)) {
                        this.agents = this.agents.map((a) => {
                            if (a.id === normalized.id) {
                                merged = true;
                                return normalized;
                            }
                            return a;
                        });
                        if (!merged) {
                            this.agents = [normalized, ...this.agents];
                        }
                    } else {
                        this.agents = [normalized];
                    }
                }
            }
        } catch (e) {
            // Non-blocking error; surface toast but continue to refresh wire below
            this.dispatchEvent(
                new ShowToastEvent({
                    title: '再取得エラー',
                    message: this._normalizeError(e),
                    variant: 'warning'
                })
            );
        }

        // 4) Refresh the wired list as secondary consistency mechanism
        if (this.wiredAgentsResult) {
            refreshApex(this.wiredAgentsResult);
        }
    }

    handleModalSuccess() {
        // 1) Show success toast
        this.dispatchEvent(
            new ShowToastEvent({
                title: '保存しました',
                message: '評価が正常に保存されました。',
                variant: 'success'
            })
        );

        // 2) Close modal
        this.closeModal();

        // 3) Refresh the wired list immediately to show updated data
        if (this.wiredAgentsResult) {
            refreshApex(this.wiredAgentsResult);
        }
    }

    handleError(event) {
        const msg = event?.detail?.message || '保存に失敗しました。入力内容をご確認ください。';
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'エラー',
                message: msg,
                variant: 'error'
            })
        );
    }

    _normalizeError(error) {
        // Utility to extract a readable error message
        if (!error) return '不明なエラーが発生しました';
        if (Array.isArray(error.body)) {
            return error.body.map((e) => e.message).join(', ');
        } else if (error.body && typeof error.body.message === 'string') {
            return error.body.message;
        }
        return typeof error.message === 'string' ? error.message : '不明なエラーが発生しました';
    }
}
