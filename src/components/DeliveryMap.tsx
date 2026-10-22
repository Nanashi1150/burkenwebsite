"use client"

import { useEffect, useRef, useState } from 'react'
import { LocateFixed, MapPin, Navigation, Check } from 'lucide-react'
import { googleMapsURL, parseLocation, validLocation, type DeliveryLocation } from '@/lib/delivery'

export function DeliveryMap({ location, address, navigate = false }: { location: DeliveryLocation | null; address?: string | null; navigate?: boolean }) {
  if (!validLocation(location)) {
    if (!address?.trim()) return <p className="rounded-xl bg-orange-50 p-3 text-xs text-black/50">ออเดอร์นี้ยังไม่มีจุดจัดส่ง</p>
    const query = encodeURIComponent(address.trim())
    return <div className="rounded-2xl border border-black/10 bg-white p-3"><p className="text-xs font-bold text-black/45">จัดส่งตามที่อยู่ที่ลูกค้ากรอก</p><p className="mt-2 max-h-24 overflow-y-auto text-sm leading-6">{address}</p><a href={navigate ? `https://www.google.com/maps/dir/?api=1&destination=${query}&travelmode=driving` : `https://www.google.com/maps/search/?api=1&query=${query}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[var(--brand-red)]"><Navigation className="size-4" />{navigate ? 'ค้นหาเส้นทางจากที่อยู่' : 'ค้นหาที่อยู่ใน Google Maps'}</a><p className="mt-1 text-xs text-black/45">ตรวจสอบผลค้นหาให้ตรงกับที่อยู่ก่อนนำทาง</p></div>
  }
  const coordinates = `${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}`
  return <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
    <iframe title="แผนที่จุดจัดส่ง Google Maps" src={`https://maps.google.com/maps?q=${encodeURIComponent(coordinates)}&z=16&output=embed`} className="h-44 w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
    <div className="space-y-2 p-3">
      {address && <p className="max-h-24 overflow-y-auto text-sm leading-6">{address}</p>}
      <p className="flex items-center gap-1 text-xs text-black/50"><MapPin className="size-3.5 shrink-0" />{coordinates}</p>
      <a href={googleMapsURL(location, navigate)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[var(--brand-red)]"><Navigation className="size-4" />{navigate ? 'นำทางด้วย Google Maps' : 'เปิดจุดส่งใน Google Maps'}</a>
    </div>
  </div>
}

let mapsConfigured = false
export function DeliveryPinPicker({ value, onChange }: { value: DeliveryLocation | null; onChange: (value: DeliveryLocation | null) => void }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)
  const changeRef = useRef(onChange)
  const valueRef = useRef(value)
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [mapFailed, setMapFailed] = useState(false)
  const [locating, setLocating] = useState(false)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  useEffect(() => { changeRef.current = onChange }, [onChange])
  useEffect(() => {
    valueRef.current = value
    if (value) {
      setInput(`${value.latitude.toFixed(6)}, ${value.longitude.toFixed(6)}`)
      const position = { lat: value.latitude, lng: value.longitude }
      if (markerRef.current) { markerRef.current.position = position; markerRef.current.map = mapRef.current }
      mapRef.current?.panTo(position)
    } else if (markerRef.current) markerRef.current.map = null
  }, [value])
  useEffect(() => {
    if (!apiKey || !container.current) return
    let disposed = false
    const listeners: google.maps.MapsEventListener[] = []
    async function loadMap() {
      try {
        const { setOptions, importLibrary } = await import('@googlemaps/js-api-loader')
        if (!mapsConfigured) { setOptions({ key: apiKey!, v: 'weekly', language: 'th', region: 'TH' }); mapsConfigured = true }
        const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([importLibrary('maps'), importLibrary('marker')])
        if (disposed || !container.current) return
        const selected = valueRef.current
        const center = selected ? { lat: selected.latitude, lng: selected.longitude } : { lat: 13.7563, lng: 100.5018 }
        const map = new Map(container.current, { center, zoom: selected ? 17 : 11, mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID', streetViewControl: false, mapTypeControl: false, gestureHandling: 'cooperative' })
        const marker = new AdvancedMarkerElement({ map: selected ? map : null, position: center, gmpDraggable: true, title: 'ลากหมุดเพื่อเลือกจุดจัดส่ง' })
        mapRef.current = map; markerRef.current = marker
        listeners.push(map.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (event.latLng) changeRef.current({ latitude: event.latLng.lat(), longitude: event.latLng.lng() })
        }))
        listeners.push(marker.addListener('dragend', () => {
          if (!marker.position) return
          const position = marker.position as google.maps.LatLngLiteral
          changeRef.current({ latitude: position.lat, longitude: position.lng })
        }))
      } catch { if (!disposed) setMapFailed(true) }
    }
    void loadMap()
    return () => { disposed = true; listeners.forEach(listener => listener.remove()); if (markerRef.current) markerRef.current.map = null; mapRef.current = null; markerRef.current = null }
  }, [apiKey])

  function useCurrentLocation() {
    setError('')
    if (!navigator.geolocation) { setError('เบราว์เซอร์นี้ไม่รองรับตำแหน่งปัจจุบัน กรุณาวางพิกัดแทน'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(position => {
      onChange({ latitude: position.coords.latitude, longitude: position.coords.longitude })
      setAccuracy(Math.round(position.coords.accuracy)); setLocating(false)
    }, () => { setLocating(false); setError('รับตำแหน่งไม่ได้ กรุณาอนุญาตตำแหน่ง หรือวางพิกัดจาก Google Maps แทน') }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 })
  }
  function applyPin() {
    const parsed = parseLocation(input)
    if (!parsed) { setError('กรอกละติจูด, ลองจิจูด หรือลิงก์ Google Maps แบบเต็มที่มีพิกัด ลิงก์สั้นต้องเปิดและคัดลอกพิกัดก่อน'); return }
    onChange(parsed); setError(''); setAccuracy(null)
  }
  return <section className="mt-4 space-y-3 rounded-2xl border border-black/10 bg-[var(--surface)] p-4" aria-label="เลือกจุดจัดส่ง">
    <div className="flex items-center justify-between gap-2"><p className="flex items-center gap-2 text-sm font-black"><MapPin className="size-4 text-[var(--brand-red)]" />หมุดจุดจัดส่ง</p>{value && <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700"><Check className="size-3.5" />เลือกแล้ว</span>}</div>
    <button type="button" onClick={useCurrentLocation} disabled={locating} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-3 text-sm font-bold shadow-sm disabled:opacity-50"><LocateFixed className="size-4" />{locating ? 'กำลังหาตำแหน่ง…' : 'ใช้ตำแหน่งปัจจุบัน'}</button>
    <label className="block text-xs font-bold text-black/60" htmlFor="delivery-coordinates">พิกัด หรือลิงก์ Google Maps แบบเต็ม</label>
    <div className="flex gap-2"><input id="delivery-coordinates" value={input} onChange={event => setInput(event.target.value)} placeholder="13.756300, 100.501800" className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-3 text-xs outline-none focus:border-[var(--brand-red)]" /><button type="button" onClick={applyPin} className="rounded-xl bg-[var(--ink)] px-3 text-xs font-bold text-white">ปักหมุด</button></div>
    {error && <p role="alert" className="text-xs leading-5 text-red-700">{error}</p>}
    {accuracy !== null && <p className="text-xs text-black/50">ความแม่นยำประมาณ {accuracy} เมตร กรุณาตรวจจุดส่งก่อนยืนยัน</p>}
    {apiKey && !mapFailed ? <><div ref={container} className="h-56 overflow-hidden rounded-xl bg-orange-100" /><p className="text-xs text-black/50">คลิกบนแผนที่ หรือลากหมุดไปยังจุดส่ง</p></> : <>
      <p className="text-xs leading-5 text-black/50">ใช้ตำแหน่งปัจจุบัน หรือเปิด Google Maps แล้วคัดลอกพิกัดจุดส่งมาวาง</p>
      {value ? <DeliveryMap location={value} /> : <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 text-xs font-bold text-[var(--brand-red)]"><MapPin className="size-4" />เปิด Google Maps เพื่อเลือกพิกัด</a>}
    </>}
  </section>
}
