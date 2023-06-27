import { Vector3 } from "three";
export function convertLatLonToVec3(lat, lon) {
  lat = (lat * Math.PI) / 180.0;
  lon = (-lon * Math.PI) / 180.0;
  return new Vector3(
    Math.cos(lat) * Math.cos(lon),
    Math.sin(lat),
    Math.cos(lat) * Math.sin(lon)
  );
}
export function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}
