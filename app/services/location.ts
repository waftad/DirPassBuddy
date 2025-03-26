import { Geolocation } from '@nativescript/geolocation';
import { CoreTypes } from '@nativescript/core';

export async function enableLocationServices() {
  const hasPermission = await Geolocation.enableLocationRequest(true);
  return hasPermission;
}

export async function getCurrentLocation() {
  const location = await Geolocation.getCurrentLocation({
    desiredAccuracy: CoreTypes.Accuracy.high,
    maximumAge: 5000,
    timeout: 10000
  });
  return location;
}

export async function watchLocation(callback: (location: any) => void) {
  return Geolocation.watchLocation(
    callback,
    (error) => console.error('Location error:', error),
    {
      desiredAccuracy: CoreTypes.Accuracy.high,
      updateDistance: 1,
      minimumUpdateTime: 1000
    }
  );
}