import { expect, fixture, html } from '@open-wc/testing';
import sinon from 'sinon';
import './ha-device-table-card-editor';
import './device-table-card';
import { DeviceTableCardEditor } from './ha-device-table-card-editor';
import { DeviceTableCard } from './device-table-card';
import { DeviceTableCardConfig } from './types';

describe('Security Fixes', () => {
  describe('ha-device-table-card-editor prototype pollution', () => {
    const mockHass = {
      states: {},
    };

    const config: DeviceTableCardConfig = {
      type: 'custom:ha-device-table-card',
      title: 'Test Table',
    };

    it('blocks configuration updates with __proto__ key', async () => {
      const el = await fixture<DeviceTableCardEditor>(html`
        <ha-device-table-card-editor .hass=${mockHass}></ha-device-table-card-editor>
      `);
      el.setConfig(config);
      await el.updateComplete;

      const fireEventSpy = sinon.spy();
      el.addEventListener('config-changed', fireEventSpy);

      // Simulate a malicious input
      const event = {
        target: {
          value: 'malicious',
          configValue: '__proto__.polluted',
        },
      };
      (el as any)._valueChanged(event);

      expect(fireEventSpy.called).to.be.false;
    });

    it('blocks configuration updates with constructor key', async () => {
        const el = await fixture<DeviceTableCardEditor>(html`
          <ha-device-table-card-editor .hass=${mockHass}></ha-device-table-card-editor>
        `);
        el.setConfig(config);
        await el.updateComplete;

        const fireEventSpy = sinon.spy();
        el.addEventListener('config-changed', fireEventSpy);

        const event = {
          target: {
            value: 'malicious',
            configValue: 'constructor.polluted',
          },
        };
        (el as any)._valueChanged(event);

        expect(fireEventSpy.called).to.be.false;
      });
  });

  describe('device-table-card CSS injection', () => {
    const mockHass = {
      states: {
        'sensor.battery': {
          entity_id: 'sensor.battery',
          state: '10',
          attributes: {
              device_class: 'battery',
              unit_of_measurement: '%'
          },
          last_updated: new Date().toISOString(),
        },
      },
      callWS: async (msg: any) => {
        if (msg.type === 'config/device_registry/list')
          return [{ id: 'dev1', name: 'Device 1', area_id: 'area1' }];
        if (msg.type === 'config/entity_registry/list')
          return [{ entity_id: 'sensor.battery', device_id: 'dev1', device_class: 'battery' }];
        if (msg.type === 'config/area_registry/list') return [{ area_id: 'area1', name: 'Area 1' }];
        return [];
      },
      connection: {
        subscribeEvents: () => Promise.resolve(() => {}),
      },
    };

    it('sanitizes malicious CSS in highlight color', async () => {
      const config: DeviceTableCardConfig = {
        type: 'custom:ha-device-table-card',
        columns: [
          {
              type: 'entity',
              device_class: 'battery',
              label: 'Battery',
              highlight: [
                  { below: 20, color: 'red; background: url("http://malicious.com")' }
              ]
          }
        ],
      };

      const el = await fixture<DeviceTableCard>(html`
        <ha-device-table-card .hass=${mockHass}></ha-device-table-card>
      `);
      el.setConfig(config);
      await el.updateComplete;

      await new Promise(resolve => setTimeout(resolve, 200));

      const span = el.shadowRoot?.querySelector('span[style*="color"]');
      expect(span).to.exist;
      const style = span?.getAttribute('style') || '';
      // The color value itself should be sanitized (no ';' or ':')
      // Note: ':' is removed so 'http://' becomes 'http//'
      expect(style).to.contain('color: red background url(http//malicious.com)');
      expect(style).to.not.contain('background:');
      // The overall style string WILL contain ';' because of the template 'font-weight: bold;'
      expect(style).to.contain('font-weight: bold;');
    });

    it('allows valid CSS variables', async () => {
        const config: DeviceTableCardConfig = {
          type: 'custom:ha-device-table-card',
          columns: [
            {
                type: 'entity',
                device_class: 'battery',
                label: 'Battery',
                highlight: [
                    { below: 20, color: 'var(--error-color)' }
                ]
            }
          ],
        };

        const el = await fixture<DeviceTableCard>(html`
          <ha-device-table-card .hass=${mockHass}></ha-device-table-card>
        `);
        el.setConfig(config);
        await el.updateComplete;

        await new Promise(resolve => setTimeout(resolve, 200));

        const span = el.shadowRoot?.querySelector('span[style*="color"]');
        expect(span).to.exist;
        const style = span?.getAttribute('style') || '';
        expect(style).to.contain('color: var(--error-color)');
      });

      it('allows valid rgba colors', async () => {
        const config: DeviceTableCardConfig = {
          type: 'custom:ha-device-table-card',
          columns: [
            {
                type: 'entity',
                device_class: 'battery',
                label: 'Battery',
                highlight: [
                    { below: 20, color: 'rgba(255, 0, 0, 0.5)' }
                ]
            }
          ],
        };

        const el = await fixture<DeviceTableCard>(html`
          <ha-device-table-card .hass=${mockHass}></ha-device-table-card>
        `);
        el.setConfig(config);
        await el.updateComplete;

        await new Promise(resolve => setTimeout(resolve, 200));

        const span = el.shadowRoot?.querySelector('span[style*="color"]');
        expect(span).to.exist;
        const style = span?.getAttribute('style') || '';
        expect(style).to.contain('color: rgba(255, 0, 0, 0.5)');
      });
  });
});
