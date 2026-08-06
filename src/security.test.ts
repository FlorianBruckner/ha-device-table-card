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

  describe('ha-device-table-card-editor circular references DoS prevention', () => {
    it('should safely handle circular references in setConfig for editor and card', async () => {
      const elEditor = await fixture<DeviceTableCardEditor>(html`
        <ha-device-table-card-editor></ha-device-table-card-editor>
      `);
      const elCard = await fixture<DeviceTableCard>(html`
        <ha-device-table-card></ha-device-table-card>
      `);

      const circularConfig: any = {
        type: 'custom:ha-device-table-card',
        columns: [],
      };
      circularConfig.self = circularConfig;

      // This should not throw call stack size exceeded errors
      expect(() => elEditor.setConfig(circularConfig)).to.not.throw();
      expect(() => elCard.setConfig(circularConfig)).to.not.throw();
    });
  });

  describe('ha-device-table-card depth limits DoS prevention', () => {
    it('should reject extremely deep configurations in setConfig to prevent deep-recursion stack overflow DoS', async () => {
      const elEditor = await fixture<DeviceTableCardEditor>(html`
        <ha-device-table-card-editor></ha-device-table-card-editor>
      `);
      const elCard = await fixture<DeviceTableCard>(html`
        <ha-device-table-card></ha-device-table-card>
      `);

      // Build a deeply nested object with depth of 22
      const deepObj: any = {};
      let current = deepObj;
      for (let i = 0; i < 22; i++) {
        current.child = {};
        current = current.child;
      }

      const deepConfig = {
        type: 'custom:ha-device-table-card',
        columns: [],
        nested: deepObj,
      };

      expect(() => elCard.setConfig(deepConfig)).to.throw('Configuration depth limit exceeded');
      expect(() => elEditor.setConfig(deepConfig)).to.throw('Configuration depth limit exceeded');
    });
  });

  describe('ha-device-table-card color cache memory bounding DoS prevention', () => {
    it('should safely bound memory usage in _colorCache and clear entries when threshold is reached', async () => {
      const elCard = await fixture<DeviceTableCard>(html`
        <ha-device-table-card></ha-device-table-card>
      `);

      const cacheMap = (elCard as any)._colorCache;
      expect(cacheMap).to.exist;

      // Populate up to 500 entries (the threshold limit of 500)
      for (let i = 0; i < 500; i++) {
        (elCard as any)._sanitizeColor(`color${i}`);
      }
      expect(cacheMap.size).to.equal(500);

      // Triggering 501st entry should reset cache size or handle correctly
      (elCard as any)._sanitizeColor('newUniqueColor');
      // The 501st unique color check should trigger clean/clear to keep map size bounded
      expect(cacheMap.size).to.be.below(500);
    });
  });

  describe('ha-device-table-card _sanitizeColor length limit ReDoS prevention', () => {
    it('should reject color values exceeding 100 characters in _sanitizeColor', async () => {
      const elCard = await fixture<DeviceTableCard>(html`
        <ha-device-table-card></ha-device-table-card>
      `);
      const elEditor = await fixture<DeviceTableCardEditor>(html`
        <ha-device-table-card-editor></ha-device-table-card-editor>
      `);

      const longColor = 'red' + ' '.repeat(100);
      expect((elCard as any)._sanitizeColor(longColor)).to.equal('');
      expect((elEditor as any)._sanitizeColor(longColor)).to.equal('');

      const safeColor = 'red' + ' '.repeat(5);
      expect((elCard as any)._sanitizeColor(safeColor)).to.equal(safeColor);
      expect((elEditor as any)._sanitizeColor(safeColor)).to.equal(safeColor);
    });
  });

  describe('ha-device-table-card robust type validation and boundary safety', () => {
    it('should not crash when columns property is not an array', async () => {
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

      // Inject malformed columns
      el.setConfig({
        type: 'custom:ha-device-table-card',
        columns: 'this-should-be-an-array' as any,
      });
      await el.updateComplete;

      // Verify it doesn't crash and returns default columns
      const cols = (el as any)._getColumns();
      expect(cols).to.be.an('array');
      expect(cols.length).to.equal(2);
      expect(cols[0].title).to.equal('Device');
    });

    it('should handle non-array WebSocket registry payloads gracefully without throwing', async () => {
      const mockHass = {
        states: {},
        callWS: async (msg: any) => {
          if (msg.type === 'config/device_registry/list') return null; // Malformed response
          if (msg.type === 'config/entity_registry/list') return { error: 'invalid' }; // Malformed response
          if (msg.type === 'config/area_registry/list') return 'not-an-array'; // Malformed response
          return [];
        },
        connection: {
          subscribeEvents: () => Promise.resolve(() => {}),
        },
      };

      const el = await fixture<DeviceTableCard>(html`
        <ha-device-table-card .hass=${mockHass}></ha-device-table-card>
      `);

      el.setConfig({ type: 'custom:ha-device-table-card', columns: [] });
      await el.updateComplete;

      // Execute registry fetch and confirm it finishes safely
      let threw = false;
      try {
        await (el as any)._fetchRegistries(true);
      } catch {
        threw = true;
      }
      expect(threw).to.be.false;
      expect((el as any)._devices).to.deep.equal([]);
      expect((el as any)._entities).to.deep.equal([]);
      expect((el as any)._areas).to.deep.equal([]);
    });

    it('should enforce 1000 character limits on all configuration string parameters', async () => {
      const el = await fixture<DeviceTableCard>(html`
        <ha-device-table-card></ha-device-table-card>
      `);

      const longTitle = 'a'.repeat(1200);
      el.setConfig({
        type: 'custom:ha-device-table-card',
        title: longTitle,
        columns: [
          {
            type: 'device',
            prop: 'name',
            label: 'b'.repeat(1500),
          },
        ],
      });

      expect((el as any)._config.title.length).to.equal(1000);
      expect((el as any)._config.columns[0].label.length).to.equal(1000);
    });
  });

  describe('ha-device-table-card-editor array index boundary safety', () => {
    it('should safely ignore out-of-bounds index manipulation in editor', async () => {
      const el = await fixture<DeviceTableCardEditor>(html`
        <ha-device-table-card-editor></ha-device-table-card-editor>
      `);
      el.setConfig({
        type: 'custom:ha-device-table-card',
        columns: [
          {
            type: 'entity',
            device_class: 'battery',
            label: 'Battery',
            highlight: [{ below: 15, color: 'red' }],
          },
        ],
      } as any);
      el.hass = { states: {} };
      await el.updateComplete;

      // out-of-bounds deletions should be ignored and not throw errors
      expect(() => (el as any)._deleteColumn(-1)).to.not.throw();
      expect(() => (el as any)._deleteColumn(5)).to.not.throw();
      expect(() => (el as any)._deleteHighlightRule(-1, 0)).to.not.throw();
      expect(() => (el as any)._deleteHighlightRule(0, -1)).to.not.throw();
      expect(() => (el as any)._deleteHighlightRule(0, 5)).to.not.throw();

      // out-of-bounds moves should be ignored
      expect(() => (el as any)._moveColumn(-1, 'up')).to.not.throw();
      expect(() => (el as any)._moveColumn(0, 'up')).to.not.throw(); // moving top item up is handled but should not throw or change anything
      expect(() => (el as any)._moveColumn(5, 'down')).to.not.throw();

      // out-of-bounds property updates should be ignored
      expect(() => (el as any)._updateColumnProperty(-1, 'label', 'test')).to.not.throw();
      expect(() => (el as any)._updateColumnProperty(5, 'label', 'test')).to.not.throw();

      // out-of-bounds highlight rules additions / updates should be ignored
      expect(() => (el as any)._addHighlightRule(-1)).to.not.throw();
      expect(() => (el as any)._addHighlightRule(5)).to.not.throw();
      expect(() => (el as any)._updateHighlightRule(-1, 0, 'color', 'blue')).to.not.throw();
      expect(() => (el as any)._updateHighlightRule(0, -1, 'color', 'blue')).to.not.throw();
      expect(() => (el as any)._updateHighlightRule(0, 5, 'color', 'blue')).to.not.throw();
    });
  });

  describe('ha-device-table-card states registry prototype and types safety', () => {
    it('should handle state objects with missing or undefined attributes safely', async () => {
      const mockHass = {
        states: {
          'sensor.test': {
            entity_id: 'sensor.test',
            state: '10',
            attributes: undefined, // undefined attributes
            last_updated: new Date().toISOString(),
          },
          'sensor.test_null': {
            entity_id: 'sensor.test_null',
            state: '20',
            attributes: null, // null attributes
            last_updated: new Date().toISOString(),
          },
        },
        callWS: async (msg: any) => {
          if (msg.type === 'config/device_registry/list') return [{ id: 'dev1', name: 'Device 1' }];
          if (msg.type === 'config/entity_registry/list')
            return [
              { entity_id: 'sensor.test', device_id: 'dev1', device_class: 'battery' },
              { entity_id: 'sensor.test_null', device_id: 'dev1', device_class: 'battery' },
            ];
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
            label: 'Battery',
          },
        ],
      };

      const el = await fixture<DeviceTableCard>(html`
        <ha-device-table-card .hass=${mockHass}></ha-device-table-card>
      `);
      el.setConfig(config as any);
      await el.updateComplete;

      // Wait for DataTables to initialize and make sure it doesn't crash on undefined attributes
      await new Promise((resolve) => setTimeout(resolve, 500));

      const span = el.shadowRoot?.querySelector('tbody td.cell-entity') as HTMLElement;
      expect(span).to.exist;
    });

    it('should handle entity_id values that clash with Object.prototype properties safely', async () => {
      const mockHass = {
        states: {
          toString: {
            entity_id: 'toString',
            state: '15',
            attributes: {
              device_class: 'battery',
            },
            last_updated: new Date().toISOString(),
          },
        },
        callWS: async (msg: any) => {
          if (msg.type === 'config/device_registry/list') return [{ id: 'dev1', name: 'Device 1' }];
          if (msg.type === 'config/entity_registry/list')
            return [{ entity_id: 'toString', device_id: 'dev1' }];
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
            label: 'Battery',
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
      if (dataTable) {
        dataTable.search('').draw();
      }

      const span = el.shadowRoot?.querySelector('tbody td.cell-entity') as HTMLElement;
      expect(span).to.exist;
      expect(span.textContent?.trim()).to.equal('15');
    });

    it('should handle non-object state entries gracefully without crashing', async () => {
      const mockHass = {
        states: {
          'sensor.malformed': 'not-an-object', // Malformed primitive state
        },
        callWS: async (msg: any) => {
          if (msg.type === 'config/device_registry/list') return [{ id: 'dev1', name: 'Device 1' }];
          if (msg.type === 'config/entity_registry/list')
            return [{ entity_id: 'sensor.malformed', device_id: 'dev1', device_class: 'battery' }];
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
            label: 'Battery',
          },
        ],
      };

      const el = await fixture<DeviceTableCard>(html`
        <ha-device-table-card .hass=${mockHass}></ha-device-table-card>
      `);
      el.setConfig(config as any);
      await el.updateComplete;

      // Wait for DataTables to initialize and make sure it does not crash
      await new Promise((resolve) => setTimeout(resolve, 500));

      const dataTable = (el as any)._dataTable;
      if (dataTable) {
        dataTable.search('').draw();
      }

      const span = el.shadowRoot?.querySelector('tbody td.cell-entity') as HTMLElement;
      expect(span).to.exist;
      expect(span.textContent?.trim()).to.equal('-');
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

  describe('ha-device-table-card prototype-pollution attribute safety', () => {
    it('should not inherit friendly_name, unit_of_measurement, or device_class from object prototypes', async () => {
      // Create a localized polluted prototype chain for attributes and registry entities to safely verify isolation
      const customAttrProto = Object.create(Object.prototype);
      customAttrProto.friendly_name = 'Polluted Friendly Name';
      customAttrProto.unit_of_measurement = 'Polluted UOM';
      customAttrProto.device_class = 'battery';

      const customEntProto = Object.create(Object.prototype);
      customEntProto.device_class = 'battery';

      const mockAttributes = Object.create(customAttrProto);
      const mockEntityRegistryEntry = Object.create(customEntProto);
      mockEntityRegistryEntry.entity_id = 'sensor.test';
      mockEntityRegistryEntry.device_id = 'dev1';

      const mockHass = {
        states: {
          'sensor.test': {
            entity_id: 'sensor.test',
            state: '10',
            attributes: mockAttributes,
            last_updated: new Date().toISOString(),
          },
        },
        callWS: async (msg: any) => {
          if (msg.type === 'config/device_registry/list') return [{ id: 'dev1', name: 'Device 1' }];
          if (msg.type === 'config/entity_registry/list') return [mockEntityRegistryEntry];
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
            label: 'Battery',
          },
        ],
      };

      const el = await fixture<DeviceTableCard>(html`
        <ha-card .hass=${mockHass}>
          <ha-device-table-card .hass=${mockHass}></ha-device-table-card>
        </ha-card>
      `);
      const card = el.querySelector('ha-device-table-card') as DeviceTableCard;
      card.setConfig(config as any);
      await card.updateComplete;

      // Wait for DataTables to draw
      await new Promise((resolve) => setTimeout(resolve, 500));

      // It should NOT resolve 'sensor.test' as 'battery' device class since the attributes are inherited from prototype,
      // and thus the cell text content should be empty '-'
      const td = card.shadowRoot?.querySelector('tbody td.cell-entity') as HTMLElement;
      expect(td).to.exist;
      expect(td.textContent?.trim()).to.equal('-');
      expect(td.title).to.not.contain('Polluted Friendly Name');
    });

    it('should handle malformed, non-string, or object-valued state attributes gracefully without crashing', async () => {
      const mockHass = {
        states: {
          'sensor.test': {
            entity_id: 'sensor.test',
            state: '10',
            attributes: {
              device_class: { malicious: 'object' }, // non-string
              friendly_name: ['malicious', 'array'], // non-string
              unit_of_measurement: { complex: 'uom' }, // non-string
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
            label: 'Battery',
          },
        ],
      };

      const el = await fixture<DeviceTableCard>(html`
        <ha-device-table-card .hass=${mockHass}></ha-device-table-card>
      `);
      el.setConfig(config as any);
      await el.updateComplete;

      // Wait for DataTables to initialize and make sure it does not throw or crash on malformed properties
      await new Promise((resolve) => setTimeout(resolve, 500));

      const td = el.shadowRoot?.querySelector('tbody td.cell-entity') as HTMLElement;
      expect(td).to.exist;
      // It should fall back safely without showing [object Object] or throwing TypeErrors
      expect(td.textContent?.trim()).to.equal('-');
      expect(td.title).to.not.contain('object');
    });
  });
});
