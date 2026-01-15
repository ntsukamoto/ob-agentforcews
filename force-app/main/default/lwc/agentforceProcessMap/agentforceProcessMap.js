import { LightningElement, wire, track } from 'lwc';
import getIdeasWithProcess from '@salesforce/apex/AgentforceWSController.getIdeasWithProcess';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';

const STAGES = [
    '01.情報登録',
    '02.受注検討',
    '03.受注前原価検討',
    '04.受注決済',
    '05.受注活動完了',
    '06.受注後予算検討'
];

export default class AgentforceProcessMap extends LightningElement {
    stages = STAGES;
    @track columns = {};
    wiredResult;

    isModalOpen = false;
    selectedRecordId;

    // Derived arrays for template iteration because LWC templates can't use bracket or call expressions
    get colStage01() { return this.columns['01.情報登録'] || []; }
    get colStage02() { return this.columns['02.受注検討'] || []; }
    get colStage03() { return this.columns['03.受注前原価検討'] || []; }
    get colStage04() { return this.columns['04.受注決済'] || []; }
    get colStage05() { return this.columns['05.受注活動完了'] || []; }
    get colStage06() { return this.columns['06.受注後予算検討'] || []; }

    connectedCallback() {
        // Initialize columns map
        this.columns = STAGES.reduce((acc, s) => {
            acc[s] = [];
            return acc;
        }, {});
    }

    @wire(getIdeasWithProcess)
    wiredIdeas(result) {
        this.wiredResult = result;
        const { data, error } = result;
        if (data) {
            // Reset columns
            this.columns = STAGES.reduce((acc, s) => {
                acc[s] = [];
                return acc;
            }, {});
            // Normalize and bucket
            data.forEach((r) => {
                const rec = {
                    id: r.Id,
                    name: r.Name,
                    target: r.target__c,
                    businessProcess: r.BusinessProcess__c,
                    businessImpact: r.businessimpact__c,
                    feasibility: r.feasibility__c,
                    pain: r.pain__c,
                    agentRole: r.agentrole__c
                };
                if (this.columns[rec.businessProcess]) {
                    this.columns[rec.businessProcess].push(rec);
                }
            });
        } else if (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'データ取得エラー',
                    message: this._normalizeError(error),
                    variant: 'error'
                })
            );
        }
    }

    get stageKeys() {
        return this.stages;
    }

    // LWC templates don't allow computed property access like columns[stage].
    // Provide a helper to return records for a given stage.
    getRecordsForStage(stage) {
        return this.columns[stage] || [];
    }

    handleCardClick(event) {
        const recordId = event.currentTarget.dataset.recordId;
        this.selectedRecordId = recordId;
        this.isModalOpen = true;
    }

    closeModal() {
        this.isModalOpen = false;
        this.selectedRecordId = null;
    }

    handleModalSuccess() {
        this.dispatchEvent(
            new ShowToastEvent({
                title: '保存しました',
                message: '評価が正常に保存されました。',
                variant: 'success'
            })
        );
        this.closeModal();
        if (this.wiredResult) {
            refreshApex(this.wiredResult);
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
        if (!error) return '不明なエラーが発生しました';
        if (Array.isArray(error.body)) {
            return error.body.map((e) => e.message).join(', ');
        } else if (error.body && typeof error.body.message === 'string') {
            return error.body.message;
        }
        return typeof error.message === 'string' ? error.message : '不明なエラーが発生しました';
    }
}
