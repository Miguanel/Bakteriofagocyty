import { state } from './GameState.js';

export const WindowManager = {
    getEl(id) { return document.getElementById(id); },

    updateForPhase(phase) {
        const topUi = this.getEl('top-ui');
        const sideBtns = this.getEl('lab-side-buttons');
        const listPanel = this.getEl('unit-list-panel');
        const actionBtn = this.getEl('action-btn');
        const phaseIndicator = this.getEl('phase-indicator');
        const tooltip = this.getEl('unit-hover-tooltip');

        // Bezpiecznie chowamy tooltip przy KAŻDEJ zmianie fazy
        if (tooltip) tooltip.style.display = 'none';

        if (phase.startsWith('LAB_')) {
            if (topUi) topUi.style.display = 'none';
            if (sideBtns) sideBtns.style.display = 'flex';
            if (listPanel) listPanel.style.display = 'flex';

            if (actionBtn) {
                actionBtn.innerText = "ZATWIERDŹ GENY";
                actionBtn.disabled = false;
            }
        }
        else if (phase.startsWith('PLANNING_')) {
            if (topUi) topUi.style.display = 'flex';
            if (sideBtns) sideBtns.style.display = 'none';
            if (listPanel) listPanel.style.display = 'none';

            if (actionBtn) {
                actionBtn.innerText = "SKOK DO WALKI";
                actionBtn.disabled = false;
            }

            const color = state.activePlayerId === 'player' ? state.p1Color : state.p2Color;
            if (phaseIndicator) {
                phaseIndicator.innerText = `PLANOWANIE: ${state.activePlayerId === 'player' ? state.p1Name : state.p2Name}`;
                phaseIndicator.style.color = color;
            }
        }
        else if (phase === 'COMBAT') {
            if (topUi) topUi.style.display = 'flex';
            if (sideBtns) sideBtns.style.display = 'none';
            if (listPanel) listPanel.style.display = 'none';

            if (actionBtn) actionBtn.disabled = true;
            if (phaseIndicator) {
                phaseIndicator.innerText = "🔥 STARCIE!";
                phaseIndicator.style.color = "#f1c40f";
            }
        }
    }
};