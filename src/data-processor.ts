import { DeviceData, DeviceTableCardConfig } from './types';

const FORBIDDEN_PROPS = new Set(['__proto__', 'constructor', 'prototype']);
const ALLOWED_DEVICE_PROPS = new Set(['model', 'sw_version', 'hw_version']);

// Fine-grained cache structure for individual devices.
interface DeviceCacheEntry {
  filtered: boolean;
  deviceData?: DeviceData;
  deviceRef: any;
  entitiesRawRef: any;
  nameByUser: string | undefined;
  name: string | undefined;
  areaId: string | undefined;
  manufacturer: string | undefined;
  areaLookupRef: any;
  entityStates?: Record<string, any>;
}

interface ConfigCacheEntry {
  entityCols: any[];
  deviceCols: any[];
  metaCols: any[];
  suffixCols: any[];
  requiredClasses: Set<string>;
  needsLastChanged: boolean;
  deviceCache: Map<string, DeviceCacheEntry>;
  lastFilter?: Record<string, any>;
}

// Performance Optimization: Cache pre-categorized column schema based on stable config reference.
// This avoids repeated schema iteration, branching, and Set/array allocations during frequent state updates.
const configCache = new WeakMap<DeviceTableCardConfig, ConfigCacheEntry>();

// Performance Optimization: Extract the cacheEvaluationResult helper to module-scoped function
// to avoid creating closure object instances inside the loop.
function cacheDeviceEvaluation(
  deviceCache: Map<string, DeviceCacheEntry>,
  deviceId: string,
  d: any,
  deviceEntitiesRaw: any[] | undefined,
  areaLookup: Record<string, string>,
  states: Record<string, any>,
  filtered: boolean,
  deviceData?: DeviceData,
  isStaticFilter = false,
): void {
  if (!deviceEntitiesRaw) return;
  let entityStates: Record<string, any> | undefined = undefined;
  if (!isStaticFilter) {
    entityStates = Object.create(null);
    for (let j = 0; j < deviceEntitiesRaw.length; j++) {
      const ent = deviceEntitiesRaw[j];
      const entId = ent.entity_id;
      entityStates![entId] = states[entId];
    }
  }
  const nameByUser = typeof d?.name_by_user === 'string' ? d.name_by_user : undefined;
  const name = typeof d?.name === 'string' ? d.name : undefined;
  const areaId = typeof d?.area_id === 'string' ? d.area_id : undefined;
  const manufacturer = typeof d?.manufacturer === 'string' ? d.manufacturer : undefined;

  deviceCache.set(deviceId, {
    filtered,
    deviceData,
    deviceRef: d,
    entitiesRawRef: deviceEntitiesRaw,
    nameByUser,
    name,
    areaId,
    manufacturer,
    areaLookupRef: areaLookup,
    entityStates,
  });
}

export function processDevices(
  hass: any,
  config: DeviceTableCardConfig,
  devices: any[],
  entitiesByDevice: Map<string, any[]>,
  areaLookup: Record<string, string>,
): DeviceData[] {
  if (
    !hass ||
    !config ||
    !Array.isArray(devices) ||
    devices.length === 0 ||
    !(entitiesByDevice instanceof Map)
  ) {
    return [];
  }

  const states = hass.states || {};
  let cache = configCache.get(config);

  const filter: any = {};
  if (config.filter && typeof config.filter === 'object') {
    for (const key of ['manufacturer', 'area', 'integration', 'anchor_entity_class']) {
      if ((config.filter as any)[key] !== undefined) {
        filter[key] = (config.filter as any)[key];
      }
    }
  }

  if (!cache) {
    const columnsRaw = Array.isArray(config.columns) ? config.columns : [];
    const columns = columnsRaw.map((c: any) => {
      if (!c || typeof c !== 'object') return {};
      const cleanCol: any = {};
      for (const key of ['type', 'prop', 'device_class', 'suffix', 'label', 'highlight']) {
        if (c[key] !== undefined) {
          cleanCol[key] = c[key];
        }
      }
      return cleanCol;
    });
    const entityCols = [];
    const deviceCols = [];
    const metaCols = [];
    const suffixCols = [];
    const requiredClasses = new Set<string>();
    let needsLastChanged = false;

    if (filter.anchor_entity_class) {
      requiredClasses.add(filter.anchor_entity_class);
    }

    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const m: any = { col, key: `col_${i}` };
      if (col.type === 'entity') {
        if (col.device_class) {
          m.resolveType = 'class';
          m.resolveKey = col.device_class;
        } else if (col.suffix) {
          m.resolveType = 'suffix';
          m.resolveKey = `col_${i}`;
        }
        entityCols.push(m);
        if (col.suffix) {
          m.suffix = col.suffix;
          suffixCols.push(m);
        }
        if (col.device_class) requiredClasses.add(col.device_class);
      } else if (col.type === 'device') {
        const prop = col.prop;
        if (typeof prop === 'string' && FORBIDDEN_PROPS.has(prop)) {
          m.strategy = 'forbidden';
        } else if (
          prop === 'name' ||
          prop === 'area' ||
          prop === 'integration' ||
          prop === 'manufacturer'
        ) {
          m.strategy = prop;
        } else if (typeof prop === 'string' && ALLOWED_DEVICE_PROPS.has(prop)) {
          m.strategy = 'allowed';
          m.prop = prop;
        } else {
          m.strategy = 'unknown';
        }
        deviceCols.push(m);
      } else if (col.type === 'meta') {
        metaCols.push(m);
        if (col.prop === 'last_changed') needsLastChanged = true;
      }
    }

    cache = {
      entityCols,
      deviceCols,
      metaCols,
      suffixCols,
      requiredClasses,
      needsLastChanged,
      deviceCache: new Map<string, DeviceCacheEntry>(),
    };
    configCache.set(config, cache);
  }

  const {
    entityCols,
    deviceCols,
    metaCols,
    suffixCols,
    requiredClasses,
    needsLastChanged,
    deviceCache,
  } = cache;

  // Security & Stability: Validate filter parameters.
  // If filter criteria have mutated under the same stable config reference, invalidate the deviceCache.
  if (!cache.lastFilter) {
    cache.lastFilter = { ...filter };
  } else {
    let filterChanged = false;
    for (const key of ['manufacturer', 'area', 'integration', 'anchor_entity_class']) {
      if (cache.lastFilter[key] !== filter[key]) {
        filterChanged = true;
        break;
      }
    }
    if (filterChanged) {
      deviceCache.clear();
      cache.lastFilter = { ...filter };
    }
  }

  const result: DeviceData[] = [];
  const anchorClass = filter.anchor_entity_class;

  for (let i = 0; i < devices.length; i++) {
    const d = devices[i];
    if (!d || typeof d !== 'object') continue;
    const deviceId = typeof d.id === 'string' ? d.id : undefined;
    if (!deviceId) continue;

    const deviceEntitiesRaw = entitiesByDevice.get(deviceId);

    // Performance Optimization: Fine-grained, state-reference based memoization for individual devices.
    // If device properties, area lookup context, entity registry arrays, and state objects remain unchanged,
    // we bypass all processing, calculations, filtering, and allocations for this device.
    if (deviceEntitiesRaw) {
      const cached = deviceCache.get(deviceId);
      if (
        cached &&
        (d === cached.deviceRef ||
          ((typeof d.name_by_user === 'string' ? d.name_by_user : undefined) ===
            cached.nameByUser &&
            (typeof d.name === 'string' ? d.name : undefined) === cached.name &&
            (typeof d.area_id === 'string' ? d.area_id : undefined) === cached.areaId &&
            (typeof d.manufacturer === 'string' ? d.manufacturer : undefined) ===
              cached.manufacturer)) &&
        areaLookup === cached.areaLookupRef &&
        deviceEntitiesRaw === cached.entitiesRawRef
      ) {
        if (!cached.entityStates) {
          if (!cached.filtered && cached.deviceData) {
            result.push(cached.deviceData);
          }
          continue;
        }
        let statesMatch = true;
        for (let j = 0; j < deviceEntitiesRaw.length; j++) {
          const ent = deviceEntitiesRaw[j];
          const entId = ent.entity_id;
          if (cached.entityStates[entId] !== states[entId]) {
            statesMatch = false;
            break;
          }
        }
        if (statesMatch) {
          if (!cached.filtered && cached.deviceData) {
            result.push(cached.deviceData);
          }
          continue;
        }
      }
    }

    const dNameByUser = typeof d.name_by_user === 'string' ? d.name_by_user : undefined;
    const dName = typeof d.name === 'string' ? d.name : undefined;
    const dAreaId = typeof d.area_id === 'string' ? d.area_id : undefined;
    const dManufacturer = typeof d.manufacturer === 'string' ? d.manufacturer : undefined;

    // 1. Manufacturer filter
    if (filter.manufacturer && (dManufacturer || 'Unknown') !== filter.manufacturer) {
      cacheDeviceEvaluation(
        deviceCache,
        deviceId,
        d,
        deviceEntitiesRaw,
        areaLookup,
        states,
        true,
        undefined,
        true,
      );
      continue;
    }

    // 2. Area filter
    if (filter.area) {
      const areaName =
        dAreaId && typeof areaLookup[dAreaId] === 'string'
          ? areaLookup[dAreaId]
          : dAreaId || 'No Area';
      if (areaName !== filter.area && dAreaId !== filter.area) {
        cacheDeviceEvaluation(
          deviceCache,
          deviceId,
          d,
          deviceEntitiesRaw,
          areaLookup,
          states,
          true,
          undefined,
          true,
        );
        continue;
      }
    }

    if (!deviceEntitiesRaw || deviceEntitiesRaw.length === 0) {
      continue;
    }

    const firstEnt = deviceEntitiesRaw[0];
    const entPlatform =
      firstEnt && typeof firstEnt === 'object' && typeof firstEnt.platform === 'string'
        ? firstEnt.platform
        : undefined;

    // 3. Integration filter (using the first entity's platform as proxy for device integration)
    if (filter.integration && (entPlatform || 'Unknown') !== filter.integration) {
      cacheDeviceEvaluation(
        deviceCache,
        deviceId,
        d,
        deviceEntitiesRaw,
        areaLookup,
        states,
        true,
        undefined,
        true,
      );
      continue;
    }

    // Single pass: Resolve states, match entities by device_class/suffix, find latest update, and check anchor filter
    // Performance Optimization: Use null-prototype objects to immunize against prototype pollution while allowing fast direct checks (e.g. `!== undefined`)
    const entitiesByClass: Record<string, any> = Object.create(null);
    const entitiesBySuffix: Record<string, any> = Object.create(null);
    let matchedClassesCount = 0;
    let matchedSuffixesCount = 0;
    let latestIso: string | null = null;
    let hasAnchor = !anchorClass;
    let hasValidEntities = false;

    for (let j = 0; j < deviceEntitiesRaw.length; j++) {
      const ent = deviceEntitiesRaw[j];
      const stateObj = states[ent.entity_id];
      if (!stateObj) continue;

      hasValidEntities = true;

      if (typeof stateObj !== 'object') continue;

      // Match by Device Class (Performance Optimization: Skip attribute/property extraction if all required classes and anchor are already matched)
      if (matchedClassesCount < requiredClasses.size || !hasAnchor) {
        let dClass: any = undefined;
        if (stateObj.attributes && typeof stateObj.attributes === 'object') {
          const val = stateObj.attributes.device_class;
          if (typeof val === 'string') {
            dClass = val;
          }
        }
        if (dClass === undefined && ent && typeof ent === 'object') {
          const val = ent.device_class;
          if (typeof val === 'string') {
            dClass = val;
          }
        }

        if (dClass && typeof dClass === 'string' && requiredClasses.has(dClass)) {
          if (entitiesByClass[dClass] === undefined) {
            entitiesByClass[dClass] = stateObj;
            matchedClassesCount++;
          }
          if (!hasAnchor && dClass === anchorClass) {
            hasAnchor = true;
          }
        }
      }

      // Match by Suffix (pre-calculated columns)
      if (matchedSuffixesCount < suffixCols.length) {
        for (let k = 0; k < suffixCols.length; k++) {
          const { key, suffix } = suffixCols[k];
          if (entitiesBySuffix[key] !== undefined) continue;
          if (ent.entity_id.endsWith(suffix!)) {
            entitiesBySuffix[key] = stateObj;
            matchedSuffixesCount++;
          }
        }
      }

      if (needsLastChanged) {
        const iso = stateObj.last_updated;
        if (iso && (latestIso === null || iso > latestIso)) {
          latestIso = iso;
        }
      }

      // Performance Optimization: Break early if we do not need last changed timestamp,
      // we have found the anchor, and we have already matched all required classes and suffix columns.
      if (
        !needsLastChanged &&
        hasAnchor &&
        matchedClassesCount === requiredClasses.size &&
        matchedSuffixesCount === suffixCols.length
      ) {
        break;
      }
    }

    if (!hasAnchor || !hasValidEntities) {
      cacheDeviceEvaluation(deviceCache, deviceId, d, deviceEntitiesRaw, areaLookup, states, true);
      continue;
    }

    const lastChanged = needsLastChanged && latestIso ? Date.parse(latestIso) : null;

    const areaName =
      dAreaId && typeof areaLookup[dAreaId] === 'string'
        ? areaLookup[dAreaId]
        : dAreaId || 'No Area';
    const manufacturer = dManufacturer || 'Unknown';
    const integration = entPlatform || 'Unknown';

    const deviceData: DeviceData = {
      id: deviceId,
      name: dNameByUser || dName || 'Unknown Device',
      area: areaName,
      integration: integration,
      manufacturer: manufacturer,
      _entities: Object.create(null),
    };

    // Resolve Device Columns
    for (let i = 0; i < deviceCols.length; i++) {
      const m = deviceCols[i];
      const { key, strategy } = m;

      if (strategy === 'name') deviceData[key] = deviceData.name;
      else if (strategy === 'area') deviceData[key] = deviceData.area;
      else if (strategy === 'integration') deviceData[key] = deviceData.integration;
      else if (strategy === 'manufacturer') deviceData[key] = deviceData.manufacturer;
      else if (strategy === 'allowed') {
        const val = d[m.prop];
        deviceData[key] = val !== undefined && val !== null ? String(val) : '-';
      } else {
        deviceData[key] = '-';
      }
    }

    // Resolve Entity Columns
    for (let i = 0; i < entityCols.length; i++) {
      const { key, resolveType, resolveKey } = entityCols[i];
      const stateObj =
        resolveType === 'class' ? entitiesByClass[resolveKey] : entitiesBySuffix[resolveKey];

      if (stateObj) {
        deviceData[key] = stateObj.state;
        deviceData._entities[key] = stateObj;
      } else {
        deviceData[key] = '-';
      }
    }

    // Resolve Meta Columns
    if (metaCols.length > 0) {
      for (let i = 0; i < metaCols.length; i++) {
        const { col, key } = metaCols[i];
        if (col.prop === 'last_changed') {
          deviceData[key] = lastChanged !== null ? lastChanged : '-';
        }
      }
    }

    cacheDeviceEvaluation(
      deviceCache,
      deviceId,
      d,
      deviceEntitiesRaw,
      areaLookup,
      states,
      false,
      deviceData,
    );
    result.push(deviceData);
  }

  return result;
}
