import { LitElement, html, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCard } from 'custom-card-helpers';
import DataTable from 'datatables.net-dt';
import 'datatables.net-responsive-dt';

import { DeviceTableCardConfig } from './types';
import { styles } from './styles';

@customElement('ha-device-table-card')
export class DeviceTableCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: DeviceTableCardConfig;
  private _dataTable: any = null;

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

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
    this._initDataTable();
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (changedProperties.has('hass')) {
      // Data update logic will go here in WP2/3
    }
  }

  private _initDataTable(): void {
    const tableElement = this.renderRoot.querySelector('#deviceTable');
    if (tableElement && !this._dataTable) {
      this._dataTable = new DataTable(tableElement as HTMLElement, {
        responsive: true,
        data: [],
        columns: this._getColumns(),
      });
    }
  }

  private _getColumns(): any[] {
    if (!this._config?.columns) {
      return [{ title: 'No columns configured' }];
    }
    return this._config.columns.map((col) => ({
      title: col.label || col.prop || col.device_class || 'Unknown',
      data: col.prop || col.device_class,
    }));
  }

  protected render() {
    if (!this._config) {
      return html`Config missing`;
    }
    if (!this.hass) {
      return html`Hass missing`;
    }

    return html`
      <ha-card .header=${this._config.title}>
        <div class="card-content">
          <table id="deviceTable" class="display responsive nowrap" style="width:100%">
            <thead>
              <tr>
                ${this._getColumns().map((col) => html`<th>${col.title}</th>`)}
              </tr>
            </thead>
            <tbody></tbody>
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
