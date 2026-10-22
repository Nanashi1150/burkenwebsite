export type DeliveryLocation = { latitude: number; longitude: number }

export function validLocation(value: unknown): value is DeliveryLocation {
  if (!value || typeof value !== 'object') return false
  const { latitude, longitude } = value as DeliveryLocation
  return Number.isFinite(latitude) && Math.abs(latitude) <= 90 && Number.isFinite(longitude) && Math.abs(longitude) <= 180
}

export function parseLocation(text: string): DeliveryLocation | null {
  const input = text.trim()
  let pair = input.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/)
  if (!pair) {
    try {
      const url = new URL(input)
      if (!['www.google.com', 'google.com', 'maps.google.com', 'maps.app.goo.gl', 'goo.gl'].includes(url.hostname)) return null
      const query = url.searchParams.get('query') || url.searchParams.get('q') || url.searchParams.get('destination') || ''
      // Prefer the actual place coordinates over a URL's camera center.
      pair = url.href.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/) || query.match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/) || url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
    } catch { return null }
  }
  if (!pair) return null
  const location = { latitude: Number(pair[1]), longitude: Number(pair[2]) }
  return validLocation(location) ? location : null
}

export function googleMapsURL(location: DeliveryLocation, directions = false) {
  const coordinates = `${location.latitude},${location.longitude}`
  return directions
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(coordinates)}&travelmode=driving`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordinates)}`
}
