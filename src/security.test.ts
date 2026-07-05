import { expect, fixture, html } from '@open-wc/testing';
import './device-table-card';
import { DeviceTableCard } from './device-table-card';
import { DeviceTableCardConfig } from './types';

describe('ha-device-table-card security', () => {
  const mockHass = {
    states: {
      'sensor.test': {
        entity_id: 'sensor.test',
        state: '25',
        attributes: {
          friendly_name: 'Test Sensor',
          device_class: 'temperature',
          unit_of_measurement: '°C',
        },
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

  it('sanitizes malicious color values to prevent CSS injection', async () => {
    const el = await fixture<DeviceTableCard>(html`
      <ha-device-table-card .hass=${mockHass}></ha-device-table-card>
    `);

    const config: DeviceTableCardConfig = {
      type: 'custom:ha-device-table-card',
      columns: [
        {
          type: 'entity',
          device_class: 'temperature',
          label: 'Temp',
          highlight: [
            {
              above: 20,
              color:
                'red; display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: black; z-index: 9999;',
            },
          ],
        },
      ],
    };

    el.setConfig(config);
    await el.updateComplete;
    // Wait for debounce and DataTables update
    await new Promise((resolve) => setTimeout(resolve, 200));

    const columns = (el as any)._getColumns();
    const renderFn = columns[0].render;
    const rowData = {
      col_0: '25',
      _entities: {
        col_0: mockHass.states['sensor.test'],
      },
    };

    const rendered = renderFn('25', 'display', rowData);

    // It should not contain the injected CSS
    expect(rendered).to.not.contain('display: block');
    expect(rendered).to.not.contain('position: fixed');
  });

  it('escapes HTML special characters in display data', async () => {
    const el = await fixture<DeviceTableCard>(html`
      <ha-device-table-card .hass=${mockHass}></ha-device-table-card>
    `);

    const config: DeviceTableCardConfig = {
      type: 'custom:ha-device-table-card',
      columns: [{ type: 'device', prop: 'name', label: 'Name' }],
    };

    el.setConfig(config);
    await el.updateComplete;

    const columns = (el as any)._getColumns();
    const renderFn = columns[0].render;

    const maliciousName = '<img src=x onerror=alert(1)>';
    const rendered = renderFn(maliciousName, 'display', {});

    expect(rendered).to.not.contain('<img');
    expect(rendered).to.contain('&lt;img');
  });
});
