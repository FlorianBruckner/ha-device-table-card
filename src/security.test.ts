import { expect, fixture, html } from '@open-wc/testing';
import './device-table-card';
import { DeviceTableCard } from './device-table-card';
import './ha-device-table-card-editor';
import { DeviceTableCardEditor } from './ha-device-table-card-editor';

if (!customElements.get('ha-textfield')) {
  customElements.define('ha-textfield', class extends HTMLElement {});
}
if (!customElements.get('ha-input')) {
  customElements.define('ha-input', class extends HTMLElement {});
}

describe('Security Vulnerabilities', () => {
  describe('ha-device-table-card-editor prototype pollution', () => {
    it('should not allow prototype pollution via configValue', async () => {
      const el = await fixture<DeviceTableCardEditor>(html`
        <ha-device-table-card-editor></ha-device-table-card-editor>
      `);
      el.setConfig({ type: 'custom:ha-device-table-card' } as any);
      el.hass = { states: {} };
      await el.updateComplete;

      let eventFired = false;
      el.addEventListener('config-changed', () => {
        eventFired = true;
      });

      // Simulate malicious input
      const input = document.createElement('ha-textfield') as any;
      input.configValue = '__proto__.polluted';
      input.value = 'true';

      const event = {
        target: input,
      };

      (el as any)._valueChanged(event);

      expect(eventFired).to.be.false;
      expect((Object.prototype as any).polluted).to.be.undefined;
    });
  });

  describe('ha-device-table-card CSS injection', () => {
    it('should sanitize color values to prevent CSS injection', async () => {
      const mockHass = {
        states: {
          'sensor.test': {
            entity_id: 'sensor.test',
            state: '10',
            attributes: {
              device_class: 'battery',
            },
            last_updated: new Date().toISOString(),
          },
        },
        callWS: async (msg: any) => {
          if (msg.type === 'config/device_registry/list') return [{ id: 'dev1', name: 'Device 1' }];
          if (msg.type === 'config/entity_registry/list')
            return [{ entity_id: 'sensor.test', device_id: 'dev1' }];
          if (msg.type === 'config/area_registry/list') return [];
          return [];
        },
        connection: {
          subscribeEvents: () => Promise.resolve(() => {}),
        },
      };

      const config = {
        type: 'custom:ha-device-table-card',
        columns: [
          {
            type: 'entity',
            device_class: 'battery',
            highlight: [
              {
                below: 20,
                color:
                  'red; display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: blue; z-index: 9999;',
              },
            ],
          },
        ],
      };

      const el = await fixture<DeviceTableCard>(html`
        <ha-device-table-card .hass=${mockHass}></ha-device-table-card>
      `);
      el.setConfig(config as any);
      await el.updateComplete;

      // Wait for DataTables
      await new Promise((resolve) => setTimeout(resolve, 500));

      const span = el.shadowRoot?.querySelector('tbody span') as HTMLElement;
      expect(span).to.exist;

      // Check individual style properties
      // Browsers normalize the style attribute, so we check if the injected properties are applied
      expect(span.style.position).to.not.equal('fixed');
      expect(span.style.zIndex).to.not.equal('9999');
      expect(span.style.display).to.not.equal('block');
    });
  });

  describe('ha-device-table-card color sanitization hardening', () => {
    it('should block url() and expression() function calls in colors', async () => {
      const mockHass = {
        states: {
          'sensor.test': {
            entity_id: 'sensor.test',
            state: '10',
            attributes: {
              device_class: 'battery',
            },
            last_updated: new Date().toISOString(),
          },
        },
        callWS: async (msg: any) => {
          if (msg.type === 'config/device_registry/list') return [{ id: 'dev1', name: 'Device 1' }];
          if (msg.type === 'config/entity_registry/list')
            return [{ entity_id: 'sensor.test', device_id: 'dev1' }];
          if (msg.type === 'config/area_registry/list') return [];
          return [];
        },
        connection: {
          subscribeEvents: () => Promise.resolve(() => {}),
        },
      };

      const config = {
        type: 'custom:ha-device-table-card',
        columns: [
          {
            type: 'entity',
            device_class: 'battery',
            highlight: [
              {
                below: 20,
                color: 'url("https://malicious.site/xss.css")',
              },
            ],
          },
        ],
      };

      const el = await fixture<DeviceTableCard>(html`
        <ha-device-table-card .hass=${mockHass}></ha-device-table-card>
      `);
      el.setConfig(config as any);
      await el.updateComplete;

      // Wait for DataTables
      await new Promise((resolve) => setTimeout(resolve, 500));

      const span = el.shadowRoot?.querySelector('tbody span') as HTMLElement;
      expect(span).to.exist;

      // The color should have been sanitized to empty string or at least not contain url(
      expect(span.style.color).to.be.oneOf(['', 'initial', 'inherit']);
    });
  });

  describe('ha-device-table-card DataTables search integrity', () => {
    it('should not match HTML tags when searching/filtering', async () => {
      const mockHass = {
        states: {
          'sensor.test': {
            entity_id: 'sensor.test',
            state: '10',
            attributes: {
              device_class: 'battery',
            },
            last_updated: new Date().toISOString(),
          },
        },
        callWS: async (msg: any) => {
          if (msg.type === 'config/device_registry/list') return [{ id: 'dev1', name: 'Device 1' }];
          if (msg.type === 'config/entity_registry/list')
            return [{ entity_id: 'sensor.test', device_id: 'dev1' }];
          if (msg.type === 'config/area_registry/list') return [];
          return [];
        },
        connection: {
          subscribeEvents: () => Promise.resolve(() => {}),
        },
      };

      const config = {
        type: 'custom:ha-device-table-card',
        columns: [
          {
            type: 'entity',
            device_class: 'battery',
            highlight: [{ below: 20, color: 'red' }],
          },
        ],
      };

      const el = await fixture<DeviceTableCard>(html`
        <ha-device-table-card .hass=${mockHass}></ha-device-table-card>
      `);
      el.setConfig(config as any);
      await el.updateComplete;

      // Wait for DataTables to initialize
      await new Promise((resolve) => setTimeout(resolve, 500));

      const dataTable = (el as any)._dataTable;
      expect(dataTable).to.exist;

      // The state is '10', highlight is 'below: 20', so it will have <span style="...">10</span>
      // Search for 'span' - should NOT find anything if we're only searching raw data
      dataTable.search('span').draw();
      expect(dataTable.rows({ filter: 'applied' }).count()).to.equal(0);

      // Search for '10' - should find the row
      dataTable.search('10').draw();
      expect(dataTable.rows({ filter: 'applied' }).count()).to.equal(1);
    });
  });
});
