import { expect } from '@open-wc/testing';
import { processDevices } from './data-processor';
import { DeviceTableCardConfig } from './types';

describe('data-processor', () => {
  const mockHass = {
    states: {
      'sensor.device1_battery': {
        entity_id: 'sensor.device1_battery',
        state: '80',
        attributes: { device_class: 'battery', unit_of_measurement: '%' },
        last_updated: '2023-01-01T00:00:00Z',
      },
      'sensor.device1_temp': {
        entity_id: 'sensor.device1_temp',
        state: '22',
        attributes: { device_class: 'temperature', unit_of_measurement: '°C' },
        last_updated: '2023-01-01T00:05:00Z',
      },
    },
  };

  const mockDevices = [
    {
      id: 'device1',
      name: 'Test Device 1',
      area_id: 'living_room',
      manufacturer: 'BrandX',
    },
  ];

  const mockEntities = [
    {
      entity_id: 'sensor.device1_battery',
      device_id: 'device1',
    },
    {
      entity_id: 'sensor.device1_temp',
      device_id: 'device1',
    },
  ];

  const mockAreas = [
    {
      area_id: 'living_room',
      name: 'Living Room',
    },
  ];

  const defaultConfig: DeviceTableCardConfig = {
    type: 'custom:ha-device-table-card',
    columns: [
      { type: 'device', prop: 'name', label: 'Name' },
      { type: 'entity', device_class: 'battery', label: 'Battery' },
      { type: 'meta', prop: 'last_changed', label: 'Last Seen' },
    ],
  };

  it('should process devices correctly', () => {
    const result = processDevices(mockHass, defaultConfig, mockDevices, mockEntities, mockAreas);
    expect(result).to.have.lengthOf(1);
    expect(result[0].name).to.equal('Test Device 1');
    expect(result[0].area).to.equal('Living Room');
    expect(result[0].col_0).to.equal('Test Device 1');
    expect(result[0].col_1).to.equal('80');
    expect(result[0].col_2).to.be.a('number');
  });

  it('should filter by area', () => {
    const config = { ...defaultConfig, filter: { area: 'Kitchen' } };
    const result = processDevices(mockHass, config, mockDevices, mockEntities, mockAreas);
    expect(result).to.have.lengthOf(0);
  });

  it('should filter by anchor entity class', () => {
    const config = { ...defaultConfig, filter: { anchor_entity_class: 'moisture' } };
    const result = processDevices(mockHass, config, mockDevices, mockEntities, mockAreas);
    expect(result).to.have.lengthOf(0);

    const config2 = { ...defaultConfig, filter: { anchor_entity_class: 'battery' } };
    const result2 = processDevices(mockHass, config2, mockDevices, mockEntities, mockAreas);
    expect(result2).to.have.lengthOf(1);
  });
});
