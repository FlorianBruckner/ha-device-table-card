import { LitElement, html, TemplateResult, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { fireEvent } from 'custom-card-helpers';
import { DeviceTableCardConfig, ColumnConfig } from './types';

@customElement('ha-device-table-card-editor')
export class DeviceTableCardEditor extends LitElement {
  @property({ attribute: false }) public hass?: any;
  @state() private _config?: DeviceTableCardConfig;
  @state() private _generalExpanded = true;
  @state() private _columnsExpanded = true;
  @state() private _expandedColumnIndex: number | null = null;

  static get styles() {
    return css`
      .card-config {
        display: flex;
        flex-direction: column;
        gap: 16px;
        font-family: var(--paper-font-body1_-_font-family, sans-serif);
      }
      .section {
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: 4px;
        background-color: var(--card-background-color, #fff);
        overflow: hidden;
      }
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        padding: 12px;
        font-weight: bold;
        font-size: 1.1em;
        background-color: var(--secondary-background-color, #f5f5f5);
        user-select: none;
      }
      .section-header:hover {
        background-color: var(--divider-color, rgba(0, 0, 0, 0.1));
      }
      .section-header:focus-visible {
        outline: 2px solid var(--primary-color, #03a9f4);
        outline-offset: -2px;
      }
      .section-content {
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        border-top: 1px solid var(--divider-color, #e0e0e0);
      }
      .column-item {
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: 4px;
        margin-bottom: 8px;
        overflow: hidden;
      }
      .column-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background-color: var(--secondary-background-color, #f5f5f5);
        padding: 8px 12px;
        cursor: pointer;
        user-select: none;
      }
      .column-header:hover {
        background-color: var(--divider-color, rgba(0, 0, 0, 0.1));
      }
      .column-header:focus-visible {
        outline: 2px solid var(--primary-color, #03a9f4);
        outline-offset: -2px;
      }
      .column-header-title {
        font-weight: bold;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.95em;
        color: var(--primary-text-color);
      }
      .column-badge {
        font-size: 0.75em;
        background-color: var(--primary-color, #03a9f4);
        color: var(--text-primary-color, #fff);
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: normal;
        text-transform: uppercase;
      }
      .column-actions {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .column-body {
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        background-color: var(--card-background-color, #fff);
        border-top: 1px solid var(--divider-color, #e0e0e0);
      }
      .btn {
        background-color: var(--primary-color, #03a9f4);
        color: var(--text-primary-color, #fff);
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9em;
        font-weight: bold;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
      }
      .btn:hover {
        opacity: 0.9;
      }
      .btn:focus-visible {
        outline: 2px solid var(--primary-color, #03a9f4);
        outline-offset: 2px;
      }
      .btn-secondary {
        background-color: var(--secondary-background-color, #e0e0e0);
        color: var(--primary-text-color, #000);
      }
      .btn-danger {
        background-color: var(--error-color, #e53935);
        color: #fff;
      }
      .btn-icon {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        border-radius: 50%;
        color: var(--secondary-text-color, #727272);
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
      }
      .btn-icon:hover {
        background-color: var(--secondary-background-color, rgba(0, 0, 0, 0.05));
        color: var(--primary-text-color, #000);
      }
      .btn-icon:focus-visible {
        outline: 2px solid var(--primary-color, #03a9f4);
        outline-offset: -2px;
      }
      .form-row {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .form-row ha-textfield,
      .form-row select {
        flex: 1;
      }
      select {
        height: 40px;
        padding: 0 8px;
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: 4px;
        background-color: var(--card-background-color, #fff);
        color: var(--primary-text-color, #000);
        font-family: inherit;
        font-size: 1em;
      }
      select:focus {
        border-color: var(--primary-color, #03a9f4);
        outline: none;
      }
      .presets-container {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 8px;
        margin-bottom: 12px;
      }
      .preset-badge {
        font-size: 0.8em;
        background-color: var(--secondary-background-color, #e0e0e0);
        color: var(--primary-text-color, #000);
        padding: 4px 8px;
        border-radius: 12px;
        cursor: pointer;
        border: 1px solid var(--divider-color, #e0e0e0);
        display: flex;
        align-items: center;
        gap: 4px;
        font-weight: 500;
      }
      .preset-badge:hover {
        background-color: var(--primary-color, #03a9f4);
        color: var(--text-primary-color, #fff);
      }
      .preset-badge:focus-visible {
        outline: 2px solid var(--primary-color, #03a9f4);
        outline-offset: 2px;
      }
      .highlights-editor {
        border-top: 1px dashed var(--divider-color, #e0e0e0);
        padding-top: 12px;
        margin-top: 8px;
      }
      .highlights-header {
        font-weight: bold;
        font-size: 0.9em;
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: var(--secondary-text-color);
      }
      .highlight-rule-row {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-bottom: 8px;
      }
      .highlight-rule-row ha-textfield {
        flex: 1;
      }
      .expand-icon {
        transition: transform 0.2s ease;
      }
      .expand-icon.expanded {
        transform: rotate(180deg);
      }
      ha-textfield {
        display: block;
      }
      h3 {
        margin: 8px 0 0 0;
      }
      p {
        margin: 0;
        font-size: 0.9em;
        color: var(--secondary-text-color);
      }
    `;
  }

  public setConfig(config: DeviceTableCardConfig): void {
    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    const columns = this._config.columns || [];

    return html`
      <div class="card-config">
        <!-- Section 1: General & Filters -->
        <div class="section">
          <div
            class="section-header"
            @click=${() => (this._generalExpanded = !this._generalExpanded)}
            @keydown=${this._handleKeyDown}
            tabindex="0"
            role="button"
            aria-expanded=${this._generalExpanded}
          >
            <span>General & Filters</span>
            <svg
              class="expand-icon ${this._generalExpanded ? 'expanded' : ''}"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
          ${
            this._generalExpanded
              ? html`
                  <div class="section-content">
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
                  </div>
                `
              : ''
          }
        </div>

        <!-- Section 2: Columns -->
        <div class="section">
          <div
            class="section-header"
            @click=${() => (this._columnsExpanded = !this._columnsExpanded)}
            @keydown=${this._handleKeyDown}
            tabindex="0"
            role="button"
            aria-expanded=${this._columnsExpanded}
          >
            <span>Table Columns</span>
            <svg
              class="expand-icon ${this._columnsExpanded ? 'expanded' : ''}"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
          ${
            this._columnsExpanded
              ? html`
                  <div class="section-content">
                    <!-- Presets -->
                    <div>
                      <p style="margin-bottom: 4px; font-weight: bold;">Quick Presets:</p>
                      <div class="presets-container">
                        <div
                          class="preset-badge"
                          @click=${() => this._addColumnPreset('battery')}
                          @keydown=${this._handleKeyDown}
                          tabindex="0"
                          role="button"
                        >
                          + Battery
                        </div>
                        <div
                          class="preset-badge"
                          @click=${() => this._addColumnPreset('moisture')}
                          @keydown=${this._handleKeyDown}
                          tabindex="0"
                          role="button"
                        >
                          + Moisture
                        </div>
                        <div
                          class="preset-badge"
                          @click=${() => this._addColumnPreset('device_name')}
                          @keydown=${this._handleKeyDown}
                          tabindex="0"
                          role="button"
                        >
                          + Device Name
                        </div>
                        <div
                          class="preset-badge"
                          @click=${() => this._addColumnPreset('last_seen')}
                          @keydown=${this._handleKeyDown}
                          tabindex="0"
                          role="button"
                        >
                          + Last Seen
                        </div>
                      </div>
                    </div>

                    <!-- Column Items List -->
                    ${columns.map((col, index) => this._renderColumnItem(col, index))}

                    <!-- Add Custom Column Button -->
                    <button
                      class="btn btn-secondary"
                      style="width: 100%;"
                      @click=${() => this._addColumn()}
                    >
                      + Add Custom Column
                    </button>
                  </div>
                `
              : ''
          }
        </div>
      </div>
    `;
  }

  private _renderColumnItem(col: ColumnConfig, index: number): TemplateResult {
    const isExpanded = this._expandedColumnIndex === index;
    const columnsCount = this._config?.columns?.length || 0;

    return html`
      <div class="column-item">
        <div
          class="column-header"
          @click=${() => this._toggleColumn(index)}
          @keydown=${this._handleKeyDown}
          tabindex="0"
          role="button"
          aria-expanded=${isExpanded}
        >
          <div class="column-header-title">
            <svg
              class="expand-icon ${isExpanded ? 'expanded' : ''}"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
            <span>${col.label || col.prop || col.device_class || `Column ${index + 1}`}</span>
            <span class="column-badge">${col.type}</span>
          </div>
          <div class="column-actions" @click=${(e: Event) => e.stopPropagation()}>
            <button
              class="btn-icon"
              title="Move Up"
              aria-label="Move Up"
              .disabled=${index === 0}
              @click=${() => this._moveColumn(index, 'up')}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="12" y1="19" x2="12" y2="5"></line>
                <polyline points="5 12 12 5 19 12"></polyline>
              </svg>
            </button>
            <button
              class="btn-icon"
              title="Move Down"
              aria-label="Move Down"
              .disabled=${index === columnsCount - 1}
              @click=${() => this._moveColumn(index, 'down')}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <polyline points="19 12 12 19 5 12"></polyline>
              </svg>
            </button>
            <button
              class="btn-icon btn-danger"
              style="color: var(--error-color, #e53935);"
              title="Delete Column"
              aria-label="Delete Column"
              @click=${() => this._deleteColumn(index)}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="3 6 5 6 21 6"></polyline>
                <path
                  d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                ></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </button>
          </div>
        </div>

        ${
          isExpanded
            ? html`
                <div class="column-body">
                  <div class="form-row">
                    <span style="font-weight: 500; font-size: 0.9em; flex: 0 0 80px;">Type:</span>
                    <select
                      .value=${col.type}
                      @change=${(e: any) => this._updateColumnProperty(index, 'type', e.target.value)}
                    >
                      <option value="device">Device Property</option>
                      <option value="entity">Entity State</option>
                      <option value="meta">Meta Property</option>
                    </select>
                  </div>

                  <ha-textfield
                    label="Column Header Label"
                    .value=${col.label || ''}
                    @input=${(e: any) => this._updateColumnProperty(index, 'label', e.target.value)}
                    maxlength="100"
                  ></ha-textfield>

                  <!-- Conditional inputs based on type -->
                  ${
                    col.type === 'device'
                      ? html`
                          <div class="form-row">
                            <span style="font-weight: 500; font-size: 0.9em; flex: 0 0 80px;"
                              >Property:</span
                            >
                            <select
                              .value=${col.prop || 'name'}
                              @change=${(e: any) =>
                                this._updateColumnProperty(index, 'prop', e.target.value)}
                            >
                              <option value="name">Name</option>
                              <option value="area">Area</option>
                              <option value="integration">Integration</option>
                              <option value="manufacturer">Manufacturer</option>
                            </select>
                          </div>
                        `
                      : ''
                  }
                  ${
                    col.type === 'meta'
                      ? html`
                          <div class="form-row">
                            <span style="font-weight: 500; font-size: 0.9em; flex: 0 0 80px;"
                              >Property:</span
                            >
                            <select
                              .value=${col.prop || 'last_changed'}
                              @change=${(e: any) =>
                                this._updateColumnProperty(index, 'prop', e.target.value)}
                            >
                              <option value="last_changed">Last Seen / Last Changed</option>
                            </select>
                          </div>
                        `
                      : ''
                  }
                  ${
                    col.type === 'entity'
                      ? html`
                          <ha-textfield
                            label="Device Class (e.g. battery, moisture)"
                            .value=${col.device_class || ''}
                            @input=${(e: any) =>
                              this._updateColumnProperty(index, 'device_class', e.target.value)}
                            maxlength="100"
                          ></ha-textfield>
                          <ha-textfield
                            label="Entity ID Suffix (optional, e.g. _voltage)"
                            .value=${col.suffix || ''}
                            @input=${(e: any) =>
                              this._updateColumnProperty(index, 'suffix', e.target.value)}
                            maxlength="100"
                          ></ha-textfield>
                        `
                      : ''
                  }

                  <!-- Highlights Editor (available for entity and meta columns) -->
                  ${
                    col.type === 'entity' || col.type === 'meta'
                      ? html`
                          <div class="highlights-editor">
                            <div class="highlights-header">
                              <span>Threshold Highlights</span>
                              <button
                                class="btn btn-secondary btn-icon"
                                style="width: auto; height: auto; border-radius: 4px; padding: 4px 8px;"
                                @click=${() => this._addHighlightRule(index)}
                              >
                                + Add Rule
                              </button>
                            </div>
                            ${(col.highlight || []).map(
                              (hl, hlIndex) => html`
                                <div class="highlight-rule-row">
                                  <ha-textfield
                                    label="Below"
                                    .value=${hl.below !== undefined ? String(hl.below) : ''}
                                    @input=${(e: any) =>
                                      this._updateHighlightRule(
                                        index,
                                        hlIndex,
                                        'below',
                                        e.target.value === '' ? undefined : e.target.value,
                                      )}
                                  ></ha-textfield>
                                  <ha-textfield
                                    label="Above"
                                    .value=${hl.above !== undefined ? String(hl.above) : ''}
                                    @input=${(e: any) =>
                                      this._updateHighlightRule(
                                        index,
                                        hlIndex,
                                        'above',
                                        e.target.value === '' ? undefined : e.target.value,
                                      )}
                                  ></ha-textfield>
                                  <ha-textfield
                                    label="Color"
                                    .value=${hl.color || ''}
                                    @input=${(e: any) =>
                                      this._updateHighlightRule(
                                        index,
                                        hlIndex,
                                        'color',
                                        e.target.value,
                                      )}
                                    maxlength="50"
                                  ></ha-textfield>
                                  <button
                                    class="btn-icon"
                                    style="color: var(--error-color, #e53935);"
                                    title="Delete Rule"
                                    aria-label="Delete Rule"
                                    @click=${() => this._deleteHighlightRule(index, hlIndex)}
                                  >
                                    <svg
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      stroke-width="2"
                                      stroke-linecap="round"
                                      stroke-linejoin="round"
                                    >
                                      <polyline points="3 6 5 6 21 6"></polyline>
                                      <path
                                        d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                                      ></path>
                                      <line x1="10" y1="11" x2="10" y2="17"></line>
                                      <line x1="14" y1="11" x2="14" y2="17"></line>
                                    </svg>
                                  </button>
                                </div>
                              `,
                            )}
                          </div>
                        `
                      : ''
                  }
                </div>
              `
            : ''
        }
      </div>
    `;
  }

  private _toggleColumn(index: number): void {
    this._expandedColumnIndex = this._expandedColumnIndex === index ? null : index;
  }

  private _addColumnPreset(preset: string): void {
    if (!this._config) return;
    const newConfig = { ...this._config };
    const columns = [...(newConfig.columns || [])];

    let newCol: ColumnConfig;
    if (preset === 'battery') {
      newCol = {
        type: 'entity',
        device_class: 'battery',
        label: 'Battery',
        highlight: [
          {
            below: 15,
            color: 'red',
          },
        ],
      };
    } else if (preset === 'moisture') {
      newCol = {
        type: 'entity',
        device_class: 'moisture',
        label: 'Moisture (%)',
        highlight: [
          {
            below: 30,
            color: 'orange',
          },
        ],
      };
    } else if (preset === 'device_name') {
      newCol = {
        type: 'device',
        prop: 'name',
        label: 'Device',
      };
    } else if (preset === 'last_seen') {
      newCol = {
        type: 'meta',
        prop: 'last_changed',
        label: 'Last Seen',
      };
    } else {
      return;
    }

    columns.push(newCol);
    newConfig.columns = columns;
    this._expandedColumnIndex = columns.length - 1;
    this._columnsExpanded = true;
    fireEvent(this, 'config-changed', { config: newConfig });
  }

  private _addColumn(): void {
    if (!this._config) return;
    const newConfig = { ...this._config };
    const columns = [...(newConfig.columns || [])];
    const newCol: ColumnConfig = {
      type: 'device',
      prop: 'name',
      label: `Column ${columns.length + 1}`,
    };
    columns.push(newCol);
    newConfig.columns = columns;
    this._expandedColumnIndex = columns.length - 1;
    this._columnsExpanded = true;
    fireEvent(this, 'config-changed', { config: newConfig });
  }

  private _deleteColumn(index: number): void {
    if (!this._config) return;
    const newConfig = { ...this._config };
    const columns = [...(newConfig.columns || [])];
    columns.splice(index, 1);
    newConfig.columns = columns;
    if (this._expandedColumnIndex === index) {
      this._expandedColumnIndex = null;
    } else if (this._expandedColumnIndex !== null && this._expandedColumnIndex > index) {
      this._expandedColumnIndex--;
    }
    fireEvent(this, 'config-changed', { config: newConfig });
  }

  private _moveColumn(index: number, direction: 'up' | 'down'): void {
    if (!this._config || !this._config.columns) return;
    const newConfig = { ...this._config };
    const columns = [...this._config.columns];

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= columns.length) return;

    // Swap elements
    const temp = columns[index];
    columns[index] = columns[targetIndex];
    columns[targetIndex] = temp;

    newConfig.columns = columns;

    // Adjust expanded index if necessary
    if (this._expandedColumnIndex === index) {
      this._expandedColumnIndex = targetIndex;
    } else if (this._expandedColumnIndex === targetIndex) {
      this._expandedColumnIndex = index;
    }

    fireEvent(this, 'config-changed', { config: newConfig });
  }

  private _updateColumnProperty(index: number, prop: string, value: any): void {
    if (!this._config || !this._config.columns) return;
    const newConfig = { ...this._config };
    const columns = [...this._config.columns];

    // Security check: block prototype pollution
    const forbidden = ['__proto__', 'constructor', 'prototype'];
    if (forbidden.includes(prop)) {
      return;
    }

    columns[index] = { ...columns[index], [prop]: value };

    // Set standard defaults when type changes
    if (prop === 'type') {
      if (value === 'device') {
        columns[index].prop = 'name';
        delete columns[index].device_class;
        delete columns[index].suffix;
        delete columns[index].highlight;
      } else if (value === 'entity') {
        columns[index].device_class = 'battery';
        delete columns[index].prop;
      } else if (value === 'meta') {
        columns[index].prop = 'last_changed';
        delete columns[index].device_class;
        delete columns[index].suffix;
      }
    }

    newConfig.columns = columns;
    fireEvent(this, 'config-changed', { config: newConfig });
  }

  private _addHighlightRule(colIndex: number): void {
    if (!this._config || !this._config.columns) return;
    const newConfig = { ...this._config };
    const columns = [...this._config.columns];
    const col = { ...columns[colIndex] };
    const highlight = [...(col.highlight || [])];

    highlight.push({
      below: undefined,
      above: undefined,
      color: 'red',
    });

    col.highlight = highlight;
    columns[colIndex] = col;
    newConfig.columns = columns;
    fireEvent(this, 'config-changed', { config: newConfig });
  }

  private _deleteHighlightRule(colIndex: number, ruleIndex: number): void {
    if (!this._config || !this._config.columns) return;
    const newConfig = { ...this._config };
    const columns = [...this._config.columns];
    const col = { ...columns[colIndex] };
    const highlight = [...(col.highlight || [])];

    highlight.splice(ruleIndex, 1);

    col.highlight = highlight;
    columns[colIndex] = col;
    newConfig.columns = columns;
    fireEvent(this, 'config-changed', { config: newConfig });
  }

  private _handleKeyDown(ev: KeyboardEvent): void {
    if (ev.key === 'Enter' || ev.key === ' ') {
      if (ev.target === ev.currentTarget) {
        ev.preventDefault();
        (ev.target as HTMLElement).click();
      }
    }
  }

  private _updateHighlightRule(
    colIndex: number,
    ruleIndex: number,
    prop: string,
    value: any,
  ): void {
    if (!this._config || !this._config.columns) return;
    const newConfig = { ...this._config };
    const columns = [...this._config.columns];
    const col = { ...columns[colIndex] };
    const highlight = [...(col.highlight || [])];

    // Security check: block prototype pollution
    const forbidden = ['__proto__', 'constructor', 'prototype'];
    if (forbidden.includes(prop)) {
      return;
    }

    highlight[ruleIndex] = { ...highlight[ruleIndex], [prop]: value };

    col.highlight = highlight;
    columns[colIndex] = col;
    newConfig.columns = columns;
    fireEvent(this, 'config-changed', { config: newConfig });
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

    // Security check: block prototype pollution
    const forbidden = ['__proto__', 'constructor', 'prototype'];
    if (forbidden.some((key) => configValue.includes(key))) {
      return;
    }

    const newConfig = { ...this._config };

    if (configValue.includes('.')) {
      const parts = configValue.split('.');
      let current: any = newConfig;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current[parts[i]] = { ...current[parts[i]] };
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
    } else {
      newConfig[configValue] = value;
    }

    fireEvent(this, 'config-changed', { config: newConfig });
  }
}
