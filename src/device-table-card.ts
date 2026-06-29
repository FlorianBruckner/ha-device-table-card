import { LitElement, html, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LovelaceCard, fireEvent, navigate } from 'custom-card-helpers';
import DataTable from 'datatables.net-dt';
import 'datatables.net-responsive-dt';

import { DeviceTableCardConfig, DeviceData } from './types';
import { styles } from './styles';

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

  public static getStyles() {
    return styles;
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
    }

    if (changedProperties.has('_config')) {
      this._startRefreshInterval();
      this._reinitDataTable();
    } else if (changedProperties.has('hass') ||
               changedProperties.has('_devices') ||
               changedProperties.has('_entities') ||
               changedProperties.has('_areas')) {
      this._debouncedUpdate();
    }
  }

  private _fetchingRegistries = false;
  private async _fetchRegistries(): Promise<void> {
    if (!this.hass || this._fetchingRegistries || (this._devices.length > 0 && this._entities.length > 0)) {
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

    const data = this._processDevices();
    this._dataTable.clear();
    this._dataTable.rows.add(data);
    this._dataTable.draw(false); // Use false to keep current paging
  }

  private _processDevices(): DeviceData[] {
    if (!this.hass || !this._config || this._devices.length === 0) {
      return [];
    }

    const states = this.hass.states || {};

    // Create lookups for faster processing
    const deviceLookup = Object.fromEntries(this._devices.map(d => [d.id, d]));
    const areaLookup = Object.fromEntries(this._areas.map(a => [a.area_id, a]));

    const deviceMap: Record<string, any[]> = {};

    // Group entities by device using registries first
    this._entities.forEach((entityRegistry) => {
      const entityId = entityRegistry.entity_id;
      const stateObj = states[entityId];
      const deviceId = entityRegistry.device_id;

      if (deviceId && stateObj) {
        if (!deviceMap[deviceId]) {
          deviceMap[deviceId] = [];
        }
        deviceMap[deviceId].push({
          entity_id: entityId,
          state: stateObj,
          registry: entityRegistry,
        });
      }
    });

    const result: DeviceData[] = [];

    Object.keys(deviceMap).forEach((deviceId) => {
      const deviceEntities = deviceMap[deviceId];
      const device = deviceLookup[deviceId];
      const deviceAreaId = device?.area_id;
      const area = deviceAreaId ? areaLookup[deviceAreaId]?.name || deviceAreaId : 'No Area';

      // Apply Area Filter
      if (this._config?.filter?.area && area !== this._config.filter.area) {
        return;
      }

      // Apply Anchor Entity Filter
      if (this._config?.filter?.anchor_entity_class) {
        const hasAnchor = deviceEntities.some((e) => {
          return e.state.attributes.device_class === this._config?.filter?.anchor_entity_class;
        });
        if (!hasAnchor) {
          return;
        }
      }

      const deviceData: DeviceData = {
        id: deviceId,
        name: device?.name_by_user || device?.name || 'Unknown Device',
        area: area,
        _entities: {},
      };

      // Resolve Columns
      this._config?.columns?.forEach((col, index) => {
        const key = `col_${index}`;
        if (col.type === 'device') {
          if (col.prop === 'name') deviceData[key] = deviceData.name;
          else if (col.prop === 'area') deviceData[key] = deviceData.area;
          else deviceData[key] = (device as any)?.[col.prop as string] || '-';
        } else if (col.type === 'entity') {
          const found = deviceEntities.find((e) => {
            if (col.device_class) {
              return e.state.attributes.device_class === col.device_class;
            }
            if (col.suffix) {
              return e.entity_id.endsWith(col.suffix);
            }
            return false;
          });

          if (found) {
            deviceData[key] = found.state.state;
            deviceData._entities[key] = found.state;
          } else {
            deviceData[key] = '-';
          }
        } else if (col.type === 'meta') {
          if (col.prop === 'last_changed') {
            const updates = deviceEntities
              .map((e) => new Date(e.state.last_updated).getTime())
              .filter((t) => !isNaN(t));

            if (updates.length > 0) {
              deviceData[key] = Math.max(...updates);
            } else {
              deviceData[key] = '-';
            }
          }
        }
      });

      result.push(deviceData);
    });

    return result;
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
          }
        },
        {
          title: 'Area',
          data: 'area',
          defaultContent: '-',
          className: 'cell-device',
          createdCell: (td: HTMLElement, _cellData: any, rowData: any) => {
            td.setAttribute('data-device-id', rowData.id);
          }
        }
      ];
    }
    return this._config.columns.map((col, index) => {
      const colKey = `col_${index}`;
      return {
        title: col.label || col.prop || col.device_class || 'Unknown',
        data: colKey,
        defaultContent: '-',
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
          if (data === '-' || type === 'sort' || type === 'type') return data;

          // Simple HTML escaping
          const escape = (str: string) => String(str).replace(/[&<>"']/g, (m) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
          }[m] || m));

          let displayValue = escape(data);
          let color = '';

          if (col.type === 'entity') {
            const stateObj = row._entities[colKey];
            if (stateObj) {
              const uom = stateObj.attributes.unit_of_measurement;
              if (uom) {
                displayValue = `${escape(data)} ${escape(uom)}`;
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
            const minutesAgo = Math.floor((Date.now() - data) / 60000);
            displayValue = `${minutesAgo} min ago`;

            if (col.highlight) {
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
            return `<span style="color: ${escape(color)}; font-weight: bold;">${displayValue}</span>`;
          }
          return displayValue;
        }
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
          <table id="deviceTable" class="display responsive nowrap" style="width:100%">
          </table>
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
