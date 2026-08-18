import { expect, fixture, html } from '@open-wc/testing';
import './ha-device-table-card-editor';
import { DeviceTableCardEditor } from './ha-device-table-card-editor';
import { DeviceTableCardConfig } from './types';

if (!customElements.get('ha-textfield')) {
  customElements.define('ha-textfield', class extends HTMLElement {});
}
if (!customElements.get('ha-input')) {
  customElements.define('ha-input', class extends HTMLElement {});
}

describe('ha-device-table-card-editor', () => {
  const mockHass = {
    states: {},
  };

  const config: DeviceTableCardConfig = {
    type: 'custom:ha-device-table-card',
    title: 'Test Table',
    filter: {
      integration: 'zha',
      manufacturer: 'LUMI',
    },
    columns: [
      {
        type: 'device',
        prop: 'name',
        label: 'Device Name',
      },
      {
        type: 'entity',
        device_class: 'battery',
        label: 'Battery',
      },
    ],
  };

  it('renders the editor with integration and manufacturer fields', async () => {
    const el = await fixture<DeviceTableCardEditor>(html`
      <ha-device-table-card-editor .hass=${mockHass}></ha-device-table-card-editor>
    `);
    el.setConfig(config);
    await el.updateComplete;

    const textfields = el.shadowRoot?.querySelectorAll('ha-textfield, ha-input');
    expect(textfields).to.exist;

    const labels = Array.from(textfields!).map((tf) => tf.getAttribute('label'));
    expect(labels).to.contain('Integration (e.g. zha, mqtt, hue)');
    expect(labels).to.contain('Manufacturer (e.g. LUMI, Sonoff)');

    const integrationField = Array.from(textfields!).find(
      (tf) => (tf as any).configValue === 'filter.integration',
    );
    expect((integrationField as any).value).to.equal('zha');

    const manufacturerField = Array.from(textfields!).find(
      (tf) => (tf as any).configValue === 'filter.manufacturer',
    );
    expect((manufacturerField as any).value).to.equal('LUMI');
  });

  it('adds preset columns when requested', async () => {
    const el = await fixture<DeviceTableCardEditor>(html`
      <ha-device-table-card-editor .hass=${mockHass}></ha-device-table-card-editor>
    `);
    el.setConfig({ ...config, columns: [] });
    await el.updateComplete;

    let receivedConfig: DeviceTableCardConfig | null = null;
    el.addEventListener('config-changed', (ev: any) => {
      receivedConfig = ev.detail.config;
    });

    // Add moisture preset
    (el as any)._addColumnPreset('moisture');
    expect(receivedConfig).to.not.be.null;
    expect(receivedConfig!.columns).to.have.lengthOf(1);
    expect(receivedConfig!.columns![0].device_class).to.equal('moisture');
    expect(receivedConfig!.columns![0].label).to.equal('Moisture (%)');
  });

  it('adds custom column when requested', async () => {
    const el = await fixture<DeviceTableCardEditor>(html`
      <ha-device-table-card-editor .hass=${mockHass}></ha-device-table-card-editor>
    `);
    el.setConfig(config);
    await el.updateComplete;

    let receivedConfig: DeviceTableCardConfig | null = null;
    el.addEventListener('config-changed', (ev: any) => {
      receivedConfig = ev.detail.config;
    });

    (el as any)._addColumn();
    expect(receivedConfig).to.not.be.null;
    expect(receivedConfig!.columns).to.have.lengthOf(3);
    expect(receivedConfig!.columns![2].type).to.equal('device');
    expect(receivedConfig!.columns![2].label).to.equal('Column 3');
  });

  it('deletes columns with click-to-confirm', async () => {
    const el = await fixture<DeviceTableCardEditor>(html`
      <ha-device-table-card-editor .hass=${mockHass}></ha-device-table-card-editor>
    `);
    el.setConfig(config);
    await el.updateComplete;

    let receivedConfig: DeviceTableCardConfig | null = null;
    el.addEventListener('config-changed', (ev: any) => {
      receivedConfig = ev.detail.config;
    });

    // First click: sets confirmation state, does not emit config-changed yet
    (el as any)._deleteColumn(0);
    await el.updateComplete;
    expect(receivedConfig).to.be.null;
    expect((el as any)._confirmDeleteColumnIndex).to.equal(0);

    const colItem = el.shadowRoot?.querySelectorAll('.column-item')[0];
    expect(colItem?.classList.contains('confirm-delete')).to.be.true;

    // Second click: executes deletion
    (el as any)._deleteColumn(0);
    await el.updateComplete;
    expect(receivedConfig).to.not.be.null;
    expect(receivedConfig!.columns).to.have.lengthOf(1);
    expect(receivedConfig!.columns![0].device_class).to.equal('battery');
    expect((el as any)._confirmDeleteColumnIndex).to.be.null;
  });

  it('resets column delete confirmation when clicking elsewhere', async () => {
    const el = await fixture<DeviceTableCardEditor>(html`
      <ha-device-table-card-editor .hass=${mockHass}></ha-device-table-card-editor>
    `);
    el.setConfig(config);
    await el.updateComplete;

    // First click: sets confirmation state
    (el as any)._deleteColumn(0);
    expect((el as any)._confirmDeleteColumnIndex).to.equal(0);

    // Simulate global click elsewhere
    const mockEvent = {
      composedPath: () => [document.body],
    };
    (el as any)._handleGlobalClick(mockEvent);

    expect((el as any)._confirmDeleteColumnIndex).to.be.null;
  });

  it('moves/reorders columns', async () => {
    const el = await fixture<DeviceTableCardEditor>(html`
      <ha-device-table-card-editor .hass=${mockHass}></ha-device-table-card-editor>
    `);
    el.setConfig(config);
    await el.updateComplete;

    let receivedConfig: DeviceTableCardConfig | null = null;
    el.addEventListener('config-changed', (ev: any) => {
      receivedConfig = ev.detail.config;
    });

    // Move first column down
    (el as any)._moveColumn(0, 'down');
    expect(receivedConfig).to.not.be.null;
    expect(receivedConfig!.columns![0].type).to.equal('entity');
    expect(receivedConfig!.columns![1].type).to.equal('device');
  });

  it('updates column property', async () => {
    const el = await fixture<DeviceTableCardEditor>(html`
      <ha-device-table-card-editor .hass=${mockHass}></ha-device-table-card-editor>
    `);
    el.setConfig(config);
    await el.updateComplete;

    let receivedConfig: DeviceTableCardConfig | null = null;
    el.addEventListener('config-changed', (ev: any) => {
      receivedConfig = ev.detail.config;
    });

    (el as any)._updateColumnProperty(0, 'label', 'Brand New Label');
    expect(receivedConfig).to.not.be.null;
    expect(receivedConfig!.columns![0].label).to.equal('Brand New Label');
  });

  it('blocks prototype pollution on column property update', async () => {
    const el = await fixture<DeviceTableCardEditor>(html`
      <ha-device-table-card-editor .hass=${mockHass}></ha-device-table-card-editor>
    `);
    el.setConfig(config);
    await el.updateComplete;

    let receivedConfig: DeviceTableCardConfig | null = null;
    el.addEventListener('config-changed', (ev: any) => {
      receivedConfig = ev.detail.config;
    });

    (el as any)._updateColumnProperty(0, '__proto__', { polluted: true });
    expect(receivedConfig).to.be.null;
    expect((Object.prototype as any).polluted).to.be.undefined;
  });

  it('adds, updates, and deletes highlight rules', async () => {
    const el = await fixture<DeviceTableCardEditor>(html`
      <ha-device-table-card-editor .hass=${mockHass}></ha-device-table-card-editor>
    `);
    // Start with a config where columns[1] (entity class battery) has no highlights
    el.setConfig(config);
    await el.updateComplete;

    let receivedConfig: DeviceTableCardConfig | null = null;
    el.addEventListener('config-changed', (ev: any) => {
      receivedConfig = ev.detail.config;
    });

    // Add Highlight Rule to columns[1]
    (el as any)._addHighlightRule(1);
    expect(receivedConfig).to.not.be.null;
    expect(receivedConfig!.columns![1].highlight).to.have.lengthOf(1);
    expect(receivedConfig!.columns![1].highlight![0].color).to.equal('red');

    // Update Highlight Rule
    el.setConfig(receivedConfig!);
    receivedConfig = null;
    (el as any)._updateHighlightRule(1, 0, 'below', 15);
    expect(receivedConfig).to.not.be.null;
    expect(receivedConfig!.columns![1].highlight![0].below).to.equal(15);

    // Delete Highlight Rule with click-to-confirm
    el.setConfig(receivedConfig!);
    receivedConfig = null;

    // First click: sets confirmation state, does not delete
    (el as any)._expandedColumnIndex = 1;
    (el as any)._deleteHighlightRule(1, 0);
    await el.updateComplete;
    expect(receivedConfig).to.be.null;
    expect((el as any)._confirmDeleteHighlightIndex).to.deep.equal({ colIndex: 1, hlIndex: 0 });

    const ruleRow = el.shadowRoot?.querySelector('.highlight-rule-row');
    expect(ruleRow?.classList.contains('confirm-delete')).to.be.true;

    // Second click: executes deletion
    (el as any)._deleteHighlightRule(1, 0);
    await el.updateComplete;
    expect(receivedConfig).to.not.be.null;
    expect(receivedConfig!.columns![1].highlight).to.have.lengthOf(0);
    expect((el as any)._confirmDeleteHighlightIndex).to.be.null;
  });

  it('renders native input as fallback when custom elements are not registered', async () => {
    const el = await fixture<DeviceTableCardEditor>(html`
      <ha-device-table-card-editor .hass=${mockHass}></ha-device-table-card-editor>
    `);
    el.setConfig(config);
    await el.updateComplete;

    // Stub customElements.get to return undefined for custom elements
    const originalGet = customElements.get;
    customElements.get = (name: string) => {
      if (name === 'ha-input' || name === 'ha-textfield') {
        return undefined;
      }
      return originalGet.call(customElements, name);
    };

    try {
      const template1 = (el as any)._renderInput(
        'Below',
        '10',
        undefined,
        () => {},
        '100',
        'Trigger value below',
        false,
        undefined,
        'col-0-hl-0-below',
      );
      const template2 = (el as any)._renderInput(
        'Below',
        '10',
        undefined,
        () => {},
        '100',
        'Trigger value below',
        false,
        undefined,
        'col-0-hl-0-below',
      );
      const container1 = await fixture(html`<div>${template1}</div>`);
      const container2 = await fixture(html`<div>${template2}</div>`);
      const nativeInput1 = container1.querySelector('input.native-input');
      const nativeInput2 = container2.querySelector('input.native-input');
      const label = container1.querySelector('label');

      expect(nativeInput1).to.exist;
      expect(nativeInput2).to.exist;
      expect(label).to.exist;
      expect(nativeInput1?.id).to.equal(label?.getAttribute('for'));
      expect(nativeInput1?.id).to.equal('input-below-col-0-hl-0-below');
      // Verify deterministic ID generation across multiple calls/renders
      expect(nativeInput1?.id).to.equal(nativeInput2?.id);
      expect((nativeInput1 as any).value).to.equal('10');
    } finally {
      customElements.get = originalGet;
    }
  });

  it('has accessible select elements and preset badges', async () => {
    const el = await fixture<DeviceTableCardEditor>(html`
      <ha-device-table-card-editor .hass=${mockHass}></ha-device-table-card-editor>
    `);
    el.setConfig(config);
    // Expand columns section and first column item to render column-body
    (el as any)._columnsExpanded = true;
    (el as any)._expandedColumnIndex = 0;
    await el.updateComplete;

    const selectType = el.shadowRoot?.querySelector('#select-type-0');
    const labelType = el.shadowRoot?.querySelector('label[for="select-type-0"]');
    expect(selectType).to.exist;
    expect(labelType).to.exist;
    expect(labelType?.textContent?.trim()).to.equal('Type:');

    const selectProp = el.shadowRoot?.querySelector('#select-prop-0');
    const labelProp = el.shadowRoot?.querySelector('label[for="select-prop-0"]');
    expect(selectProp).to.exist;
    expect(labelProp).to.exist;
    expect(labelProp?.textContent?.trim()).to.equal('Property:');

    const presets = el.shadowRoot?.querySelectorAll('.preset-badge');
    expect(presets).to.exist;
    expect(presets!.length).to.equal(4);
    expect(presets![0].getAttribute('aria-label')).to.equal('Add Battery column preset');
    expect(presets![1].getAttribute('aria-label')).to.equal('Add Moisture column preset');
    expect(presets![2].getAttribute('aria-label')).to.equal('Add Device Name column preset');
    expect(presets![3].getAttribute('aria-label')).to.equal('Add Last Seen column preset');
  });

  it('has correct micro-UX and accessibility attributes on collapsible sections and reorder buttons', async () => {
    const el = await fixture<DeviceTableCardEditor>(html`
      <ha-device-table-card-editor .hass=${mockHass}></ha-device-table-card-editor>
    `);
    el.setConfig(config);
    (el as any)._columnsExpanded = true;
    (el as any)._expandedColumnIndex = 0;
    await el.updateComplete;

    // Check collapsible section header aria-controls and aria-expanded
    const generalHeader = el.shadowRoot?.querySelector('.section-header');
    expect(generalHeader?.getAttribute('aria-controls')).to.equal('general-section-content');
    expect(generalHeader?.getAttribute('aria-expanded')).to.equal('true');

    const columnItemHeader = el.shadowRoot?.querySelector('.column-header-title');
    expect(columnItemHeader?.getAttribute('aria-controls')).to.equal('column-body-0');
    expect(columnItemHeader?.getAttribute('aria-expanded')).to.equal('true');

    // Check decorative SVGs have aria-hidden="true"
    const svgs = el.shadowRoot?.querySelectorAll('svg');
    expect(svgs?.length).to.be.greaterThan(0);
    svgs?.forEach((svg) => {
      expect(svg.getAttribute('aria-hidden')).to.equal('true');
    });

    // Check move up/down button titles and aria-labels for disabled / enabled states
    // Column 0 is the first column, so Move Up should be disabled
    const firstColActions = el.shadowRoot?.querySelectorAll('.column-actions');
    expect(firstColActions?.length).to.be.greaterThan(0);

    const buttons = firstColActions![0].querySelectorAll('button');
    // Button 0 is Move Up
    expect(buttons[0].getAttribute('title')).to.equal(
      'Cannot move "Device Name" up (already at top)',
    );
    expect(buttons[0].getAttribute('aria-label')).to.equal(
      'Cannot move "Device Name" up (already at top)',
    );

    // Button 1 is Move Down (since columns count is 2, and we are at index 0, it should be enabled)
    expect(buttons[1].getAttribute('title')).to.equal('Move "Device Name" column down');
    expect(buttons[1].getAttribute('aria-label')).to.equal('Move "Device Name" column down');
  });

  describe('color preview swatch', () => {
    it('renders color preview swatch with sanitized background color and title', async () => {
      const el = await fixture<DeviceTableCardEditor>(html`
        <ha-device-table-card-editor .hass=${mockHass}></ha-device-table-card-editor>
      `);
      const configWithHighlight: DeviceTableCardConfig = {
        ...config,
        columns: [
          {
            type: 'entity',
            device_class: 'battery',
            label: 'Battery',
            highlight: [{ below: 15, color: 'red' }],
          },
        ],
      };
      el.setConfig(configWithHighlight);
      (el as any)._columnsExpanded = true;
      (el as any)._expandedColumnIndex = 0;
      await el.updateComplete;

      const swatch = el.shadowRoot?.querySelector('.color-preview-swatch') as HTMLElement;
      expect(swatch).to.exist;
      expect(swatch.style.backgroundColor).to.equal('red');
      expect(swatch.getAttribute('title')).to.equal('Color preview: red');
    });

    it('sanitizes unsafe color values in the preview swatch', async () => {
      const el = await fixture<DeviceTableCardEditor>(html`
        <ha-device-table-card-editor .hass=${mockHass}></ha-device-table-card-editor>
      `);
      const configWithUnsafeHighlight: DeviceTableCardConfig = {
        ...config,
        columns: [
          {
            type: 'entity',
            device_class: 'battery',
            label: 'Battery',
            highlight: [{ below: 15, color: 'url(unsafe-stuff)' }],
          },
        ],
      };
      el.setConfig(configWithUnsafeHighlight);
      (el as any)._columnsExpanded = true;
      (el as any)._expandedColumnIndex = 0;
      await el.updateComplete;

      const swatch = el.shadowRoot?.querySelector('.color-preview-swatch') as HTMLElement;
      expect(swatch).to.exist;
      expect(swatch.style.backgroundColor).to.be.oneOf(['transparent', '', 'initial']);
    });
  });

  describe('accessibility focus management', () => {
    it('focuses the new column header when a preset is added', async () => {
      const el = await fixture<DeviceTableCardEditor>(html`
        <ha-device-table-card-editor .hass=${mockHass}></ha-device-table-card-editor>
      `);
      el.setConfig({ ...config, columns: [] });
      await el.updateComplete;

      el.addEventListener('config-changed', (ev: any) => {
        el.setConfig(ev.detail.config);
      });

      (el as any)._addColumnPreset('moisture');
      await el.updateComplete;

      const header = el.shadowRoot?.querySelector('.column-header-title[data-index="0"]');
      expect(el.shadowRoot?.activeElement).to.equal(header);
    });

    it('focuses the other column header when a column is deleted', async () => {
      const el = await fixture<DeviceTableCardEditor>(html`
        <ha-device-table-card-editor .hass=${mockHass}></ha-device-table-card-editor>
      `);
      el.setConfig(config);
      await el.updateComplete;

      el.addEventListener('config-changed', (ev: any) => {
        el.setConfig(ev.detail.config);
      });

      // Call twice due to click-to-confirm delete mechanism
      (el as any)._deleteColumn(1);
      (el as any)._deleteColumn(1);
      await el.updateComplete;

      const header = el.shadowRoot?.querySelector('.column-header-title[data-index="0"]');
      expect(el.shadowRoot?.activeElement).to.equal(header);
    });

    it('focuses the moved column header when column is reordered', async () => {
      const el = await fixture<DeviceTableCardEditor>(html`
        <ha-device-table-card-editor .hass=${mockHass}></ha-device-table-card-editor>
      `);
      el.setConfig(config);
      await el.updateComplete;

      el.addEventListener('config-changed', (ev: any) => {
        el.setConfig(ev.detail.config);
      });

      (el as any)._moveColumn(0, 'down');
      await el.updateComplete;

      const header = el.shadowRoot?.querySelector('.column-header-title[data-index="1"]');
      expect(el.shadowRoot?.activeElement).to.equal(header);
    });

    it('focuses the rule input when a highlight rule is added', async () => {
      const el = await fixture<DeviceTableCardEditor>(html`
        <ha-device-table-card-editor .hass=${mockHass}></ha-device-table-card-editor>
      `);
      el.setConfig(config);
      (el as any)._expandedColumnIndex = 1;
      await el.updateComplete;

      el.addEventListener('config-changed', (ev: any) => {
        el.setConfig(ev.detail.config);
      });

      (el as any)._addHighlightRule(1);
      await el.updateComplete;

      const input = el.shadowRoot?.querySelector(
        '.highlight-rule-row[data-col-index="1"][data-hl-index="0"] input',
      );
      expect(el.shadowRoot?.activeElement).to.equal(input);
    });

    it('shows empty-state text and descriptive titles on presets when no columns are configured', async () => {
      const el = await fixture<DeviceTableCardEditor>(html`
        <ha-device-table-card-editor .hass=${mockHass}></ha-device-table-card-editor>
      `);
      el.setConfig({ ...config, columns: [] });
      await el.updateComplete;

      const emptyStateText = el.shadowRoot?.querySelector('.empty-state-text');
      expect(emptyStateText).to.exist;
      expect(emptyStateText?.textContent?.trim()).to.contain('No columns defined yet');

      const presets = el.shadowRoot?.querySelectorAll('.preset-badge');
      expect(presets).to.exist;
      expect(presets![0].getAttribute('title')).to.equal(
        'Add a Battery column preset with low battery highlight (below 15%)',
      );
      expect(presets![1].getAttribute('title')).to.equal(
        'Add a Moisture column preset with dry moisture highlight (below 30%)',
      );
    });
  });

  describe('numeric threshold input validation', () => {
    it('correctly evaluates _isInvalidNumber for various inputs', async () => {
      const el = await fixture<DeviceTableCardEditor>(html`
        <ha-device-table-card-editor .hass=${mockHass}></ha-device-table-card-editor>
      `);

      // Valid numbers
      expect((el as any)._isInvalidNumber('')).to.be.false;
      expect((el as any)._isInvalidNumber('   ')).to.be.false;
      expect((el as any)._isInvalidNumber('15')).to.be.false;
      expect((el as any)._isInvalidNumber('-15')).to.be.false;
      expect((el as any)._isInvalidNumber('12.3')).to.be.false;

      // Intermediate typing states (should not trigger invalid styling)
      expect((el as any)._isInvalidNumber('-')).to.be.false;
      expect((el as any)._isInvalidNumber('.')).to.be.false;
      expect((el as any)._isInvalidNumber('-.')).to.be.false;
      expect((el as any)._isInvalidNumber('12.')).to.be.false;
      expect((el as any)._isInvalidNumber('-15.')).to.be.false;

      // Real invalid values
      expect((el as any)._isInvalidNumber('abc')).to.be.true;
      expect((el as any)._isInvalidNumber('12.3.4')).to.be.true;
      expect((el as any)._isInvalidNumber('12a')).to.be.true;
    });

    it('sets invalid state and error messages on custom elements when validation fails', async () => {
      const el = await fixture<DeviceTableCardEditor>(html`
        <ha-device-table-card-editor .hass=${mockHass}></ha-device-table-card-editor>
      `);
      // columns[1] is type entity and has highlight battery below 15
      const customConfig: DeviceTableCardConfig = {
        ...config,
        columns: [
          {
            type: 'entity',
            device_class: 'battery',
            label: 'Battery',
            highlight: [{ below: 'invalid-val' as any, color: 'red' }],
          },
        ],
      };
      el.setConfig(customConfig);
      (el as any)._columnsExpanded = true;
      (el as any)._expandedColumnIndex = 0;
      await el.updateComplete;

      const belowInput = el.shadowRoot?.querySelector(
        '.highlight-rule-row[data-col-index="0"] ha-input, .highlight-rule-row[data-col-index="0"] ha-textfield',
      ) as any;
      expect(belowInput).to.exist;
      expect(belowInput.invalid).to.be.true;
      expect(belowInput.errorMessage).to.equal('Must be a valid number');
      expect(belowInput.helper).to.equal('Must be a valid number');
    });

    it('sets invalid-input class and aria-invalid/aria-describedby on fallback native inputs when validation fails', async () => {
      const el = await fixture<DeviceTableCardEditor>(html`
        <ha-device-table-card-editor .hass=${mockHass}></ha-device-table-card-editor>
      `);

      const originalGet = customElements.get;
      customElements.get = (name: string) => {
        if (name === 'ha-input' || name === 'ha-textfield') {
          return undefined;
        }
        return originalGet.call(customElements, name);
      };

      try {
        const template = (el as any)._renderInput(
          'Below',
          'abc',
          'below',
          () => {},
          '100',
          'Trigger value below',
          true,
          'Must be a valid number',
        );
        const container = await fixture(html`<div>${template}</div>`);
        const nativeInput = container.querySelector('input.native-input') as HTMLInputElement;
        const errorDiv = container.querySelector('.error-text') as HTMLElement;

        expect(nativeInput).to.exist;
        expect(nativeInput.classList.contains('invalid-input')).to.be.true;
        expect(nativeInput.getAttribute('aria-invalid')).to.equal('true');
        expect(errorDiv).to.exist;
        expect(errorDiv.textContent?.trim()).to.equal('Must be a valid number');
        expect(nativeInput.getAttribute('aria-describedby')).to.equal(errorDiv.id);
      } finally {
        customElements.get = originalGet;
      }
    });
  });
});
