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
    font-weight: 500;
    padding: 16px 8px;
    font-size: 0.9em;
    text-transform: uppercase;
  }

  table.dataTable td {
    border-bottom: 1px solid var(--divider-color);
    padding: 16px 8px;
    vertical-align: middle;
  }

  table.dataTable tbody tr:hover {
    background-color: var(--secondary-background-color) !important;
  }

  .cell-entity,
  .cell-device {
    cursor: pointer;
  }

  .cell-entity:hover,
  .cell-device:hover {
    text-decoration: underline;
  }

  .dataTables_wrapper .dataTables_filter {
    float: right;
    margin-bottom: 16px;
  }

  .dataTables_wrapper .dataTables_filter input {
    color: var(--primary-text-color);
    background-color: var(--secondary-background-color);
    border: none;
    border-bottom: 1px solid var(--secondary-text-color);
    border-radius: 4px 4px 0 0;
    padding: 8px 12px;
    margin-left: 8px;
    outline: none;
    transition: border-bottom-color 0.2s;
  }

  .dataTables_wrapper .dataTables_filter input:focus {
    border-bottom: 2px solid var(--primary-color);
  }

  .dataTables_wrapper .dataTables_length {
    float: left;
    margin-bottom: 16px;
    color: var(--secondary-text-color);
  }

  .dataTables_wrapper .dataTables_length select {
    color: var(--primary-text-color);
    background-color: var(--secondary-background-color);
    border: none;
    border-bottom: 1px solid var(--secondary-text-color);
    border-radius: 4px 4px 0 0;
    padding: 4px 8px;
    margin: 0 8px;
    outline: none;
  }

  .dataTables_wrapper .dataTables_info {
    float: left;
    color: var(--secondary-text-color) !important;
    padding-top: 16px;
    font-size: 0.9em;
  }

  .dataTables_wrapper .dataTables_paginate {
    float: right;
    color: var(--secondary-text-color) !important;
    padding-top: 12px;
  }

  .dataTables_wrapper .dataTables_paginate .paginate_button {
    color: var(--primary-text-color) !important;
    border: 1px solid transparent !important;
    border-radius: 4px;
    padding: 4px 12px;
    margin-left: 4px;
    cursor: pointer;
    background: transparent !important;
  }

  .dataTables_wrapper .dataTables_paginate .paginate_button.current {
    background: var(--primary-color) !important;
    color: var(--text-primary-color) !important;
    border: 1px solid var(--primary-color) !important;
  }

  .dataTables_wrapper .dataTables_paginate .paginate_button:hover {
    background: var(--secondary-background-color) !important;
    color: var(--primary-text-color) !important;
    border: 1px solid var(--divider-color) !important;
  }

  .dataTables_wrapper .dataTables_paginate .paginate_button.disabled,
  .dataTables_wrapper .dataTables_paginate .paginate_button.disabled:hover {
    color: var(--disabled-text-color) !important;
    cursor: default;
    background: transparent !important;
    border: 1px solid transparent !important;
  }

  /* Clearfix for DataTables wrapper */
  .dataTables_wrapper::after {
    content: '';
    display: block;
    clear: both;
  }

  /* Responsive styling adjustments */
  @media screen and (max-width: 600px) {
    .dataTables_wrapper .dataTables_filter,
    .dataTables_wrapper .dataTables_length,
    .dataTables_wrapper .dataTables_info,
    .dataTables_wrapper .dataTables_paginate {
      float: none;
      text-align: center;
      margin-bottom: 8px;
    }
    .dataTables_wrapper .dataTables_filter input {
      margin-left: 0;
      width: 100%;
      box-sizing: border-box;
    }
  }
`;
