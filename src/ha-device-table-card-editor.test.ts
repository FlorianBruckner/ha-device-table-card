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
    expect(receivedConfig).to.be.null;
    expect((el as any)._confirmDeleteColumnIndex).to.equal(0);

    // Second click: executes deletion
    (el as any)._deleteColumn(0);
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
    (el as any)._deleteHighlightRule(1, 0);
    expect(receivedConfig).to.be.null;
    expect((el as any)._confirmDeleteHighlightIndex).to.deep.equal({ colIndex: 1, hlIndex: 0 });

    // Second click: executes deletion
    (el as any)._deleteHighlightRule(1, 0);
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
      const template = (el as any)._renderInput('Test Label', 'test-val', 'test-config', () => {});
      const container = await fixture(html`<div>${template}</div>`);
      const nativeInput = container.querySelector('input.native-input');
      const label = container.querySelector('label');
      expect(nativeInput).to.exist;
      expect(label).to.exist;
      expect(nativeInput?.id).to.equal(label?.getAttribute('for'));
      expect((nativeInput as any).value).to.equal('test-val');
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

      const header = el.shadowRoot?.querySelector('.column-header[data-index="0"]');
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

      const header = el.shadowRoot?.querySelector('.column-header[data-index="0"]');
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

      const header = el.shadowRoot?.querySelector('.column-header[data-index="1"]');
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
  });

  describe('enhanced UX and accessibility features', () => {
    it('implements aria-controls on section and column headers linking to panels', async () => {
      const el = await fixture<DeviceTableCardEditor>(html`
        <ha-device-table-card-editor .hass=${mockHass}></ha-device-table-card-editor>
      `);
      el.setConfig(config);
      await el.updateComplete;

      const sectionHeaders = el.shadowRoot?.querySelectorAll('.section-header');
      expect(sectionHeaders).to.have.lengthOf(2);

      // Section 1 controls
      expect(sectionHeaders![0].getAttribute('aria-controls')).to.equal('general-section-content');
      const panel1 = el.shadowRoot?.querySelector('#general-section-content');
      expect(panel1).to.exist;

      // Section 2 controls
      expect(sectionHeaders![1].getAttribute('aria-controls')).to.equal('columns-section-content');
      const panel2 = el.shadowRoot?.querySelector('#columns-section-content');
      expect(panel2).to.exist;

      // Column header controls
      (el as any)._columnsExpanded = true;
      (el as any)._expandedColumnIndex = 0;
      await el.updateComplete;

      const columnHeader = el.shadowRoot?.querySelector('.column-header[data-index="0"]');
      expect(columnHeader?.getAttribute('aria-controls')).to.equal('column-body-0');
      const columnBody = el.shadowRoot?.querySelector('#column-body-0');
      expect(columnBody).to.exist;
    });

    it('hides decorative SVGs from screen readers using aria-hidden', async () => {
      const el = await fixture<DeviceTableCardEditor>(html`
        <ha-device-table-card-editor .hass=${mockHass}></ha-device-table-card-editor>
      `);
      el.setConfig(config);
      (el as any)._columnsExpanded = true;
      (el as any)._expandedColumnIndex = 0;
      await el.updateComplete;

      const svgs = el.shadowRoot?.querySelectorAll('svg');
      expect(svgs).to.exist;
      expect(svgs!.length).to.be.greaterThan(0);

      for (const svg of Array.from(svgs!)) {
        expect(svg.getAttribute('aria-hidden')).to.equal('true');
      }
    });

    it('provides descriptive disabled explanation tooltips/labels on sort buttons', async () => {
      const el = await fixture<DeviceTableCardEditor>(html`
        <ha-device-table-card-editor .hass=${mockHass}></ha-device-table-card-editor>
      `);
      el.setConfig(config);
      (el as any)._columnsExpanded = true;
      await el.updateComplete;

      const columnItems = el.shadowRoot?.querySelectorAll('.column-item');
      expect(columnItems).to.have.lengthOf(2);

      // For first item (index 0): Move Up is disabled, Move Down is enabled
      const firstItemActions = columnItems![0].querySelectorAll('.column-actions .btn-icon');
      expect(firstItemActions).to.have.lengthOf(3);

      const moveUpFirst = firstItemActions[0] as HTMLButtonElement;
      expect(moveUpFirst.disabled).to.be.true;
      expect(moveUpFirst.getAttribute('title')).to.equal('Cannot move up (already at top)');
      expect(moveUpFirst.getAttribute('aria-label')).to.equal('Cannot move up (already at top)');

      const moveDownFirst = firstItemActions[1] as HTMLButtonElement;
      expect(moveDownFirst.disabled).to.be.false;
      expect(moveDownFirst.getAttribute('title')).to.equal('Move Down');
      expect(moveDownFirst.getAttribute('aria-label')).to.equal('Move Down');

      // For last item (index 1): Move Down is disabled, Move Up is enabled
      const lastItemActions = columnItems![1].querySelectorAll('.column-actions .btn-icon');
      const moveUpLast = lastItemActions[0] as HTMLButtonElement;
      expect(moveUpLast.disabled).to.be.false;
      expect(moveUpLast.getAttribute('title')).to.equal('Move Up');
      expect(moveUpLast.getAttribute('aria-label')).to.equal('Move Up');

      const moveDownLast = lastItemActions[1] as HTMLButtonElement;
      expect(moveDownLast.disabled).to.be.true;
      expect(moveDownLast.getAttribute('title')).to.equal('Cannot move down (already at bottom)');
      expect(moveDownLast.getAttribute('aria-label')).to.equal(
        'Cannot move down (already at bottom)',
      );
    });
  });
});
