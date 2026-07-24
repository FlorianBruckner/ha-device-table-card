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
  @state() private _confirmDeleteColumnIndex: number | null = null;
  @state() private _confirmDeleteHighlightIndex: { colIndex: number; hlIndex: number } | null =
    null;
  private _focusQuery: string | null = null;

  private _handleGlobalClick = (ev: Event): void => {
    const path = ev.composedPath();
    let isDeleteClick = false;
    for (const node of path) {
      if (node instanceof HTMLElement && node.closest('.btn-danger')) {
        isDeleteClick = true;
        break;
      }
    }
    if (!isDeleteClick) {
      this._confirmDeleteColumnIndex = null;
      this._confirmDeleteHighlightIndex = null;
    }
  };

  public connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('click', this._handleGlobalClick);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('click', this._handleGlobalClick);
  }

  protected updated(changedProperties: any): void {
    super.updated(changedProperties);
    if (this._focusQuery !== null) {
      const query = this._focusQuery;
      this._focusQuery = null;
      const el = this.renderRoot.querySelector(query) as HTMLElement;
      el?.focus();
    }
  }

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
        transition:
          background-color 0.2s,
          color 0.2s;
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
        transition:
          background-color 0.2s,
          color 0.2s;
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
        transition:
          background-color 0.2s,
          opacity 0.2s;
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
        transition:
          background-color 0.2s,
          color 0.2s,
          opacity 0.2s;
      }
      .btn-icon:hover:not(:disabled) {
        background-color: var(--secondary-background-color, rgba(0, 0, 0, 0.05));
        color: var(--primary-text-color, #000);
      }
      .btn-icon:focus-visible {
        outline: 2px solid var(--primary-color, #03a9f4);
        outline-offset: -2px;
      }
      .btn-icon:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        pointer-events: none;
      }
      .form-row {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .form-row ha-textfield,
      .form-row ha-input,
      .form-row .native-input-container,
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
        transition:
          background-color 0.2s,
          color 0.2s;
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
      .highlight-rule-row ha-textfield,
      .highlight-rule-row ha-input,
      .highlight-rule-row .native-input-container {
        flex: 1;
      }
      .expand-icon {
        transition: transform 0.2s ease;
      }
      .expand-icon.expanded {
        transform: rotate(180deg);
      }
      ha-textfield,
      ha-input,
      .native-input-container {
        display: block;
        width: 100%;
      }
      .native-input-container {
        display: flex;
        flex-direction: column;
        gap: 4px;
        width: 100%;
      }
      .native-input-container label {
        font-size: 0.85em;
        color: var(--secondary-text-color);
        font-weight: 500;
      }
      .native-input {
        height: 40px;
        padding: 0 12px;
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: 4px;
        background-color: var(--card-background-color, #fff);
        color: var(--primary-text-color, #000);
        font-family: inherit;
        font-size: 1em;
        box-sizing: border-box;
        width: 100%;
      }
      .native-input:focus {
        border-color: var(--primary-color, #03a9f4);
        outline: none;
      }
      .helper-text {
        font-size: 0.8em;
        font-style: italic;
        color: var(--secondary-text-color, #727272);
        margin-top: 4px;
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
    this._config = this._sanitizeConfig(config);
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
            aria-expanded=${this._generalExpanded ? 'true' : 'false'}
            aria-controls="general-section-content"
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
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
          ${
            this._generalExpanded
              ? html`
                  <div id="general-section-content" class="section-content">
                    ${this._renderInput(
                      'Title',
                      this._config.title || '',
                      'title',
                      this._valueChanged,
                      '100',
                      'Optional card header title',
                    )}

                    <h3>Filters</h3>
                    ${this._renderInput(
                      'Area',
                      this._config.filter?.area || '',
                      'filter.area',
                      this._valueChanged,
                      '100',
                      'Only show devices located in this specific area',
                    )}
                    ${this._renderInput(
                      'Anchor Entity Device Class',
                      this._config.filter?.anchor_entity_class || '',
                      'filter.anchor_entity_class',
                      this._valueChanged,
                      '100',
                      'Only show devices containing an entity with this device class (e.g. battery, moisture)',
                    )}
                    ${this._renderInput(
                      'Integration (e.g. zha, mqtt, hue)',
                      this._config.filter?.integration || '',
                      'filter.integration',
                      this._valueChanged,
                      '100',
                      'Only show devices from this integration domain',
                    )}
                    ${this._renderInput(
                      'Manufacturer (e.g. LUMI, Sonoff)',
                      this._config.filter?.manufacturer || '',
                      'filter.manufacturer',
                      this._valueChanged,
                      '100',
                      'Only show devices made by this manufacturer',
                    )}
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
            aria-expanded=${this._columnsExpanded ? 'true' : 'false'}
            aria-controls="columns-section-content"
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
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
          ${
            this._columnsExpanded
              ? html`
                  <div id="columns-section-content" class="section-content">
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
                          aria-label="Add Battery column preset"
                        >
                          + Battery
                        </div>
                        <div
                          class="preset-badge"
                          @click=${() => this._addColumnPreset('moisture')}
                          @keydown=${this._handleKeyDown}
                          tabindex="0"
                          role="button"
                          aria-label="Add Moisture column preset"
                        >
                          + Moisture
                        </div>
                        <div
                          class="preset-badge"
                          @click=${() => this._addColumnPreset('device_name')}
                          @keydown=${this._handleKeyDown}
                          tabindex="0"
                          role="button"
                          aria-label="Add Device Name column preset"
                        >
                          + Device Name
                        </div>
                        <div
                          class="preset-badge"
                          @click=${() => this._addColumnPreset('last_seen')}
                          @keydown=${this._handleKeyDown}
                          tabindex="0"
                          role="button"
                          aria-label="Add Last Seen column preset"
                        >
                          + Last Seen
                        </div>
                      </div>
                    </div>

                    <!-- Column Items List -->
                    ${columns.map((col, index) => this._renderColumnItem(col, index))}

                    <!-- Add Custom Column Button -->
                    <button
                      id="add-column-btn"
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
          data-index=${index}
          @click=${() => this._toggleColumn(index)}
          @keydown=${this._handleKeyDown}
          tabindex="0"
          role="button"
          aria-expanded=${isExpanded ? 'true' : 'false'}
          aria-controls="column-body-${index}"
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
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
            <span>${col.label || col.prop || col.device_class || `Column ${index + 1}`}</span>
            <span class="column-badge">${col.type}</span>
          </div>
          <div class="column-actions" @click=${(e: Event) => e.stopPropagation()}>
            <button
              class="btn-icon"
              title=${index === 0 ? 'Cannot move up (already at top)' : 'Move Up'}
              aria-label=${index === 0 ? 'Cannot move up (already at top)' : 'Move Up'}
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
                aria-hidden="true"
              >
                <line x1="12" y1="19" x2="12" y2="5"></line>
                <polyline points="5 12 12 5 19 12"></polyline>
              </svg>
            </button>
            <button
              class="btn-icon"
              title=${index === columnsCount - 1 ? 'Cannot move down (already at bottom)' : 'Move Down'}
              aria-label=${index === columnsCount - 1 ? 'Cannot move down (already at bottom)' : 'Move Down'}
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
                aria-hidden="true"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <polyline points="19 12 12 19 5 12"></polyline>
              </svg>
            </button>
            <button
              class="btn-icon btn-danger"
              style=${
                this._confirmDeleteColumnIndex === index
                  ? 'background-color: var(--error-color, #e53935); color: #fff;'
                  : 'color: var(--error-color, #e53935);'
              }
              title=${this._confirmDeleteColumnIndex === index ? 'Confirm Delete Column' : 'Delete Column'}
              aria-label=${this._confirmDeleteColumnIndex === index ? 'Confirm Delete Column' : 'Delete Column'}
              @click=${() => this._deleteColumn(index)}
            >
              ${
                this._confirmDeleteColumnIndex === index
                  ? html`
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    `
                  : html`
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                      >
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path
                          d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                        ></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
                    `
              }
            </button>
          </div>
        </div>

        ${
          isExpanded
            ? html`
                <div id="column-body-${index}" class="column-body">
                  <div class="form-row">
                    <label
                      for="select-type-${index}"
                      style="font-weight: 500; font-size: 0.9em; flex: 0 0 80px;"
                      >Type:</label
                    >
                    <select
                      id="select-type-${index}"
                      .value=${col.type}
                      @change=${(e: any) => this._updateColumnProperty(index, 'type', e.target.value)}
                    >
                      <option value="device">Device Property</option>
                      <option value="entity">Entity State</option>
                      <option value="meta">Meta Property</option>
                    </select>
                  </div>

                  ${this._renderInput(
                    'Column Header Label',
                    col.label || '',
                    undefined,
                    (e: any) => this._updateColumnProperty(index, 'label', e.target.value),
                    '100',
                    'Custom header text to display for this column',
                  )}

                  <!-- Conditional inputs based on type -->
                  ${
                    col.type === 'device'
                      ? html`
                          <div class="form-row">
                            <label
                              for="select-prop-${index}"
                              style="font-weight: 500; font-size: 0.9em; flex: 0 0 80px;"
                              >Property:</label
                            >
                            <select
                              id="select-prop-${index}"
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
                            <label
                              for="select-prop-${index}"
                              style="font-weight: 500; font-size: 0.9em; flex: 0 0 80px;"
                              >Property:</label
                            >
                            <select
                              id="select-prop-${index}"
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
                          ${this._renderInput(
                            'Device Class (e.g. battery, moisture)',
                            col.device_class || '',
                            undefined,
                            (e: any) =>
                              this._updateColumnProperty(index, 'device_class', e.target.value),
                            '100',
                            'Match an entity by its device class',
                          )}
                          ${this._renderInput(
                            'Entity ID Suffix (optional, e.g. _voltage)',
                            col.suffix || '',
                            undefined,
                            (e: any) => this._updateColumnProperty(index, 'suffix', e.target.value),
                            '100',
                            'Find entity with an entity ID ending with this suffix',
                          )}
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
                                data-add-rule-col-index=${index}
                                @click=${() => this._addHighlightRule(index)}
                              >
                                + Add Rule
                              </button>
                            </div>
                            ${(col.highlight || []).map(
                              (hl, hlIndex) => html`
                                <div
                                  class="highlight-rule-row"
                                  data-col-index=${index}
                                  data-hl-index=${hlIndex}
                                >
                                  ${this._renderInput(
                                    'Below',
                                    hl.below !== undefined ? String(hl.below) : '',
                                    undefined,
                                    (e: any) =>
                                      this._updateHighlightRule(
                                        index,
                                        hlIndex,
                                        'below',
                                        e.target.value === '' ? undefined : e.target.value,
                                      ),
                                    '100',
                                    'Trigger value below',
                                  )}
                                  ${this._renderInput(
                                    'Above',
                                    hl.above !== undefined ? String(hl.above) : '',
                                    undefined,
                                    (e: any) =>
                                      this._updateHighlightRule(
                                        index,
                                        hlIndex,
                                        'above',
                                        e.target.value === '' ? undefined : e.target.value,
                                      ),
                                    '100',
                                    'Trigger value above',
                                  )}
                                  ${this._renderInput(
                                    'Color',
                                    hl.color || '',
                                    undefined,
                                    (e: any) =>
                                      this._updateHighlightRule(
                                        index,
                                        hlIndex,
                                        'color',
                                        e.target.value,
                                      ),
                                    '50',
                                    'CSS color name or hex',
                                  )}
                                  <button
                                    class="btn-icon btn-danger"
                                    style=${
                                      this._confirmDeleteHighlightIndex &&
                                      this._confirmDeleteHighlightIndex.colIndex === index &&
                                      this._confirmDeleteHighlightIndex.hlIndex === hlIndex
                                        ? 'background-color: var(--error-color, #e53935); color: #fff;'
                                        : 'color: var(--error-color, #e53935);'
                                    }
                                    title=${
                                      this._confirmDeleteHighlightIndex &&
                                      this._confirmDeleteHighlightIndex.colIndex === index &&
                                      this._confirmDeleteHighlightIndex.hlIndex === hlIndex
                                        ? 'Confirm Delete Rule'
                                        : 'Delete Rule'
                                    }
                                    aria-label=${
                                      this._confirmDeleteHighlightIndex &&
                                      this._confirmDeleteHighlightIndex.colIndex === index &&
                                      this._confirmDeleteHighlightIndex.hlIndex === hlIndex
                                        ? 'Confirm Delete Rule'
                                        : 'Delete Rule'
                                    }
                                    @click=${() => this._deleteHighlightRule(index, hlIndex)}
                                  >
                                    ${
                                      this._confirmDeleteHighlightIndex &&
                                      this._confirmDeleteHighlightIndex.colIndex === index &&
                                      this._confirmDeleteHighlightIndex.hlIndex === hlIndex
                                        ? html`
                                            <svg
                                              width="16"
                                              height="16"
                                              viewBox="0 0 24 24"
                                              fill="none"
                                              stroke="currentColor"
                                              stroke-width="2.5"
                                              stroke-linecap="round"
                                              stroke-linejoin="round"
                                              aria-hidden="true"
                                            >
                                              <polyline points="20 6 9 17 4 12"></polyline>
                                            </svg>
                                          `
                                        : html`
                                            <svg
                                              width="16"
                                              height="16"
                                              viewBox="0 0 24 24"
                                              fill="none"
                                              stroke="currentColor"
                                              stroke-width="2"
                                              stroke-linecap="round"
                                              stroke-linejoin="round"
                                              aria-hidden="true"
                                            >
                                              <polyline points="3 6 5 6 21 6"></polyline>
                                              <path
                                                d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                                              ></path>
                                              <line x1="10" y1="11" x2="10" y2="17"></line>
                                              <line x1="14" y1="11" x2="14" y2="17"></line>
                                            </svg>
                                          `
                                    }
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

  private _renderInput(
    label: string,
    value: string,
    configValue: string | undefined,
    onInput: (e: any) => void,
    maxlength = '100',
    helperText?: string,
  ): TemplateResult {
    if (customElements.get('ha-input')) {
      return html`
        <ha-input
          label=${label}
          .value=${value}
          .configValue=${configValue}
          .helper=${helperText || ''}
          @input=${onInput}
          maxlength=${maxlength}
        ></ha-input>
      `;
    }
    if (customElements.get('ha-textfield')) {
      return html`
        <ha-textfield
          label=${label}
          .value=${value}
          .configValue=${configValue}
          .helper=${helperText || ''}
          @input=${onInput}
          maxlength=${maxlength}
        ></ha-textfield>
      `;
    }
    const inputId = `input-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${configValue?.replace(/\./g, '-') || Math.random().toString(36).substring(2, 7)}`;
    return html`
      <div class="native-input-container">
        <label for=${inputId}>${label}</label>
        <input
          id=${inputId}
          type="text"
          .value=${value}
          .configValue=${configValue}
          @input=${onInput}
          maxlength=${maxlength}
          class="native-input"
        />
        ${helperText ? html`<div class="helper-text">${helperText}</div>` : ''}
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
    const newIndex = columns.length - 1;
    this._expandedColumnIndex = newIndex;
    this._columnsExpanded = true;
    this._focusQuery = `.column-header[data-index="${newIndex}"]`;
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
    const newIndex = columns.length - 1;
    this._expandedColumnIndex = newIndex;
    this._columnsExpanded = true;
    this._focusQuery = `.column-header[data-index="${newIndex}"]`;
    fireEvent(this, 'config-changed', { config: newConfig });
  }

  private _deleteColumn(index: number): void {
    if (!this._config) return;
    if (this._confirmDeleteColumnIndex !== index) {
      this._confirmDeleteColumnIndex = index;
      this._confirmDeleteHighlightIndex = null;
      return;
    }
    this._confirmDeleteColumnIndex = null;

    const newConfig = { ...this._config };
    const columns = [...(newConfig.columns || [])];
    columns.splice(index, 1);
    newConfig.columns = columns;
    if (this._expandedColumnIndex === index) {
      this._expandedColumnIndex = null;
    } else if (this._expandedColumnIndex !== null && this._expandedColumnIndex > index) {
      this._expandedColumnIndex--;
    }
    if (columns.length > 0) {
      const nextFocusIndex = Math.min(index, columns.length - 1);
      this._focusQuery = `.column-header[data-index="${nextFocusIndex}"]`;
    } else {
      this._focusQuery = '#add-column-btn';
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

    this._focusQuery = `.column-header[data-index="${targetIndex}"]`;
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
    const ruleIndex = highlight.length - 1;
    this._focusQuery = `.highlight-rule-row[data-col-index="${colIndex}"][data-hl-index="${ruleIndex}"] ha-input, .highlight-rule-row[data-col-index="${colIndex}"][data-hl-index="${ruleIndex}"] ha-textfield, .highlight-rule-row[data-col-index="${colIndex}"][data-hl-index="${ruleIndex}"] input`;
    fireEvent(this, 'config-changed', { config: newConfig });
  }

  private _deleteHighlightRule(colIndex: number, ruleIndex: number): void {
    if (!this._config || !this._config.columns) return;
    if (
      !this._confirmDeleteHighlightIndex ||
      this._confirmDeleteHighlightIndex.colIndex !== colIndex ||
      this._confirmDeleteHighlightIndex.hlIndex !== ruleIndex
    ) {
      this._confirmDeleteHighlightIndex = { colIndex, hlIndex: ruleIndex };
      this._confirmDeleteColumnIndex = null;
      return;
    }
    this._confirmDeleteHighlightIndex = null;

    const newConfig = { ...this._config };
    const columns = [...this._config.columns];
    const col = { ...columns[colIndex] };
    const highlight = [...(col.highlight || [])];

    highlight.splice(ruleIndex, 1);

    col.highlight = highlight;
    columns[colIndex] = col;
    newConfig.columns = columns;

    if (highlight.length > 0) {
      const nextFocusIndex = Math.min(ruleIndex, highlight.length - 1);
      this._focusQuery = `.highlight-rule-row[data-col-index="${colIndex}"][data-hl-index="${nextFocusIndex}"] ha-input, .highlight-rule-row[data-col-index="${colIndex}"][data-hl-index="${nextFocusIndex}"] ha-textfield, .highlight-rule-row[data-col-index="${colIndex}"][data-hl-index="${nextFocusIndex}"] input`;
    } else {
      this._focusQuery = `button[data-add-rule-col-index="${colIndex}"]`;
    }
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
        const part = parts[i];
        if (!Object.prototype.hasOwnProperty.call(current, part) || !current[part]) {
          current[part] = {};
        }
        current[part] = { ...current[part] };
        current = current[part];
      }
      const lastPart = parts[parts.length - 1];
      if (!forbidden.includes(lastPart)) {
        current[lastPart] = value;
      }
    } else {
      if (!forbidden.includes(configValue)) {
        newConfig[configValue] = value;
      }
    }

    fireEvent(this, 'config-changed', { config: newConfig });
  }
}
