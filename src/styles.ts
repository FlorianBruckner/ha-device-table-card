import { css, unsafeCSS } from 'lit';
import dtStyles from 'datatables.net-dt/css/dataTables.dataTables.css';
import responsiveStyles from 'datatables.net-responsive-dt/css/responsive.dataTables.css';

export const styles = css`
  :host {
    display: block;
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

  .card-content {
    padding: 16px;
  }

  #table-container {
    width: 100%;
    overflow: hidden;
  }

  table.dataTable thead th {
    border-bottom: 1px solid var(--divider-color);
    color: var(--secondary-text-color);
    text-align: left !important;
    font-weight: 500;
    padding: 16px 24px 16px 8px !important;
    font-size: 0.9em;
    text-transform: uppercase;
    position: relative;
  }

  table.dataTable thead th.dt-type-numeric {
    text-align: right !important;
    padding: 16px 24px 16px 8px !important;
  }

  table.dataTable td {
    border-bottom: 1px solid var(--divider-color);
    padding: 16px 8px;
    vertical-align: middle;
  }

  table.dataTable td.dt-type-numeric {
    text-align: right;
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

  .cell-entity:focus-visible,
  .cell-device:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
    text-decoration: underline;
  }

  /* DataTables 2.x Layout styling */
  .dt-container {
    padding: 0;
    display: flex;
    flex-direction: column;
    margin-bottom: 8px;
  }

  .dt-layout-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .dt-layout-row.dt-layout-table {
    display: block;
    margin: 16px 0;
  }

  .dt-layout-cell {
    display: flex;
    align-items: center;
  }

  .dt-layout-cell.dt-start {
    justify-content: flex-start;
  }

  .dt-layout-cell.dt-end {
    justify-content: flex-end;
  }

  .dt-search,
  .dataTables_wrapper .dataTables_filter {
    display: flex;
    align-items: center;
    color: var(--secondary-text-color);
  }

  .dt-search input,
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
    height: 40px;
    box-sizing: border-box;
  }

  .dt-search input:focus,
  .dataTables_wrapper .dataTables_filter input:focus {
    border-bottom: 2px solid var(--primary-color);
  }

  .dt-length,
  .dataTables_wrapper .dataTables_length {
    display: flex;
    align-items: center;
    color: var(--secondary-text-color);
  }

  .dt-length select,
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

  .dt-info,
  .dataTables_wrapper .dataTables_info {
    color: var(--secondary-text-color) !important;
    font-size: 0.9em;
    padding: 0;
  }

  .dt-paging,
  .dataTables_wrapper .dataTables_paginate {
    color: var(--secondary-text-color) !important;
    padding: 0;
    display: flex;
    align-items: center;
  }

  .dt-paging-button,
  .dataTables_wrapper .dataTables_paginate .paginate_button {
    color: var(--primary-text-color) !important;
    border: 1px solid transparent !important;
    border-radius: 4px;
    padding: 4px 12px;
    margin-left: 4px;
    cursor: pointer;
    background: transparent !important;
  }

  .dt-paging-button.current,
  .dataTables_wrapper .dataTables_paginate .paginate_button.current {
    background: var(--primary-color) !important;
    color: var(--text-primary-color) !important;
    border: 1px solid var(--primary-color) !important;
  }

  .dt-paging-button:hover,
  .dataTables_wrapper .dataTables_paginate .paginate_button:hover {
    background: var(--secondary-background-color) !important;
    color: var(--primary-text-color) !important;
    border: 1px solid var(--divider-color) !important;
  }

  .dt-paging-button.disabled,
  .dataTables_wrapper .dataTables_paginate .paginate_button.disabled,
  .dt-paging-button.disabled:hover,
  .dataTables_wrapper .dataTables_paginate .paginate_button.disabled:hover {
    color: var(--disabled-text-color) !important;
    cursor: default;
    background: transparent !important;
    border: 1px solid transparent !important;
  }

  /* Override DataTables 2.x default sorting icons positioning */
  table.dataTable thead th .dt-column-order {
    right: 4px !important;
    left: auto !important;
  }

  table.dataTable thead th::before,
  table.dataTable thead th::after {
    right: 8px !important;
    left: auto !important;
  }

  /* Responsive styling adjustments */
  @media screen and (max-width: 600px) {
    .dt-layout-row {
      flex-direction: column;
      gap: 8px;
    }

    .dt-layout-cell {
      justify-content: center !important;
      width: 100%;
    }

    .dataTables_wrapper .dataTables_filter,
    .dataTables_wrapper .dataTables_length,
    .dataTables_wrapper .dataTables_info,
    .dataTables_wrapper .dataTables_paginate {
      float: none;
      text-align: center;
    }
    .dataTables_wrapper .dataTables_filter input {
      margin-left: 0;
      width: 100%;
      box-sizing: border-box;
    }
  }
`;
