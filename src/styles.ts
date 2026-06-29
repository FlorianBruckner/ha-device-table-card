import { css, unsafeCSS } from 'lit';
import dtStyles from 'datatables.net-dt/css/dataTables.dataTables.css';
import responsiveStyles from 'datatables.net-responsive-dt/css/responsive.dataTables.css';

export const styles = css`
  :host {
    display: block;
    padding: 16px;
    min-height: 100px;
  }
  ha-card {
    padding: 16px;
  }
  ${unsafeCSS(dtStyles)}
  ${unsafeCSS(responsiveStyles)}

  table.dataTable {
    width: 100% !important;
    margin: 0 !important;
    background-color: var(--card-background-color);
    color: var(--primary-text-color);
    font-family: var(--paper-font-body1_-_font-family, inherit);
  }

  table.dataTable thead th {
    border-bottom: 1px solid var(--divider-color);
    color: var(--secondary-text-color);
    text-align: left;
    font-weight: bold;
    padding: 12px 8px;
  }

  table.dataTable td {
    border-bottom: 1px solid var(--divider-color);
    padding: 12px 8px;
  }

  table.dataTable tbody tr:hover {
    background-color: var(--secondary-background-color) !important;
  }

  .cell-entity, .cell-device {
    cursor: pointer;
  }

  .cell-entity:hover, .cell-device:hover {
    text-decoration: underline;
  }

  .dataTables_wrapper .dataTables_filter input {
    color: var(--primary-text-color);
    background-color: var(--card-background-color);
    border: 1px solid var(--divider-color);
    border-radius: 4px;
    padding: 6px;
    margin-left: 8px;
  }

  .dataTables_wrapper .dataTables_length select {
    color: var(--primary-text-color);
    background-color: var(--card-background-color);
    border: 1px solid var(--divider-color);
    border-radius: 4px;
    padding: 4px;
  }

  .dataTables_wrapper .dataTables_info,
  .dataTables_wrapper .dataTables_paginate {
    color: var(--secondary-text-color) !important;
    padding-top: 12px;
  }

  .dataTables_wrapper .dataTables_paginate .paginate_button {
    color: var(--primary-text-color) !important;
    border: 1px solid var(--divider-color) !important;
  }

  .dataTables_wrapper .dataTables_paginate .paginate_button.current {
    background: var(--primary-color) !important;
    color: var(--text-primary-color) !important;
    border: 1px solid var(--primary-color) !important;
  }

  .dataTables_wrapper .dataTables_paginate .paginate_button:hover {
    background: var(--secondary-background-color) !important;
    color: var(--primary-text-color) !important;
  }
`;
