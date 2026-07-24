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

    it('should block all dangerous or resource-loading CSS functions directly via _sanitizeColor', async () => {
      const el = await fixture<DeviceTableCard>(html`
        <ha-device-table-card></ha-device-table-card>
      `);

      // Blocked functions
      expect((el as any)._sanitizeColor('url("https://example.com/image.png")')).to.equal('');
      expect((el as any)._sanitizeColor('expression(alert(1))')).to.equal('');
      expect((el as any)._sanitizeColor('image("https://example.com/image.png")')).to.equal('');
      expect((el as any)._sanitizeColor('image-set("a.png" 1x, "b.png" 2x)')).to.equal('');
      expect((el as any)._sanitizeColor('-webkit-image-set("a.png" 1x)')).to.equal('');
      expect((el as any)._sanitizeColor('-moz-image-set("a.png" 1x)')).to.equal('');
      expect((el as any)._sanitizeColor('element(#myid)')).to.equal('');
      expect((el as any)._sanitizeColor('paint(my-painter)')).to.equal('');
      expect((el as any)._sanitizeColor('cross-fade(20% url("a.png"), url("b.png"))')).to.equal('');

      // Allowed safe colors and color functions
      expect((el as any)._sanitizeColor('red')).to.equal('red');
      expect((el as any)._sanitizeColor('#ff0000')).to.equal('#ff0000');
      expect((el as any)._sanitizeColor('rgb(255, 0, 0)')).to.equal('rgb(255, 0, 0)');
      expect((el as any)._sanitizeColor('rgba(255, 0, 0, 0.5)')).to.equal('rgba(255, 0, 0, 0.5)');
      expect((el as any)._sanitizeColor('hsl(120, 100, 50)')).to.equal('hsl(120, 100, 50)');
      expect((el as any)._sanitizeColor('var(--my-color)')).to.equal('var(--my-color)');
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

  describe('ha-device-table-card additional hardening and robustness', () => {
    it('should deep sanitize incoming config in setConfig to prevent prototype pollution', async () => {
      const el = await fixture<DeviceTableCard>(html`
        <ha-device-table-card></ha-device-table-card>
      `);

      const maliciousConfig = JSON.parse(
        '{"type":"custom:ha-device-table-card","columns":[],"__proto__":{"polluted":true},"columns_item":{"__proto__":{"inner":true}}}',
      );

      el.setConfig(maliciousConfig);

      expect((Object.prototype as any).polluted).to.be.undefined;
      expect((Object.prototype as any).inner).to.be.undefined;
      expect((el as any)._config.__proto__.polluted).to.be.undefined;
    });

    it('should safely handle non-string values passed to _sanitizeColor', async () => {
      const el = await fixture<DeviceTableCard>(html`
        <ha-device-table-card></ha-device-table-card>
      `);

      expect((el as any)._sanitizeColor(null)).to.equal('');
      expect((el as any)._sanitizeColor(undefined)).to.equal('');
      expect((el as any)._sanitizeColor({} as any)).to.equal('');
      expect((el as any)._sanitizeColor([] as any)).to.equal('');
      expect((el as any)._sanitizeColor(true as any)).to.equal('');
    });

    it('should prevent prototype pollution in filters and column configs during data processing', async () => {
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

      const pollutedFilterConfig = JSON.parse(
        '{"type":"custom:ha-device-table-card","columns":[{"type":"device","prop":"name","label":"Device"}],"filter":{"__proto__":{"manufacturer":"MaliciousManufacturer"}}}',
      );

      const pollutedColumnsConfig = JSON.parse(
        '{"type":"custom:ha-device-table-card","columns":[{"__proto__":{"type":"entity","device_class":"battery","label":"Battery"}}]}',
      );

      const el = await fixture<DeviceTableCard>(html`
        <ha-device-table-card .hass=${mockHass}></ha-device-table-card>
      `);

      // 1. Verify polluted filter has no effect
      el.setConfig(pollutedFilterConfig);
      await el.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect((el as any)._config.filter.manufacturer).to.be.undefined;

      // 2. Verify polluted column has no effect
      el.setConfig(pollutedColumnsConfig);
      await el.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect((el as any)._config.columns[0].type).to.be.undefined;
    });

    it('should be resilient to malformed highlight configurations', async () => {
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
            highlight: [null, undefined, {}, { below: 20, color: 'red' }] as any,
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

      const span = el.shadowRoot?.querySelector('tbody span') as HTMLElement;
      expect(span).to.exist;
      expect(span.style.color).to.equal('red');
    });
  });

  describe('ha-device-table-card-editor deep sanitization', () => {
    it('should deep sanitize incoming config in setConfig to prevent prototype pollution in editor', async () => {
      const el = await fixture<DeviceTableCardEditor>(html`
        <ha-device-table-card-editor></ha-device-table-card-editor>
      `);

      const maliciousConfig = JSON.parse(
        '{"type":"custom:ha-device-table-card","columns":[],"__proto__":{"polluted_ed":true},"columns_item":{"__proto__":{"inner_ed":true}}}',
      );

      el.setConfig(maliciousConfig);

      expect((Object.prototype as any).polluted_ed).to.be.undefined;
      expect((Object.prototype as any).inner_ed).to.be.undefined;
      expect((el as any)._config.__proto__.polluted_ed).to.be.undefined;
    });
  });

  describe('ha-device-table-card custom device class / suffix prototype safety', () => {
    it('should prevent prototype lookup clashes when dynamic device_class/suffix matches Object.prototype properties', async () => {
      const mockHass = {
        states: {
          'sensor.test': {
            entity_id: 'sensor.test',
            state: '10',
            attributes: {
              device_class: 'toString',
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
            device_class: 'toString',
            label: 'Battery (clash)',
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

      const span = el.shadowRoot?.querySelector('tbody td.cell-entity') as HTMLElement;
      expect(span).to.exist;
      // It should display '10' since toString is the device_class but is protected against prototype function lookup clashing
      expect(span.textContent?.trim()).to.equal('10');
    });
  });

  describe('ha-device-table-card-editor valueChanged prototype safety for nested properties', () => {
    it('should block nested prototype pollution keys like parent.__proto__.child in _valueChanged', async () => {
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

      const input = document.createElement('ha-textfield') as any;
      input.configValue = 'filter.__proto__.polluted_nested';
      input.value = 'true';

      const event = {
        target: input,
      };

      (el as any)._valueChanged(event);

      expect(eventFired).to.be.false;
      expect((Object.prototype as any).polluted_nested).to.be.undefined;
    });
  });

  describe('ha-device-table-card areaLookup prototype safety', () => {
    it('should handle area_id values that match Object.prototype property names safely', async () => {
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
          if (msg.type === 'config/device_registry/list') {
            return [{ id: 'dev1', name: 'Device 1', area_id: 'toString' }];
          }
          if (msg.type === 'config/entity_registry/list') {
            return [{ entity_id: 'sensor.test', device_id: 'dev1' }];
          }
          if (msg.type === 'config/area_registry/list') {
            return [{ area_id: 'toString', name: 'Living Room' }];
          }
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
            type: 'device',
            prop: 'area',
            label: 'Area',
          },
        ],
      };

      const el = await fixture<DeviceTableCard>(html`
        <ha-device-table-card .hass=${mockHass}></ha-device-table-card>
      `);
      el.setConfig(config as any);
      await el.updateComplete;

      // Force registry fetch and wait
      await (el as any)._fetchRegistries(true);
      await el.updateComplete;

      const areaLookup = (el as any)._areaLookup;
      expect(areaLookup).to.exist;
      expect(areaLookup.toString).to.equal('Living Room');
      // On an object without prototype, toString should be a string, not a function!
      expect(typeof areaLookup.toString).to.equal('string');
    });
  });

  describe('ha-device-table-card interactive cell validation', () => {
    it('should navigate for safe deviceId but block malicious deviceId values', async () => {
      const mockHass = {
        states: {},
        callWS: async () => [],
        connection: {
          subscribeEvents: () => Promise.resolve(() => {}),
        },
      };

      const el = await fixture<DeviceTableCard>(html`
        <ha-device-table-card .hass=${mockHass}></ha-device-table-card>
      `);
      el.setConfig({ type: 'custom:ha-device-table-card', columns: [] });
      await el.updateComplete;

      let navigatedPath: string | null = null;
      const originalPushState = history.pushState;
      history.pushState = (_state: any, _title: string, url?: string | null) => {
        navigatedPath = url ?? null;
      };

      try {
        // Trigger click with safe deviceId
        const safeCell = document.createElement('td');
        safeCell.classList.add('cell-device');
        safeCell.setAttribute('data-device-id', 'dev-123_abc');

        const table = el.shadowRoot?.querySelector('#deviceTable');
        expect(table).to.exist;
        table!.appendChild(safeCell);

        safeCell.click();
        expect(navigatedPath).to.equal('/config/devices/device/dev-123_abc');

        // Reset navigatedPath
        navigatedPath = null;

        // Trigger click with malicious deviceId (e.g. path traversal)
        const maliciousCell1 = document.createElement('td');
        maliciousCell1.classList.add('cell-device');
        maliciousCell1.setAttribute('data-device-id', '../../malicious');
        table!.appendChild(maliciousCell1);

        maliciousCell1.click();
        expect(navigatedPath).to.be.null;

        // Trigger click with malicious deviceId (e.g. absolute URL / open redirect)
        const maliciousCell2 = document.createElement('td');
        maliciousCell2.classList.add('cell-device');
        maliciousCell2.setAttribute('data-device-id', 'https://evil.com');
        table!.appendChild(maliciousCell2);

        maliciousCell2.click();
        expect(navigatedPath).to.be.null;

        // Trigger click with malicious deviceId (e.g. spaces/characters)
        const maliciousCell3 = document.createElement('td');
        maliciousCell3.classList.add('cell-device');
        maliciousCell3.setAttribute('data-device-id', 'dev id');
        table!.appendChild(maliciousCell3);

        maliciousCell3.click();
        expect(navigatedPath).to.be.null;
      } finally {
        history.pushState = originalPushState;
      }
    });

    it('should fire event for safe entityId but block malicious entityId values', async () => {
      const mockHass = {
        states: {},
        callWS: async () => [],
        connection: {
          subscribeEvents: () => Promise.resolve(() => {}),
        },
      };

      const el = await fixture<DeviceTableCard>(html`
        <ha-device-table-card .hass=${mockHass}></ha-device-table-card>
      `);
      el.setConfig({ type: 'custom:ha-device-table-card', columns: [] });
      await el.updateComplete;

      let firedDetail: any = null;
      el.addEventListener('hass-more-info', (e: any) => {
        firedDetail = e.detail;
      });

      const table = el.shadowRoot?.querySelector('#deviceTable');
      expect(table).to.exist;

      // Safe entityId
      const safeCell = document.createElement('td');
      safeCell.classList.add('cell-entity');
      safeCell.setAttribute('data-entity-id', 'sensor.battery_level-1');
      table!.appendChild(safeCell);

      safeCell.click();
      expect(firedDetail).to.deep.equal({ entityId: 'sensor.battery_level-1' });

      // Reset
      firedDetail = null;

      // Malicious entityId (directory traversal / arbitrary payload)
      const maliciousCell1 = document.createElement('td');
      maliciousCell1.classList.add('cell-entity');
      maliciousCell1.setAttribute('data-entity-id', '../../sensor.battery');
      table!.appendChild(maliciousCell1);

      maliciousCell1.click();
      expect(firedDetail).to.be.null;

      // Malicious entityId (containing spaces/quotes/special characters)
      const maliciousCell2 = document.createElement('td');
      maliciousCell2.classList.add('cell-entity');
      maliciousCell2.setAttribute('data-entity-id', 'sensor.battery" onclick="alert(1)');
      table!.appendChild(maliciousCell2);

      maliciousCell2.click();
      expect(firedDetail).to.be.null;
    });
  });
});
