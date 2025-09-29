const DEFAULT_BACKFOCUS = 260.096;

const ONAG_MODELS = {
    SC: { OIBF: 66, OGBF: 90, BFO: 24 },
    XM: { OIBF: 68, OGBF: 101, BFO: 33 }
};

let currentModel = 'SC';
let customComponents = [];

function selectONAGModel(model, evt) {
    currentModel = model;
    document.getElementById('onag_model').value = model;

    document.querySelectorAll('.model-option').forEach(opt => opt.classList.remove('selected'));

    if (evt && evt.currentTarget) {
        evt.currentTarget.classList.add('selected');
    } else {
        const fallback = document.querySelector(`.model-option[data-model="${model}"]`);
        if (fallback) {
            fallback.classList.add('selected');
        }
    }

    const modelData = ONAG_MODELS[model];
    document.getElementById('onag_optical').textContent = `${modelData.OIBF} mm`;

    calculate();
}

function formatMm(value, digits = 2) {
    if (!Number.isFinite(value)) {
        return '-';
    }
    const rounded = Number.parseFloat(value.toFixed(digits));
    return rounded.toFixed(digits);
}

function formatInches(value, digits = 3) {
    if (!Number.isFinite(value)) {
        return '-';
    }
    const inches = value / 25.4;
    const rounded = Number.parseFloat(inches.toFixed(digits));
    return rounded.toFixed(digits);
}

function calculate() {
    const totalBackfocusRaw = parseFloat(document.getElementById('telescope_backfocus').value);
    const totalBackfocus = Number.isFinite(totalBackfocusRaw) ? totalBackfocusRaw : 0;

    const model = document.getElementById('onag_model').value || currentModel;
    const modelData = ONAG_MODELS[model];

    const customTotal = customComponents.reduce((sum, component) => {
        const value = parseFloat(component.value);
        return Number.isFinite(value) ? sum + value : sum;
    }, 0);
    const onag_ibf = parseFloat(document.getElementById('onag_ibf').value) || 0;

    const onag_main_spacer = totalBackfocus - customTotal - modelData.OIBF - onag_ibf;
    const onag_total = customTotal + modelData.OIBF + onag_ibf + Math.max(0, onag_main_spacer);

    document.getElementById('onag_main_spacer').innerHTML = `${formatMm(onag_main_spacer)} mm<br><small>(${formatInches(onag_main_spacer)}\")</small>`;
    document.getElementById('onag_total').textContent = `${formatMm(onag_total)} mm`;

    const onag_main_result = document.getElementById('onag_main_result');
    if (totalBackfocus <= 0) {
        onag_main_result.className = 'result error';
        onag_main_result.textContent = '⚠️ Enter a positive telescope backfocus value to compute spacers.';
    } else if (onag_main_spacer < 0) {
        onag_main_result.className = 'result error';
        onag_main_result.innerHTML = `⚠️ Configuration exceeds backfocus by ${formatMm(Math.abs(onag_main_spacer))}mm`;
    } else if (onag_main_spacer < 5) {
        onag_main_result.className = 'result warning';
        onag_main_result.innerHTML = `⚠️ Very short spacer (${formatMm(onag_main_spacer)}mm)`;
    } else {
        onag_main_result.className = 'result success';
        onag_main_result.innerHTML = `✅ Use ${formatMm(onag_main_spacer)}mm main spacer (${formatInches(onag_main_spacer)}\")`;
    }

    const parfocal_ibf = parseFloat(document.getElementById('parfocal_ibf').value) || 0;
    const parfocal_gbf = parseFloat(document.getElementById('parfocal_gbf').value) || 0;
    const use_corrector = document.getElementById('astigmatism_corrector').checked;

    document.getElementById('onag_constants').textContent = `ONAG ${model}`;
    document.getElementById('par_oibf').textContent = `${modelData.OIBF} mm`;
    document.getElementById('par_ogbf').textContent = `${modelData.OGBF} mm`;
    document.getElementById('par_bfo').textContent = `${modelData.BFO} mm`;

    const dbf = parfocal_ibf - parfocal_gbf;
    const adjusted_bfo = use_corrector ? modelData.BFO - 3 : modelData.BFO;
    const adjusted_dbf = use_corrector ? dbf + 3 : dbf;

    document.getElementById('par_dbf').textContent = `${formatMm(dbf, 1)} mm`;
    if (use_corrector) {
        document.getElementById('par_adjusted').innerHTML = `BFO: ${adjusted_bfo}mm, DBF: ${formatMm(adjusted_dbf, 1)}mm`;
    } else {
        document.getElementById('par_adjusted').textContent = 'No correction';
    }

    const mismatch = adjusted_dbf - adjusted_bfo;
    let parfocal_spacer_text;
    if (Math.abs(mismatch) < 0.5) {
        parfocal_spacer_text = 'None needed (parfocal)';
    } else if (mismatch > 0) {
        parfocal_spacer_text = `+${formatMm(mismatch, 1)}mm at GP (guider)`;
    } else {
        parfocal_spacer_text = `${formatMm(Math.abs(mismatch), 1)}mm at IP (imager)`;
    }

    document.getElementById('parfocal_spacer').textContent = parfocal_spacer_text;

    const abs_mismatch = Math.abs(mismatch);
    let helical_text;
    if (abs_mismatch <= 4) {
        helical_text = '✅ Within ±4mm fine focus range';
    } else if (abs_mismatch <= 9) {
        helical_text = '⚠️ Within 9mm travel but spacer recommended';
    } else {
        helical_text = '❌ Outside focuser range - spacer required';
    }
    document.getElementById('helical_status').textContent = helical_text;

    const parfocal_result = document.getElementById('parfocal_result');
    if (totalBackfocus <= 0) {
        parfocal_result.className = 'result warning';
        parfocal_result.textContent = 'Enter a telescope backfocus value to evaluate parfocal spacing.';
    } else if (abs_mismatch <= 4) {
        parfocal_result.className = 'result success';
        parfocal_result.innerHTML = '✅ Cameras are parfocal within helical focuser range';
    } else if (abs_mismatch <= 9) {
        parfocal_result.className = 'result warning';
        parfocal_result.innerHTML = `⚠️ Marginal: ${parfocal_spacer_text}`;
    } else {
        parfocal_result.className = 'result error';
        parfocal_result.innerHTML = `⚠️ Spacer required: ${parfocal_spacer_text}`;
    }

    const summaryBackfocus = document.getElementById('summary_backfocus');
    summaryBackfocus.textContent = totalBackfocus > 0 ? `${formatMm(totalBackfocus)} mm` : 'Set value';

    const summaryMainSpacer = document.getElementById('summary_main_spacer');
    if (totalBackfocus <= 0) {
        summaryMainSpacer.textContent = 'n/a';
    } else if (onag_main_spacer >= 0) {
        summaryMainSpacer.textContent = `${formatMm(onag_main_spacer)} mm`;
    } else {
        summaryMainSpacer.textContent = `Exceeds by ${formatMm(Math.abs(onag_main_spacer))} mm`;
    }

    document.getElementById('summary_parfocal').textContent = parfocal_spacer_text;
}

function updateComponentPlaceholderVisibility() {
    const placeholderRow = document.getElementById('onag_component_anchor');
    if (!placeholderRow) {
        return;
    }
    placeholderRow.style.display = customComponents.length ? 'none' : '';
}

function createComponentRow(component) {
    const row = document.createElement('tr');
    row.dataset.id = component.id;

    const nameCell = document.createElement('td');
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'component-name-input';
    nameInput.placeholder = 'Component name';
    nameInput.value = component.name;
    nameInput.addEventListener('input', event => {
        component.name = event.target.value;
    });
    nameCell.appendChild(nameInput);

    const distanceCell = document.createElement('td');
    const wrapper = document.createElement('div');
    wrapper.className = 'component-distance-wrapper';

    const distanceInput = document.createElement('input');
    distanceInput.type = 'number';
    distanceInput.step = '0.1';
    distanceInput.className = 'component-distance-input';
    distanceInput.value = component.value;
    distanceInput.addEventListener('input', event => {
        component.value = event.target.value;
        calculate();
    });

    const unitSpan = document.createElement('span');
    unitSpan.textContent = 'mm';

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'remove-component-button';
    removeButton.setAttribute('aria-label', 'Remove component');
    removeButton.textContent = '×';
    removeButton.addEventListener('click', () => {
        customComponents = customComponents.filter(entry => entry !== component);
        row.remove();
        updateComponentPlaceholderVisibility();
        calculate();
    });

    wrapper.appendChild(distanceInput);
    wrapper.appendChild(unitSpan);
    wrapper.appendChild(removeButton);
    distanceCell.appendChild(wrapper);

    row.appendChild(nameCell);
    row.appendChild(distanceCell);

    return row;
}

function addCustomComponent() {
    const newComponent = {
        id: `component-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: '',
        value: '0'
    };

    customComponents.push(newComponent);

    const row = createComponentRow(newComponent);
    const anchorRow = document.getElementById('onag_optical_row');
    if (anchorRow && anchorRow.parentNode) {
        anchorRow.parentNode.insertBefore(row, anchorRow);
    } else {
        document.getElementById('onag_table_body').appendChild(row);
    }

    updateComponentPlaceholderVisibility();
    calculate();

    const nameField = row.querySelector('.component-name-input');
    if (nameField) {
        nameField.focus();
    }
}

const darkToggle = document.getElementById('dark_mode_toggle');
const prefersDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : { matches: false };

function applyDarkModeState(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    darkToggle.checked = isDark;
}

const storedTheme = typeof localStorage !== 'undefined' ? localStorage.getItem('backfocus-dark-mode') : null;
const initialDark = storedTheme === null ? !!(prefersDark && prefersDark.matches) : storedTheme === 'true';
applyDarkModeState(initialDark);

darkToggle.addEventListener('change', event => {
    const enabled = event.target.checked;
    applyDarkModeState(enabled);
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('backfocus-dark-mode', enabled);
    }
});

const handlePreferenceChange = event => {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('backfocus-dark-mode') !== null) {
        return;
    }
    applyDarkModeState(event.matches);
};

if (prefersDark) {
    if (typeof prefersDark.addEventListener === 'function') {
        prefersDark.addEventListener('change', handlePreferenceChange);
    } else if (typeof prefersDark.addListener === 'function') {
        prefersDark.addListener(handlePreferenceChange);
    }
}

document.querySelectorAll('input[type="number"], input[type="checkbox"]').forEach(input => {
    if (input.id === 'dark_mode_toggle') {
        return;
    }
    input.addEventListener('input', calculate);
    input.addEventListener('change', calculate);
});

document.getElementById('onag_ibf').addEventListener('input', function () {
    document.getElementById('parfocal_ibf').value = this.value;
    calculate();
});

document.getElementById('parfocal_ibf').addEventListener('input', function () {
    document.getElementById('onag_ibf').value = this.value;
    calculate();
});

const addComponentButton = document.getElementById('add_component_button');
if (addComponentButton) {
    addComponentButton.addEventListener('click', addCustomComponent);
}

document.getElementById('telescope_backfocus').value = formatMm(DEFAULT_BACKFOCUS, 3);
updateComponentPlaceholderVisibility();
selectONAGModel(currentModel);
