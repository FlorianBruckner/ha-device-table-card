import { expect, test, describe, beforeEach, vi } from 'vitest';
import './device-table-card';
import { DeviceTableCard } from './device-table-card';
import { DeviceTableCardConfig } from './types';

// Mock DataTables
vi.mock('datatables.net-dt', () => {
  const MockDataTable = function () {
    return {
      destroy: vi.fn(),
      clear: vi.fn().mockReturnThis(),
      rows: {
        add: vi.fn().mockReturnThis(),
      },
      draw: vi.fn(),
    };
  };
  return {
    default: MockDataTable,
  };
});

// Mock custom-card-helpers
vi.mock('custom-card-helpers', () => ({
  fireEvent: vi.fn(),
  navigate: vi.fn(),
}));

describe('DeviceTableCard', () => {
  let element: DeviceTableCard;

  beforeEach(() => {
    element = document.createElement('ha-device-table-card') as DeviceTableCard;
    document.body.appendChild(element);
  });

  test('is defined', () => {
    expect(element).toBeDefined();
    expect(element instanceof DeviceTableCard).toBe(true);
  });

  test('setConfig throws error on invalid config', () => {
    expect(() => element.setConfig(null as any)).toThrow('Invalid configuration');
  });

  test('_processDevices returns empty array when no hass', () => {
    element.setConfig({ type: 'custom:ha-device-table-card' });
    const result = (element as any)._processDevices();
    expect(result).toEqual([]);
  });

  test('_processDevices handles device and entity processing', () => {
    const config: DeviceTableCardConfig = {
      type: 'custom:ha-device-table-card',
      columns: [
        { type: 'device', prop: 'name', label: 'Device Name' },
        { type: 'entity', device_class: 'battery', label: 'Battery' },
      ],
    };
    element.setConfig(config);

    const mockHass = {
      states: {
        'sensor.battery': {
          entity_id: 'sensor.battery',
          state: '80',
          attributes: { device_class: 'battery', unit_of_measurement: '%' },
          last_updated: '2023-01-01T00:00:00Z',
        },
      },
    };

    const mockDevices = [{ id: 'device1', name: 'Test Device', area_id: 'living_room' }];
    const mockEntities = [{ entity_id: 'sensor.battery', device_id: 'device1' }];
    const mockAreas = [{ area_id: 'living_room', name: 'Living Room' }];

    element.hass = mockHass;
    (element as any)._devices = mockDevices;
    (element as any)._entities = mockEntities;
    (element as any)._areas = mockAreas;

    const result = (element as any)._processDevices();

    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Test Device');
    expect(result[0].area).toBe('Living Room');
    expect(result[0].col_0).toBe('Test Device');
    expect(result[0].col_1).toBe('80');
    expect(result[0]._entities.col_1.entity_id).toBe('sensor.battery');
  });

  test('_processDevices filters by area', () => {
    const config: DeviceTableCardConfig = {
      type: 'custom:ha-device-table-card',
      filter: { area: 'Living Room' },
    };
    element.setConfig(config);

    const mockHass = {
      states: { 'sensor.one': { state: 'on', attributes: {}, last_updated: '...' } },
    };
    const mockDevices = [
      { id: 'd1', name: 'D1', area_id: 'living_room' },
      { id: 'd2', name: 'D2', area_id: 'kitchen' },
    ];
    const mockEntities = [
      { entity_id: 'sensor.one', device_id: 'd1' },
      { entity_id: 'sensor.two', device_id: 'd2' },
    ];
    const mockAreas = [
      { area_id: 'living_room', name: 'Living Room' },
      { area_id: 'kitchen', name: 'Kitchen' },
    ];

    element.hass = mockHass;
    (element as any)._devices = mockDevices;
    (element as any)._entities = mockEntities;
    (element as any)._areas = mockAreas;

    const result = (element as any)._processDevices();
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('D1');
  });
});
