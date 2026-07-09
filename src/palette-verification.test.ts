import { expect, fixture, html } from '@open-wc/testing';
import './device-table-card';
import './ha-device-table-card-editor';
import { DeviceTableCard } from './device-table-card';
import { DeviceTableCardEditor } from './ha-device-table-card-editor';
import { DeviceTableCardConfig } from './types';

describe('Palette UX Verification', () => {
  const mockHass = {
    states: {},
    callWS: async (msg: any) => {
      if (msg.type === 'config/device_registry/list') return [];
      if (msg.type === 'config/entity_registry/list') return [];
      if (msg.type === 'config/area_registry/list') return [];
      return [];
    },
    connection: {
      subscribeEvents: () => Promise.resolve(() => {}),
    },
  };

  it('verifies DataTables empty state localization', async () => {
    const config: DeviceTableCardConfig = {
      type: 'custom:ha-device-table-card',
      title: 'Empty Test',
      columns: [{ type: 'device', prop: 'name', label: 'Device' }],
    };

    const el = await fixture<DeviceTableCard>(html`
      <ha-device-table-card .hass=${mockHass}></ha-device-table-card>
    `);
    el.setConfig(config);
    await el.updateComplete;
    // DataTables async init
    await new Promise((resolve) => setTimeout(resolve, 500));

    const emptyCell = el.shadowRoot?.querySelector('.dataTables_empty, .dt-empty');
    expect(emptyCell).to.exist;
    expect(emptyCell?.textContent).to.equal('No devices available');
  });

  it('verifies configuration editor has expected styles', async () => {
    const config: DeviceTableCardConfig = {
      type: 'custom:ha-device-table-card',
      title: 'Editor Test',
    };

    const el = await fixture<DeviceTableCardEditor>(html`
      <ha-device-table-card-editor .hass=${mockHass}></ha-device-table-card-editor>
    `);
    el.setConfig(config);
    await el.updateComplete;

    const container = el.shadowRoot?.querySelector('.card-config');
    expect(container).to.exist;
    const computedStyle = window.getComputedStyle(container!);
    expect(computedStyle.display).to.equal('flex');
    expect(computedStyle.flexDirection).to.equal('column');
    expect(computedStyle.gap).to.equal('16px');
  });
});
