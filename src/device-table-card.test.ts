import { expect, fixture, html } from '@open-wc/testing';
import './device-table-card';
import { DeviceTableCard } from './device-table-card';
import { DeviceTableCardConfig } from './types';

describe('ha-device-table-card', () => {
  const mockHass = {
    states: {
      'sensor.test': {
        entity_id: 'sensor.test',
        state: 'on',
        attributes: { friendly_name: 'Test Sensor' },
        last_updated: new Date().toISOString(),
      },
    },
    callWS: async (msg: any) => {
      if (msg.type === 'config/device_registry/list')
        return [{ id: 'dev1', name: 'Device 1', area_id: 'area1' }];
      if (msg.type === 'config/entity_registry/list')
        return [{ entity_id: 'sensor.test', device_id: 'dev1' }];
      if (msg.type === 'config/area_registry/list') return [{ area_id: 'area1', name: 'Area 1' }];
      return [];
    },
    connection: {
      subscribeEvents: () => Promise.resolve(() => {}),
    },
  };

  const config: DeviceTableCardConfig = {
    type: 'custom:ha-device-table-card',
    title: 'Test Table',
    columns: [{ type: 'device', prop: 'name', label: 'Device Name' }],
  };

  it('renders the card with title', async () => {
    const el = await fixture<DeviceTableCard>(html`
      <ha-device-table-card .hass=${mockHass}></ha-device-table-card>
    `);
    el.setConfig(config);
    await el.updateComplete;
    // Wait for another tick for Lit to finish internal updates
    await new Promise((resolve) => setTimeout(resolve, 0));

    const card = el.shadowRoot?.querySelector('ha-card') as any;
    expect(card).to.exist;
    expect(card?.header).to.equal('Test Table');
  });

  it('renders the table skeleton', async () => {
    const el = await fixture<DeviceTableCard>(html`
      <ha-device-table-card .hass=${mockHass}></ha-device-table-card>
    `);
    el.setConfig(config);
    await el.updateComplete;

    const table = el.shadowRoot?.querySelector('table#deviceTable');
    expect(table).to.exist;
  });
});
