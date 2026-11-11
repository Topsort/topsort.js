import type { DeviceType, Event } from "@topsort/sdk-core";

const DEFAULT_DEVICE_TYPE: DeviceType = "mobile";

type DeviceContextItem = { deviceType?: DeviceType };

function fillDeviceType<T extends DeviceContextItem>(items: T[] | undefined): T[] | undefined {
  if (!items) {
    return items;
  }

  return items.map((item) =>
    item.deviceType != null ? item : { ...item, deviceType: DEFAULT_DEVICE_TYPE },
  );
}

/**
 * Copy an event, setting omitted `deviceType` values to `"mobile"`.
 * An explicit caller value is preserved. The input event is not mutated.
 */
export function applyDeviceContext(event: Event): Event {
  return {
    ...event,
    clicks: fillDeviceType(event.clicks),
    impressions: fillDeviceType(event.impressions),
    pageviews: fillDeviceType(event.pageviews),
    purchases: fillDeviceType(event.purchases),
    renders: fillDeviceType(event.renders),
  };
}
