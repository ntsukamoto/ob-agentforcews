import { LightningElement, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getPlottableRecords from '@salesforce/apex/AgentforcePrioritizationController.getPlottableRecords';

const MIN = 1;
const MAX = 7;

// Fixed layout numbers tied to SVG viewBox 800x600
const VIEW_W = 800;
const VIEW_H = 600;
const PAD = 60; // inner plot padding

export default class AgentforcePrioritizationMatrix extends NavigationMixin(LightningElement) {
    @track points = [];
    error;

    // ticks 1..7
    ticks = Array.from({ length: MAX - MIN + 1 }, (_, i) => i + MIN);

    // plot dimensions (inside padding)
    plotWidth = VIEW_W - PAD * 2;
    plotHeight = VIEW_H - PAD * 2;
    plotWidthHalf = (VIEW_W - PAD * 2) / 2;
    plotHeightMinus5 = (VIEW_H - PAD * 2) - 5;
    plotHeightPlus18 = (VIEW_H - PAD * 2) + 18;
    plotHeightPlus42 = (VIEW_H - PAD * 2) + 42;

    // Transform for inner plot group
    get plotTransform() {
        return `translate(${PAD},${PAD})`;
    }

    // Axis label transform for Y (vertical text on left)
    get yAxisLabelTransform() {
        // Rotate -90 around left side; move into left margin
        return `translate(${ -45 }, ${ this.plotHeight / 2 }) rotate(-90)`;
    }

    // Crosshair at value 4
    get xAt4() {
        return this.valueToX(4);
    }
    get yAt4() {
        return this.valueToY(4);
    }

    // Data state
    get hasData() {
        return this.points && this.points.length > 0;
    }

    @wire(getPlottableRecords)
    wiredPoints({ data, error }) {
        if (data) {
            // Normalize into renderable points with jitter
            const buckets = new Map(); // key "x-y" -> count assigned
            this.points = data.map((r) => {
                const xVal = r.feasibility;
                const yVal = r.impact;
                const key = `${xVal}-${yVal}`;
                const used = buckets.get(key) || 0;
                buckets.set(key, used + 1);
                const jitter = this.jitterOffset(used);
                const x = this.valueToX(xVal) + jitter.dx;
                const y = this.valueToY(yVal) + jitter.dy;

                const ariaLabel = `${r.name}. Impact ${yVal}, Feasibility ${xVal}`;
                const tooltip = `${r.name} (I:${yVal}, F:${xVal})`;

                return {
                    id: r.id,
                    name: r.name,
                    x,
                    y,
                    transform: `translate(${x},${y})`,
                    feasibility: xVal,
                    impact: yVal,
                    ariaLabel,
                    tooltip
                };
            });
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.points = [];
        }
    }

    // Mapping helpers
    // Map 1..7 to 0..plotWidth
    valueToX(v) {
        const t = (v - MIN) / (MAX - MIN); // 0..1
        return t * this.plotWidth;
    }
    // Map 1..7 to 0..plotHeight, inverted so 7 at top
    valueToY(v) {
        const t = (v - MIN) / (MAX - MIN); // 0..1
        return (1 - t) * this.plotHeight;
    }

    // Jitter pattern for overlap mitigation (sequence of small offsets)
    jitterOffset(index) {
        const offsets = [
            { dx: 0, dy: 0 },
            { dx: 6, dy: 0 },
            { dx: -6, dy: 0 },
            { dx: 0, dy: 6 },
            { dx: 0, dy: -6 },
            { dx: 4, dy: 4 },
            { dx: -4, dy: -4 },
            { dx: 4, dy: -4 },
            { dx: -4, dy: 4 },
            { dx: 8, dy: 0 },
            { dx: -8, dy: 0 }
        ];
        return offsets[index % offsets.length];
    }

    // Provide transforms for ticks without calling functions in template
    get xTicks() {
        return this.ticks.map((t) => {
            return {
                key: `x-${t}`,
                t,
                transform: `translate(${this.valueToX(t)},0)`
            };
        });
    }
    get yTicks() {
        return this.ticks.map((t) => {
            return {
                key: `y-${t}`,
                t,
                transform: `translate(0,${this.valueToY(t)})`
            };
        });
    }

    // Navigation on click/keyboard
    handleNavigate = (event) => {
        const group = event.currentTarget;
        const recId = group.dataset.id;
        if (!recId) return;

        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: recId,
                objectApiName: 'agentforcews__c',
                actionName: 'view'
            }
        });
    };

    handleKeyNavigate = (event) => {
        // Activate on Enter or Space
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.handleNavigate(event);
        }
    };
}