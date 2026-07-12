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

  it('deletes columns', async () => {
    const el = await fixture<DeviceTableCardEditor>(html`
      <ha-device-table-card-editor .hass=${mockHass}></ha-device-table-card-editor>
    `);
    el.setConfig(config);
    await el.updateComplete;

    let receivedConfig: DeviceTableCardConfig | null = null;
    el.addEventListener('config-changed', (ev: any) => {
      receivedConfig = ev.detail.config;
    });

    (el as any)._deleteColumn(0);
    expect(receivedConfig).to.not.be.null;
    expect(receivedConfig!.columns).to.have.lengthOf(1);
    expect(receivedConfig!.columns![0].device_class).to.equal('battery');
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

    // Delete Highlight Rule
    el.setConfig(receivedConfig!);
    receivedConfig = null;
    (el as any)._deleteHighlightRule(1, 0);
    expect(receivedConfig).to.not.be.null;
    expect(receivedConfig!.columns![1].highlight).to.have.lengthOf(0);
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
      expect(nativeInput).to.exist;
      expect((nativeInput as any).value).to.equal('test-val');
    } finally {
      customElements.get = originalGet;
    }
  });
});
