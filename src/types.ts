import { LovelaceCardConfig } from 'custom-card-helpers';

export interface DeviceTableCardConfig extends LovelaceCardConfig {
  type: string;
  filter?: FilterConfig;
  columns?: ColumnConfig[];
}

export interface FilterConfig {
  area?: string;
  anchor_entity_class?: string;
  integration?: string;
  manufacturer?: string;
}

export interface ColumnConfig {
  type: 'device' | 'entity' | 'meta';
  prop?: string;
  device_class?: string;
  suffix?: string;
  label?: string;
  highlight?: ThresholdHighlight[];
}

export interface ThresholdHighlight {
  below?: number;
  above?: number;
  color: string;
}

export interface DeviceData {
  id: string;
  name: string;
  area: string;
  integration: string;
  manufacturer: string;
  [key: string]: any; // To allow dynamic column keys
  _entities: Record<string, any>; // Store actual state objects for internal use
}
