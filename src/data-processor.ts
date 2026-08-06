import { DeviceData, DeviceTableCardConfig } from './types';

const FORBIDDEN_PROPS = new Set(['__proto__', 'constructor', 'prototype']);
const ALLOWED_DEVICE_PROPS = new Set(['model', 'sw_version', 'hw_version']);

const hasOwn = Object.prototype.hasOwnProperty;

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
      if (hasOwn.call(config.filter, key)) {
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
        if (hasOwn.call(c, key)) {
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
        if (col.suffix) suffixCols.push(m);
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
    const deviceId = d.id;
    const deviceEntitiesRaw = entitiesByDevice.get(deviceId);

    // Performance Optimization: Fine-grained, state-reference based memoization for individual devices.
    // If device properties, area lookup context, entity registry arrays, and state objects remain unchanged,
    // we bypass all processing, calculations, filtering, and allocations for this device.
    if (deviceEntitiesRaw) {
      const cached = deviceCache.get(deviceId);
      if (
        cached &&
        (d === cached.deviceRef ||
          (d.name_by_user === cached.nameByUser &&
            d.name === cached.name &&
            d.area_id === cached.areaId &&
            d.manufacturer === cached.manufacturer)) &&
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
          const currentState = hasOwn.call(states, ent.entity_id)
            ? states[ent.entity_id]
            : undefined;
          if (cached.entityStates[ent.entity_id] !== currentState) {
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

    // Cache the evaluation output for this device, whether it was filtered or resolved successfully.
    // Performance Optimization: If the device is excluded by a static property filter (manufacturer, area, integration),
    // we do not need to track and verify high-frequency entity state updates. Passing isStaticFilter=true allows us
    // to bypass state loop iteration, saving allocations and CPU cycles.
    const cacheEvaluationResult = (
      filtered: boolean,
      deviceData?: DeviceData,
      isStaticFilter = false,
    ) => {
      if (!deviceEntitiesRaw) return;
      let entityStates: Record<string, any> | undefined = undefined;
      if (!isStaticFilter) {
        entityStates = Object.create(null);
        for (let j = 0; j < deviceEntitiesRaw.length; j++) {
          const ent = deviceEntitiesRaw[j];
          entityStates![ent.entity_id] = hasOwn.call(states, ent.entity_id)
            ? states[ent.entity_id]
            : undefined;
        }
      }
      deviceCache.set(deviceId, {
        filtered,
        deviceData,
        deviceRef: d,
        entitiesRawRef: deviceEntitiesRaw,
        nameByUser: d.name_by_user,
        name: d.name,
        areaId: d.area_id,
        manufacturer: d.manufacturer,
        areaLookupRef: areaLookup,
        entityStates,
      });
    };

    // 1. Manufacturer filter
    if (filter.manufacturer && (d.manufacturer || 'Unknown') !== filter.manufacturer) {
      cacheEvaluationResult(true, undefined, true);
      continue;
    }

    // 2. Area filter
    if (filter.area) {
      const areaId = d.area_id;
      const areaName = areaId ? areaLookup[areaId] || areaId : 'No Area';
      if (areaName !== filter.area && areaId !== filter.area) {
        cacheEvaluationResult(true, undefined, true);
        continue;
      }
    }

    if (!deviceEntitiesRaw || deviceEntitiesRaw.length === 0) {
      continue;
    }

    // 3. Integration filter (using the first entity's platform as proxy for device integration)
    if (filter.integration && (deviceEntitiesRaw[0].platform || 'Unknown') !== filter.integration) {
      cacheEvaluationResult(true, undefined, true);
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
      const stateObj = hasOwn.call(states, ent.entity_id) ? states[ent.entity_id] : undefined;
      if (!stateObj) continue;

      hasValidEntities = true;

      if (typeof stateObj !== 'object') continue;

      // Match by Device Class (guarded against prototype pollution and type mismatches)
      const attributes = stateObj.attributes;
      const attrDeviceClass =
        attributes && typeof attributes === 'object' && hasOwn.call(attributes, 'device_class')
          ? attributes.device_class
          : undefined;
      const entDeviceClass =
        ent && typeof ent === 'object' && hasOwn.call(ent, 'device_class')
          ? ent.device_class
          : undefined;
      const dClass =
        typeof attrDeviceClass === 'string'
          ? attrDeviceClass
          : typeof entDeviceClass === 'string'
            ? entDeviceClass
            : undefined;
      if (dClass && requiredClasses.has(dClass)) {
        if (entitiesByClass[dClass] === undefined) {
          entitiesByClass[dClass] = stateObj;
          matchedClassesCount++;
        }
        if (!hasAnchor && dClass === anchorClass) {
          hasAnchor = true;
        }
      }

      // Match by Suffix (pre-calculated columns)
      if (matchedSuffixesCount < suffixCols.length) {
        for (let k = 0; k < suffixCols.length; k++) {
          const { col, key } = suffixCols[k];
          if (entitiesBySuffix[key] === undefined && ent.entity_id.endsWith(col.suffix!)) {
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
      cacheEvaluationResult(true);
      continue;
    }

    const lastChanged = needsLastChanged && latestIso ? Date.parse(latestIso) : null;

    const areaId = d.area_id;
    const areaName = areaId ? areaLookup[areaId] || areaId : 'No Area';
    const manufacturer = d.manufacturer || 'Unknown';
    const integration = deviceEntitiesRaw[0].platform || 'Unknown';

    const deviceData: DeviceData = {
      id: deviceId,
      name: d.name_by_user || d.name || 'Unknown Device',
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
        deviceData[key] = d[m.prop] || '-';
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

    cacheEvaluationResult(false, deviceData);
    result.push(deviceData);
  }

  return result;
}
