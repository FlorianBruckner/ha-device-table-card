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

  it('has correct title attributes on cells and headers', async () => {
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
    expect(cells[2].title).to.contain('Last updated: ');

    // Verify headers have descriptive title attribute matching their text and sorting state
    const headers = el.shadowRoot?.querySelectorAll('table.dataTable thead th');
    expect(headers?.length).to.be.greaterThan(0);
    expect(headers![0].getAttribute('title')).to.equal(
      'Device - sorted ascending, click to sort descending',
    );
    expect(headers![1].getAttribute('title')).to.equal('Battery - click to sort ascending');
    expect(headers![2].getAttribute('title')).to.equal('Last Seen - click to sort ascending');
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
    expect(searchInput?.getAttribute('placeholder')).to.equal('Search devices... (Press /)');
    expect(searchInput?.getAttribute('type')).to.equal('search');

    const lengthSelect = el.shadowRoot?.querySelector(
      '.dt-length select, .dataTables_wrapper .dataTables_length select',
    );
    expect(lengthSelect).to.exist;
    expect(lengthSelect?.getAttribute('aria-label')).to.equal('Items per page');
  });

  it('has correct domain-specific language for empty states', async () => {
    const config: DeviceTableCardConfig = {
      type: 'custom:ha-device-table-card',
      title: 'UX Test',
      columns: [{ type: 'device', prop: 'name', label: 'Device' }],
    };

    const emptyHass = {
      ...mockHass,
      callWS: async (msg: any) => {
        if (msg.type === 'config/device_registry/list') return [];
        if (msg.type === 'config/entity_registry/list') return [];
        if (msg.type === 'config/area_registry/list') return [];
        return [];
      },
    };

    const el = await fixture<DeviceTableCard>(html`
      <ha-device-table-card .hass=${emptyHass}></ha-device-table-card>
    `);
    el.setConfig(config);
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 200));

    const emptyMsg = el.shadowRoot?.querySelector('.dt-empty');
    expect(emptyMsg?.textContent).to.equal('No devices available');
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
    expect(cells[0].getAttribute('aria-label')).to.equal('Navigate to Device 1 details');

    // Column 1: Battery Entity
    expect(cells[1].tabIndex).to.equal(0);
    expect(cells[1].getAttribute('role')).to.equal('button');
    expect(cells[1].getAttribute('aria-label')).to.equal('View sensor.battery details');
  });

  it('shows tooltips for threshold highlights', async () => {
    const config: DeviceTableCardConfig = {
      type: 'custom:ha-device-table-card',
      title: 'UX Test',
      columns: [
        {
          type: 'entity',
          device_class: 'battery',
          label: 'Battery',
          highlight: [{ below: 90, color: 'red' }],
        },
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

    const span = cells[0].querySelector('span');
    expect(span).to.exist;
    expect(span?.getAttribute('title')).to.equal('Value is below threshold: 90%');
  });

  it('renders and operates search clear button correctly', async () => {
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

    const searchInput = el.shadowRoot?.querySelector(
      '.dt-search input, .dataTables_filter input',
    ) as HTMLInputElement;
    expect(searchInput).to.exist;

    const clearBtn = el.shadowRoot?.querySelector('.dt-search-clear') as HTMLButtonElement;
    expect(clearBtn).to.exist;
    expect(clearBtn.getAttribute('aria-label')).to.equal('Clear search');
    expect(clearBtn.style.display).to.equal('none');

    // Simulate typing
    searchInput.value = 'Device 1';
    searchInput.dispatchEvent(new Event('input'));
    expect(clearBtn.style.display).to.equal('flex');

    // Click clear button
    clearBtn.click();
    expect(searchInput.value).to.equal('');
    expect(clearBtn.style.display).to.equal('none');
    expect(el.shadowRoot?.activeElement).to.equal(searchInput);

    // Press Escape key when input is empty to blur search input
    searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(el.shadowRoot?.activeElement).to.not.equal(searchInput);
  });

  it('focuses search input when / keyboard shortcut is pressed while hovering', async () => {
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

    const searchInput = el.shadowRoot?.querySelector(
      '.dt-search input, .dataTables_filter input',
    ) as HTMLInputElement;
    expect(searchInput).to.exist;
    expect(el.shadowRoot?.activeElement).to.not.equal(searchInput);

    // Mock matches(':hover') to return true
    const originalMatches = el.matches;
    el.matches = (selector: string) => {
      if (selector === ':hover') return true;
      return originalMatches.call(el, selector);
    };

    // Trigger keydown with '/' key on window
    const event = new KeyboardEvent('keydown', { key: '/' });
    window.dispatchEvent(event);

    expect(el.shadowRoot?.activeElement).to.equal(searchInput);

    // Clean up mock
    el.matches = originalMatches;
  });

  it('has correct sorting header states and pagination accessibility labels', async () => {
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

    const headers = el.shadowRoot?.querySelectorAll('table.dataTable thead th');
    expect(headers?.length).to.be.greaterThan(0);

    const firstHeader = headers![0];
    const cleanText = 'Device';
    if (firstHeader.classList.contains('dt-ordering-asc')) {
      expect(firstHeader.getAttribute('title')).to.equal(
        `${cleanText} - sorted ascending, click to sort descending`,
      );
      expect(firstHeader.getAttribute('aria-label')).to.equal(
        `${cleanText} - sorted ascending, click to sort descending`,
      );
    } else {
      expect(firstHeader.getAttribute('title')).to.contain(cleanText);
    }

    const pagingButtons = el.shadowRoot?.querySelectorAll(
      '.dt-paging-button, .dataTables_wrapper .dataTables_paginate .paginate_button',
    );
    pagingButtons?.forEach((btn) => {
      const text = (btn.textContent || '').trim();
      const isCurrent = btn.classList.contains('current');
      const isDisabled = btn.classList.contains('disabled');
      if (text === '1') {
        expect(btn.getAttribute('aria-label')).to.equal(
          isCurrent ? 'Page 1 (current page)' : 'Page 1',
        );
        expect(btn.getAttribute('title')).to.equal(isCurrent ? 'Page 1 (current page)' : 'Page 1');
      }
      if (isDisabled) {
        expect(btn.getAttribute('aria-disabled')).to.equal('true');
        expect(btn.getAttribute('aria-label')).to.contain('(disabled)');
      }
    });
  });
});
