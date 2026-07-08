import { expect, fixture, html } from '@open-wc/testing';
import './device-table-card';
import { DeviceTableCard } from './device-table-card';
import { DeviceTableCardConfig } from './types';

describe('ha-device-table-card UX', () => {
  const mockHass = {
    states: {
      'sensor.battery': {
        entity_id: 'sensor.battery',
        state: '80',
        attributes: {
          device_class: 'battery',
          unit_of_measurement: '%',
        },
        last_updated: new Date().toISOString(),
      },
    },
    callWS: async (msg: any) => {
      if (msg.type === 'config/device_registry/list')
        return [{ id: 'dev1', name: 'Device 1', area_id: 'area1' }];
      if (msg.type === 'config/entity_registry/list')
        return [{ entity_id: 'sensor.battery', device_id: 'dev1' }];
      if (msg.type === 'config/area_registry/list') return [{ area_id: 'area1', name: 'Area 1' }];
      return [];
    },
    connection: {
      subscribeEvents: () => Promise.resolve(() => {}),
    },
  };

  it('has correct title attributes on cells', async () => {
    const config: DeviceTableCardConfig = {
      type: 'custom:ha-device-table-card',
      title: 'UX Test',
      columns: [
        { type: 'device', prop: 'name', label: 'Device' },
        { type: 'entity', device_class: 'battery', label: 'Battery' },
        { type: 'meta', prop: 'last_changed', label: 'Last Seen' },
      ],
    };

    const el = await fixture<DeviceTableCard>(html`
      <ha-device-table-card .hass=${mockHass}></ha-device-table-card>
    `);
    el.setConfig(config);
    await el.updateComplete;
    // DataTables async init
    await new Promise((resolve) => setTimeout(resolve, 200));

    const rows = el.shadowRoot?.querySelectorAll('tbody tr');
    expect(rows?.length).to.be.greaterThan(0);

    const cells = rows![0].querySelectorAll('td');

    // Column 0: Device Name
    expect(cells[0].title).to.equal('Navigate to Device 1 details');

    // Column 1: Battery Entity
    expect(cells[1].title).to.equal('View sensor.battery details');

    // Column 2: Last Seen Meta
    expect(cells[2].title).to.not.be.empty;
  });

  it('has correct search accessibility attributes', async () => {
    const config: DeviceTableCardConfig = {
      type: 'custom:ha-device-table-card',
      title: 'UX Test',
      columns: [{ type: 'device', prop: 'name', label: 'Device' }],
    };

    const el = await fixture<DeviceTableCard>(html`
      <ha-device-table-card .hass=${mockHass}></ha-device-table-card>
    `);
    el.setConfig(config);
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 200));

    const searchInput = el.shadowRoot?.querySelector('.dt-search input, .dataTables_filter input');
    expect(searchInput).to.exist;
    expect(searchInput?.getAttribute('aria-label')).to.equal('Search devices');
    expect(searchInput?.getAttribute('placeholder')).to.equal('Search devices...');
    expect(searchInput?.getAttribute('type')).to.equal('search');

    const lengthSelect = el.shadowRoot?.querySelector(
      '.dt-length select, .dataTables_wrapper .dataTables_length select',
    );
    expect(lengthSelect).to.exist;
    expect(lengthSelect?.getAttribute('aria-label')).to.equal('Items per page');
  });

  it('has correct keyboard accessibility attributes on interactive cells', async () => {
    const config: DeviceTableCardConfig = {
      type: 'custom:ha-device-table-card',
      title: 'UX Test',
      columns: [
        { type: 'device', prop: 'name', label: 'Device' },
        { type: 'entity', device_class: 'battery', label: 'Battery' },
      ],
    };

    const el = await fixture<DeviceTableCard>(html`
      <ha-device-table-card .hass=${mockHass}></ha-device-table-card>
    `);
    el.setConfig(config);
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 200));

    const rows = el.shadowRoot?.querySelectorAll('tbody tr');
    const cells = rows![0].querySelectorAll('td');

    // Column 0: Device Name
    expect(cells[0].tabIndex).to.equal(0);
    expect(cells[0].getAttribute('role')).to.equal('button');

    // Column 1: Battery Entity
    expect(cells[1].tabIndex).to.equal(0);
    expect(cells[1].getAttribute('role')).to.equal('button');
  });

  it('has custom empty state language strings', async () => {
    const mockHassEmpty = {
      ...mockHass,
      callWS: async (msg: any) => {
        if (msg.type === 'config/device_registry/list') return [];
        return [];
      },
    };

    const config: DeviceTableCardConfig = {
      type: 'custom:ha-device-table-card',
      title: 'Empty Test',
      columns: [{ type: 'device', prop: 'name', label: 'Device' }],
    };

    const el = await fixture<DeviceTableCard>(html`
      <ha-device-table-card .hass=${mockHassEmpty}></ha-device-table-card>
    `);
    el.setConfig(config);
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 200));

    const emptyCell = el.shadowRoot?.querySelector('.dt-empty');
    expect(emptyCell).to.exist;
    expect(emptyCell?.textContent).to.equal('No devices available');
  });
});
