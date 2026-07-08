import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { fireEvent } from 'custom-card-helpers';
import { DeviceTableCardConfig } from './types';

@customElement('ha-device-table-card-editor')
export class DeviceTableCardEditor extends LitElement {
  @property({ attribute: false }) public hass?: any;
  @state() private _config?: DeviceTableCardConfig;

  public setConfig(config: DeviceTableCardConfig): void {
    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      <div class="card-config">
        <ha-textfield
          label="Title"
          .value=${this._config.title || ''}
          .configValue=${'title'}
          @input=${this._valueChanged}
          maxlength="100"
        ></ha-textfield>

        <h3>Filters</h3>
        <ha-textfield
          label="Area"
          .value=${this._config.filter?.area || ''}
          .configValue=${'filter.area'}
          @input=${this._valueChanged}
          maxlength="100"
        ></ha-textfield>

        <ha-textfield
          label="Anchor Entity Device Class"
          .value=${this._config.filter?.anchor_entity_class || ''}
          .configValue=${'filter.anchor_entity_class'}
          @input=${this._valueChanged}
          maxlength="100"
        ></ha-textfield>

        <ha-textfield
          label="Integration (e.g. zha, mqtt, hue)"
          .value=${this._config.filter?.integration || ''}
          .configValue=${'filter.integration'}
          @input=${this._valueChanged}
          maxlength="100"
        ></ha-textfield>

        <ha-textfield
          label="Manufacturer (e.g. LUMI, Sonoff)"
          .value=${this._config.filter?.manufacturer || ''}
          .configValue=${'filter.manufacturer'}
          @input=${this._valueChanged}
          maxlength="100"
        ></ha-textfield>

        <p><i>More advanced configuration (columns, thresholds) is still managed via YAML.</i></p>
      </div>
    `;
  }

  private _valueChanged(ev: any): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target;
    const value = target.value;
    const configValue = target.configValue;

    if (!configValue) {
      return;
    }

    const newConfig = { ...this._config };

    if (configValue.includes('.')) {
      const parts = configValue.split('.');
      let current: any = newConfig;
      for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          return;
        }
        if (!current[key]) {
          current[key] = {};
        }
        current[key] = { ...current[key] };
        current = current[key];
      }
      const lastKey = parts[parts.length - 1];
      if (lastKey === '__proto__' || lastKey === 'constructor' || lastKey === 'prototype') {
        return;
      }
      current[lastKey] = value;
    } else {
      if (
        configValue === '__proto__' ||
        configValue === 'constructor' ||
        configValue === 'prototype'
      ) {
        return;
      }
      newConfig[configValue] = value;
    }

    fireEvent(this, 'config-changed', { config: newConfig });
  }
}
