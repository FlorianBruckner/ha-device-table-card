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
  }

  table.dataTable thead th {
    border-bottom: 1px solid var(--divider-color);
    color: var(--secondary-text-color);
    text-align: left;
  }

  table.dataTable td {
    border-bottom: 1px solid var(--divider-color);
  }

  .dataTables_wrapper .dataTables_filter input {
    color: var(--primary-text-color);
    background-color: var(--card-background-color);
    border: 1px solid var(--divider-color);
    border-radius: 4px;
    padding: 4px;
  }

  .dataTables_wrapper .dataTables_length select {
    color: var(--primary-text-color);
    background-color: var(--card-background-color);
  }
`;
