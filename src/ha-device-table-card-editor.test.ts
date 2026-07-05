import { expect, fixture, html } from '@open-wc/testing';
import './ha-device-table-card-editor';
import { DeviceTableCardEditor } from './ha-device-table-card-editor';
import { DeviceTableCardConfig } from './types';

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
  };

  it('renders the editor with integration and manufacturer fields', async () => {
    const el = await fixture<DeviceTableCardEditor>(html`
      <ha-device-table-card-editor .hass=${mockHass}></ha-device-table-card-editor>
    `);
    el.setConfig(config);
    await el.updateComplete;

    const textfields = el.shadowRoot?.querySelectorAll('ha-textfield');
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
});
