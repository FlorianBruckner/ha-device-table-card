import { LitElement, html, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { escape as escapeHtml } from 'html-escaper';
import { LovelaceCard, fireEvent, navigate } from 'custom-card-helpers';
import DataTable from 'datatables.net-dt';
import 'datatables.net-responsive-dt';

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

  public setConfig(config: DeviceTableCardConfig): void {
    if (!config) {
      throw new Error('Invalid configuration');
    }
    this._config = config;
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
      this._entities,
      this._areas,
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
        dom: 'lfrtip', // Standard DataTables layout
        lengthMenu: [
          [10, 25, 50, 100, -1],
          [10, 25, 50, 100, 'All'],
        ],
      });

      tableElement.addEventListener('click', (e: Event) => {
        const target = e.target as HTMLElement;
        const cell = target.closest('td');
        if (!cell) return;

        if (cell.classList.contains('cell-entity')) {
          const entityId = cell.getAttribute('data-entity-id');
          if (entityId) {
            fireEvent(this, 'hass-more-info', { entityId });
          }
        } else if (cell.classList.contains('cell-device')) {
          const deviceId = cell.getAttribute('data-device-id');
          if (deviceId) {
            navigate(this, `/config/devices/device/${deviceId}`);
          }
        }
      });
    }
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
          },
        },
        {
          title: 'Area',
          data: 'area',
          defaultContent: '-',
          className: 'cell-device',
          createdCell: (td: HTMLElement, _cellData: any, rowData: any) => {
            td.setAttribute('data-device-id', rowData.id);
          },
        },
      ];
    }
    return this._config.columns.map((col, index) => {
      const colKey = `col_${index}`;
      return {
        title: col.label || col.prop || col.device_class || 'Unknown',
        data: colKey,
        defaultContent: '-',
        type:
          col.type === 'entity' || (col.type === 'meta' && col.prop === 'last_changed')
            ? 'num'
            : 'string',
        className: col.type === 'entity' ? 'cell-entity' : 'cell-device',
        createdCell: (td: HTMLElement, _cellData: any, rowData: any) => {
          if (col.type === 'entity') {
            const stateObj = rowData._entities[colKey];
            if (stateObj) {
              td.setAttribute('data-entity-id', stateObj.entity_id);
            }
          } else if (col.type === 'device') {
            td.setAttribute('data-device-id', rowData.id);
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

          let displayValue = escapeHtml(String(data));
          let color = '';

          if (col.type === 'entity') {
            const stateObj = row._entities[colKey];
            if (stateObj) {
              const uom = stateObj.attributes.unit_of_measurement;
              if (uom) {
                displayValue = `${escapeHtml(String(data))} ${escapeHtml(String(uom))}`;
              }

              // Highlighting
              if (col.highlight) {
                const numericValue = parseFloat(data);
                if (!isNaN(numericValue)) {
                  for (const rule of col.highlight) {
                    if (rule.below !== undefined && numericValue < rule.below) {
                      color = rule.color;
                    } else if (rule.above !== undefined && numericValue > rule.above) {
                      color = rule.color;
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

            if (col.highlight) {
              const minutesAgo = Math.floor(secondsAgo / 60);
              for (const rule of col.highlight) {
                if (rule.below !== undefined && minutesAgo < rule.below) {
                  color = rule.color;
                } else if (rule.above !== undefined && minutesAgo > rule.above) {
                  color = rule.color;
                }
              }
            }
          }

          if (color) {
            return `<span style="color: ${escapeHtml(String(color))}; font-weight: bold;">${displayValue}</span>`;
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
          <table id="deviceTable" class="display responsive nowrap" style="width:100%"></table>
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
