function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2 - lat1);
  var dLon = deg2rad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

function isUserInHotspot(lat, lon, hotspots) {
  for (let hotspot of hotspots) {
    const dist = getDistanceFromLatLonInKm(lat, lon, hotspot.latitude, hotspot.longitude);
    if (dist <= (hotspot.radius / 1000)) { // radius is in meters in json, but function returns km
       return true;
    }
  }
  return false;
}

function checkInterestMatch(interests1, interests2) {
  if (!interests1 || !interests2) return false;
  // Check for at least one common interest
  const set1 = new Set(interests1);
  for (let interest of interests2) {
    if (set1.has(interest)) {
      return true;
    }
  }
  return false;
}

module.exports = {
  getDistanceFromLatLonInKm,
  isUserInHotspot,
  checkInterestMatch
};
