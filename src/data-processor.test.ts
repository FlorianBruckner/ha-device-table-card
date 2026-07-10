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
      platform: 'zha',
    },
    {
      entity_id: 'sensor.device1_temp',
      device_id: 'device1',
      platform: 'zha',
    },
  ];

  const mockEntitiesByDevice = new Map([['device1', mockEntities]]);

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
      { type: 'device', prop: 'integration', label: 'Integration' },
      { type: 'device', prop: 'manufacturer', label: 'Manufacturer' },
    ],
  };

  it('should process devices correctly', () => {
    const result = processDevices(
      mockHass,
      defaultConfig,
      mockDevices,
      mockEntitiesByDevice,
      mockAreas,
    );
    expect(result).to.have.lengthOf(1);
    expect(result[0].name).to.equal('Test Device 1');
    expect(result[0].area).to.equal('Living Room');
    expect(result[0].integration).to.equal('zha');
    expect(result[0].manufacturer).to.equal('BrandX');
    expect(result[0].col_0).to.equal('Test Device 1');
    expect(result[0].col_1).to.equal('80');
    expect(result[0].col_2).to.be.a('number');
    expect(result[0].col_3).to.equal('zha');
    expect(result[0].col_4).to.equal('BrandX');
  });

  it('should filter by area name', () => {
    const config = { ...defaultConfig, filter: { area: 'Living Room' } };
    const result = processDevices(mockHass, config, mockDevices, mockEntitiesByDevice, mockAreas);
    expect(result).to.have.lengthOf(1);

    const config2 = { ...defaultConfig, filter: { area: 'Kitchen' } };
    const result2 = processDevices(mockHass, config2, mockDevices, mockEntitiesByDevice, mockAreas);
    expect(result2).to.have.lengthOf(0);
  });

  it('should filter by area id', () => {
    const config = { ...defaultConfig, filter: { area: 'living_room' } };
    const result = processDevices(mockHass, config, mockDevices, mockEntitiesByDevice, mockAreas);
    expect(result).to.have.lengthOf(1);
  });

  it('should filter by anchor entity class', () => {
    const config = { ...defaultConfig, filter: { anchor_entity_class: 'moisture' } };
    const result = processDevices(mockHass, config, mockDevices, mockEntitiesByDevice, mockAreas);
    expect(result).to.have.lengthOf(0);

    const config2 = { ...defaultConfig, filter: { anchor_entity_class: 'battery' } };
    const result2 = processDevices(mockHass, config2, mockDevices, mockEntitiesByDevice, mockAreas);
    expect(result2).to.have.lengthOf(1);
  });

  it('should filter by integration', () => {
    const config = { ...defaultConfig, filter: { integration: 'zha' } };
    const result = processDevices(mockHass, config, mockDevices, mockEntitiesByDevice, mockAreas);
    expect(result).to.have.lengthOf(1);

    const config2 = { ...defaultConfig, filter: { integration: 'hue' } };
    const result2 = processDevices(mockHass, config2, mockDevices, mockEntitiesByDevice, mockAreas);
    expect(result2).to.have.lengthOf(0);
  });

  it('should filter by manufacturer', () => {
    const config = { ...defaultConfig, filter: { manufacturer: 'BrandX' } };
    const result = processDevices(mockHass, config, mockDevices, mockEntitiesByDevice, mockAreas);
    expect(result).to.have.lengthOf(1);

    const config2 = { ...defaultConfig, filter: { manufacturer: 'Other' } };
    const result2 = processDevices(mockHass, config2, mockDevices, mockEntitiesByDevice, mockAreas);
    expect(result2).to.have.lengthOf(0);
  });
});
