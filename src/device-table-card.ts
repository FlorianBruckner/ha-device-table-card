import { LitElement, html, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LovelaceCard, fireEvent, navigate } from 'custom-card-helpers';
import DataTable from 'datatables.net-dt';
import 'datatables.net-responsive-dt';
import { escape } from 'html-escaper';

import { DeviceTableCardConfig } from './types';
import { styles } from './styles';
import { processDevices } from './data-processor';
import './ha-device-table-card-editor';

@customElement('ha-device-table-card')
export class DeviceTableCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass!: any;
  @state() private _config?: DeviceTableCardConfig;
  @state() private _devices: any[] = [];
  @state() private _entities: any[] = [];
  @state() private _areas: any[] = [];
  @state() private _entitiesByDevice: Map<string, any[]> = new Map();
  @state() private _areaLookup: Record<string, string> = Object.create(null);

  private _dataTable: any = null;
  private _updateTimeout?: any;
  private _refreshInterval?: any;
  private _unsubs: Array<Promise<() => void>> = [];

  static get styles() {
    return styles;
  }

  public static getConfigElement() {
    return document.createElement('ha-device-table-card-editor');
  }

  public static getStubConfig() {
    return {
      title: 'Device Table',
      filter: {
        area: '',
        anchor_entity_class: '',
      },
      columns: [],
    };
  }

  private _sanitizeConfig<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => this._sanitizeConfig(item)) as any;
    }
    const sanitized: any = {};
    for (const key of Object.keys(obj)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      sanitized[key] = this._sanitizeConfig((obj as any)[key]);
    }
    return sanitized;
  }

  public setConfig(config: DeviceTableCardConfig): void {
    if (!config) {
      throw new Error('Invalid configuration');
    }
    this._config = this._sanitizeConfig(config);
  }

  public getCardSize(): number {
    return 3;
  }

  public connectedCallback(): void {
    super.connectedCallback();
    if (this._config) {
      this._startRefreshInterval();
    }
    this._subscribeRegistryUpdates();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stopRefreshInterval();
    if (this._updateTimeout) {
      clearTimeout(this._updateTimeout);
    }
    if (this._dataTable) {
      this._dataTable.destroy();
      this._dataTable = null;
    }
    this._unsubscribeRegistryUpdates();
  }

  private _startRefreshInterval(): void {
    this._stopRefreshInterval();
    this._refreshInterval = setInterval(() => {
      if (this._dataTable) {
        this._dataTable.draw(false);
      }
    }, 30000);
  }

  private _stopRefreshInterval(): void {
    if (this._refreshInterval) {
      clearInterval(this._refreshInterval);
      this._refreshInterval = undefined;
    }
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
    this._initDataTable();
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (changedProperties.has('hass') && this.hass) {
      this._fetchRegistries();
      this._subscribeRegistryUpdates();
    }

    if (changedProperties.has('_config')) {
      this._startRefreshInterval();
      this._reinitDataTable();
    } else if (
      changedProperties.has('hass') ||
      changedProperties.has('_devices') ||
      changedProperties.has('_entities') ||
      changedProperties.has('_areas')
    ) {
      this._debouncedUpdate();
    }
  }

  private _fetchingRegistries = false;
  private async _fetchRegistries(force = false): Promise<void> {
    if (!this.hass || this._fetchingRegistries) {
      return;
    }

    if (!force && this._devices.length > 0 && this._entities.length > 0) {
      return;
    }

    this._fetchingRegistries = true;
    try {
      const [devices, entities, areas] = await Promise.all([
        this.hass.callWS({ type: 'config/device_registry/list' }),
        this.hass.callWS({ type: 'config/entity_registry/list' }),
        this.hass.callWS({ type: 'config/area_registry/list' }),
      ]);

      this._devices = devices as any[];
      this._entities = entities as any[];
      this._areas = areas as any[];

      const areaLookup: Record<string, string> = Object.create(null);
      for (const area of this._areas) {
        if (area && area.area_id) {
          areaLookup[area.area_id] = area.name;
        }
      }
      this._areaLookup = areaLookup;

      const entitiesByDevice = new Map<string, any[]>();
      for (const ent of this._entities) {
        if (ent.device_id) {
          if (!entitiesByDevice.has(ent.device_id)) {
            entitiesByDevice.set(ent.device_id, []);
          }
          entitiesByDevice.get(ent.device_id)!.push(ent);
        }
      }
      this._entitiesByDevice = entitiesByDevice;
    } catch (e) {
      console.error('Failed to fetch Home Assistant registries', e);
    } finally {
      this._fetchingRegistries = false;
    }
  }

  private _subscribeRegistryUpdates(): void {
    if (!this.hass || !this.hass.connection || this._unsubs.length > 0) {
      return;
    }

    const callback = () => this._fetchRegistries(true);

    this._unsubs.push(this.hass.connection.subscribeEvents(callback, 'device_registry_updated'));
    this._unsubs.push(this.hass.connection.subscribeEvents(callback, 'entity_registry_updated'));
    this._unsubs.push(this.hass.connection.subscribeEvents(callback, 'area_registry_updated'));
  }

  private _unsubscribeRegistryUpdates(): void {
    while (this._unsubs.length) {
      const unsub = this._unsubs.pop();
      if (unsub) {
        unsub.then((u) => u());
      }
    }
  }

  private _debouncedUpdate(): void {
    if (this._updateTimeout) {
      clearTimeout(this._updateTimeout);
    }
    this._updateTimeout = setTimeout(() => this._updateDataTable(), 100);
  }

  private _reinitDataTable(): void {
    if (this._dataTable) {
      this._dataTable.destroy();
      this._dataTable = null;
    }
    // Clear the table element content to be safe and remove any DataTables-injected elements
    const tableElement = this.renderRoot.querySelector('#deviceTable');
    if (tableElement) {
      tableElement.innerHTML = '';
    }
    this._initDataTable();
    this._updateDataTable();
  }

  private _updateDataTable(): void {
    if (!this.hass || !this._config || !this._dataTable) {
      return;
    }

    const data = processDevices(
      this.hass,
      this._config,
      this._devices,
      this._entitiesByDevice,
      this._areaLookup,
    );
    this._dataTable.clear();
    this._dataTable.rows.add(data);
    this._dataTable.draw(false); // Use false to keep current paging
  }

  private _initDataTable(): void {
    const tableElement = this.renderRoot.querySelector('#deviceTable') as HTMLElement;
    if (tableElement && !this._dataTable) {
      this._dataTable = new DataTable(tableElement, {
        responsive: true,
        paging: true,
        searching: true,
        ordering: true,
        info: true,
        data: [],
        columns: this._getColumns(),
        autoWidth: false,
        layout: {
          topStart: 'pageLength',
          topEnd: 'search',
          bottomStart: 'info',
          bottomEnd: 'paging',
        },
        stateSave: true,
        lengthMenu: [
          [10, 25, 50, 100, -1],
          [10, 25, 50, 100, 'All'],
        ],
        language: {
          search: '',
          searchPlaceholder: 'Search devices...',
          info: 'Showing _START_ to _END_ of _TOTAL_ devices',
          infoEmpty: 'Showing 0 to 0 of 0 devices',
          infoFiltered: '(filtered from _MAX_ total devices)',
          lengthMenu: 'Show _MENU_ devices',
          zeroRecords: 'No matching devices found',
          emptyTable: 'No devices available',
        },
        initComplete: () => {
          const searchInput = this.renderRoot.querySelector(
            '.dt-search input, .dataTables_filter input',
          ) as HTMLInputElement | null;
          if (searchInput) {
            searchInput.setAttribute('aria-label', 'Search devices');
            searchInput.setAttribute('type', 'search');
            searchInput.setAttribute('autocapitalize', 'off');
            searchInput.setAttribute('spellcheck', 'false');
          }

          const lengthSelect = this.renderRoot.querySelector(
            '.dt-length select, .dataTables_wrapper .dataTables_length select',
          );
          if (lengthSelect) {
            lengthSelect.setAttribute('aria-label', 'Items per page');
          }

          const headers = this.renderRoot.querySelectorAll('table.dataTable thead th');
          headers.forEach((th) => {
            const titleSpan = th.querySelector('.dt-column-title');
            const cleanText = (titleSpan ? titleSpan.textContent : th.textContent || '').trim();
            if (cleanText) {
              th.setAttribute('title', cleanText);
            }
          });
        },
      });

      tableElement.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          const target = e.target as HTMLElement;
          if (
            target.tagName === 'TD' &&
            (target.classList.contains('cell-entity') || target.classList.contains('cell-device'))
          ) {
            e.preventDefault();
            target.click();
          }
        }
      });

      tableElement.addEventListener('click', (e: Event) => {
        const target = e.target as HTMLElement;
        const cell = target.closest('td');
        if (!cell) return;

        if (cell.classList.contains('cell-entity')) {
          const entityId = cell.getAttribute('data-entity-id');
          // Security Hardening: strictly validate entityId before firing more-info action
          if (entityId && /^[a-zA-Z0-9_.-]+$/.test(entityId)) {
            fireEvent(this, 'hass-more-info', { entityId });
          }
        } else if (cell.classList.contains('cell-device')) {
          const deviceId = cell.getAttribute('data-device-id');
          // Security Hardening: strictly validate deviceId before triggering navigation
          if (deviceId && /^[a-zA-Z0-9_-]+$/.test(deviceId)) {
            navigate(this, `/config/devices/device/${deviceId}`);
          }
        }
      });
    }
  }

  private _sanitizeColor(color: string): string {
    if (typeof color !== 'string' || !color) return '';
    // Allow alphanumeric, hex, and basic CSS color functions/characters, but block ; : and others
    const sanitized = color.replace(/[^a-zA-Z0-9#(), \-./]/g, '');

    // Block potential CSS function injections like url(), expression(), image(), image-set(), etc.
    if (/\b(url|expression|image|image-set|element|paint|cross-fade)\s*\(/i.test(sanitized)) {
      return '';
    }

    return sanitized;
  }

  private _getColumns(): any[] {
    if (!this._config?.columns || this._config.columns.length === 0) {
      return [
        {
          title: 'Device',
          data: 'name',
          defaultContent: '-',
          className: 'cell-device',
          createdCell: (td: HTMLElement, _cellData: any, rowData: any) => {
            td.setAttribute('data-device-id', rowData.id);
            td.title = `Navigate to ${rowData.name} details`;
            td.tabIndex = 0;
            td.setAttribute('role', 'button');
          },
          render: (data: any) => (data && data !== '-' ? escape(String(data)) : data),
        },
        {
          title: 'Area',
          data: 'area',
          defaultContent: '-',
          className: 'cell-device',
          createdCell: (td: HTMLElement, _cellData: any, rowData: any) => {
            td.setAttribute('data-device-id', rowData.id);
            td.title = `Navigate to ${rowData.name} details`;
            td.tabIndex = 0;
            td.setAttribute('role', 'button');
          },
          render: (data: any) => (data && data !== '-' ? escape(String(data)) : data),
        },
      ];
    }
    return this._config.columns.map((col, index) => {
      const colKey = `col_${index}`;
      return {
        title: escape(col.label || col.prop || col.device_class || 'Unknown'),
        data: colKey,
        defaultContent: '-',
        type:
          col.type === 'entity' || (col.type === 'meta' && col.prop === 'last_changed')
            ? 'num'
            : 'string',
        className:
          (col.type === 'entity' ? 'cell-entity' : col.type === 'device' ? 'cell-device' : '') +
          (col.type === 'entity' || (col.type === 'meta' && col.prop === 'last_changed')
            ? ' dt-type-numeric'
            : ''),
        createdCell: (td: HTMLElement, _cellData: any, rowData: any) => {
          if (col.type === 'entity') {
            const stateObj = rowData._entities[colKey];
            if (stateObj) {
              td.setAttribute('data-entity-id', stateObj.entity_id);
              td.title = `View ${stateObj.attributes.friendly_name || stateObj.entity_id} details`;
              td.tabIndex = 0;
              td.setAttribute('role', 'button');
            }
          } else if (col.type === 'device') {
            td.setAttribute('data-device-id', rowData.id);
            td.title = `Navigate to ${rowData.name} details`;
            td.tabIndex = 0;
            td.setAttribute('role', 'button');
          } else if (col.type === 'meta' && col.prop === 'last_changed') {
            const rawTimestamp = rowData[colKey];
            if (typeof rawTimestamp === 'number' && !isNaN(rawTimestamp)) {
              td.title = `Last updated: ${new Date(rawTimestamp).toLocaleString()}`;
            }
          }
        },
        render: (data: any, type: any, row: any) => {
          if (type === 'sort') {
            if (data === '-') return Infinity;
            if (col.type === 'entity') {
              const num = parseFloat(data);
              return isNaN(num) ? Infinity : num;
            }
            if (col.type === 'meta' && col.prop === 'last_changed') {
              const num = parseFloat(data);
              return isNaN(num) ? Infinity : num;
            }
            return data;
          }

          if (data === '-' || type === 'type') return data;

          let displayValue = escape(String(data));
          let color = '';
          let highlightReason = '';

          if (col.type === 'entity') {
            const stateObj = row._entities[colKey];
            if (stateObj) {
              const uom = stateObj.attributes.unit_of_measurement;
              if (uom) {
                displayValue = `${escape(data)} ${escape(uom)}`;
              }

              // Highlighting
              if (Array.isArray(col.highlight)) {
                const numericValue = parseFloat(data);
                if (!isNaN(numericValue)) {
                  for (const rule of col.highlight) {
                    if (!rule || typeof rule !== 'object') continue;
                    const ruleBelow =
                      rule.below !== undefined && (rule.below as any) !== ''
                        ? parseFloat(rule.below as any)
                        : undefined;
                    const ruleAbove =
                      rule.above !== undefined && (rule.above as any) !== ''
                        ? parseFloat(rule.above as any)
                        : undefined;
                    if (ruleBelow !== undefined && !isNaN(ruleBelow) && numericValue < ruleBelow) {
                      color = rule.color;
                      highlightReason = `Value is below threshold: ${ruleBelow}${uom || ''}`;
                    } else if (
                      ruleAbove !== undefined &&
                      !isNaN(ruleAbove) &&
                      numericValue > ruleAbove
                    ) {
                      color = rule.color;
                      highlightReason = `Value is above threshold: ${ruleAbove}${uom || ''}`;
                    }
                  }
                }
              }
            }
          } else if (col.type === 'meta' && col.prop === 'last_changed') {
            if (typeof data !== 'number' || isNaN(data)) return data;
            const secondsAgo = Math.floor((Date.now() - data) / 1000);

            if (secondsAgo < 60) {
              displayValue = `${secondsAgo}s`;
            } else if (secondsAgo < 3600) {
              displayValue = `${Math.floor(secondsAgo / 60)}m`;
            } else if (secondsAgo < 86400) {
              displayValue = `${Math.floor(secondsAgo / 3600)}h`;
            } else {
              displayValue = `${Math.floor(secondsAgo / 86400)}d`;
            }

            if (Array.isArray(col.highlight)) {
              const minutesAgo = Math.floor(secondsAgo / 60);
              for (const rule of col.highlight) {
                if (!rule || typeof rule !== 'object') continue;
                const ruleBelow =
                  rule.below !== undefined && (rule.below as any) !== ''
                    ? parseFloat(rule.below as any)
                    : undefined;
                const ruleAbove =
                  rule.above !== undefined && (rule.above as any) !== ''
                    ? parseFloat(rule.above as any)
                    : undefined;
                if (ruleBelow !== undefined && !isNaN(ruleBelow) && minutesAgo < ruleBelow) {
                  color = rule.color;
                  highlightReason = `Last changed ${minutesAgo}m ago (below ${ruleBelow}m threshold)`;
                } else if (ruleAbove !== undefined && !isNaN(ruleAbove) && minutesAgo > ruleAbove) {
                  color = rule.color;
                  highlightReason = `Last changed ${minutesAgo}m ago (above ${ruleAbove}m threshold)`;
                }
              }
            }
          }

          if (color && type === 'display') {
            return `<span title="${escape(highlightReason)}" style="color: ${this._sanitizeColor(
              color,
            )}; font-weight: bold;">${displayValue}</span>`;
          }
          return displayValue;
        },
      };
    });
  }

  protected render() {
    if (!this._config) {
      return html`Config missing`;
    }

    return html`
      <ha-card .header=${this._config.title}>
        <div class="card-content">
          <div id="table-container">
            <table id="deviceTable" class="display responsive nowrap" style="width:100%"></table>
          </div>
        </div>
      </ha-card>
    `;
  }
}

(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'ha-device-table-card',
  name: 'Device Table Card',
  description: 'A card to display devices in a table format',
  preview: true,
});
