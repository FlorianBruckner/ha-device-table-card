
import { processDevices } from './src/data-processor';
import { DeviceTableCardConfig } from './src/types';

const devices = [];
for (let i = 0; i < 1000; i++) {
  devices.push({
    id: `device_${i}`,
    name: `Device ${i}`,
    manufacturer: i % 2 === 0 ? 'Manufacturer A' : 'Manufacturer B',
    area_id: `area_${i % 10}`,
  });
}

const states: Record<string, any> = {};
const entitiesByDevice = new Map<string, any[]>();
for (let i = 0; i < 1000; i++) {
  const entities = [];
  for (let j = 0; j < 5; j++) {
    const entity_id = `sensor.device_${i}_${j}`;
    entities.push({
      entity_id,
      device_id: `device_${i}`,
      platform: 'mqtt',
      device_class: j === 0 ? 'temperature' : j === 1 ? 'humidity' : undefined,
    });
    states[entity_id] = {
      entity_id,
      state: (Math.random() * 100).toFixed(1),
      attributes: {
        unit_of_measurement: j === 0 ? '°C' : j === 1 ? '%' : undefined,
        device_class: j === 0 ? 'temperature' : j === 1 ? 'humidity' : undefined,
      },
      last_updated: new Date().toISOString(),
    };
  }
  entitiesByDevice.set(`device_${i}`, entities);
}

const areaLookup: Record<string, string> = {};
for (let i = 0; i < 10; i++) {
  areaLookup[`area_${i}`] = `Area ${i}`;
}

const config: DeviceTableCardConfig = {
  type: 'custom:ha-device-table-card',
  columns: [
    { type: 'device', prop: 'name', label: 'Name' },
    { type: 'device', prop: 'area', label: 'Area' },
    { type: 'entity', device_class: 'temperature', label: 'Temp', highlight: [{ below: 10, color: 'blue' }, { above: 30, color: 'red' }] },
    { type: 'entity', device_class: 'humidity', label: 'Humidity' },
    { type: 'meta', prop: 'last_changed', label: 'Updated' },
  ],
};

const hass = { states };

function benchmark() {
  const start = performance.now();
  for (let i = 0; i < 100; i++) {
    processDevices(hass, config, devices, entitiesByDevice, areaLookup);
  }
  const end = performance.now();
  console.log(`processDevices average time: ${((end - start) / 100).toFixed(4)}ms`);
}

benchmark();
