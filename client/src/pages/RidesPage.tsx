import { Bell, Clock, Menu, Mic, Star, ShoppingCart, Crosshair, House, Pizza, User, CarFront } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MapView } from '@/components/Map';
import { useMemo, useRef, useState } from 'react';
import { ordersAPI, ridesAPI } from '@/services/api';
import { useLocation } from 'wouter';
import { toast } from 'sonner';

export default function RidesPage() {
  const [, setLocation] = useLocation();
  const mapRef = useRef<google.maps.Map | null>(null);
  const pickupMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const dropMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  const [pickup, setPickup] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoff, setDropoff] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeType, setActiveType] = useState<'bike' | 'auto' | 'cab' | 'premium'>('bike');
  const [quotes, setQuotes] = useState<
    Array<{
      id: string;
      provider: 'Uber' | 'Ola' | 'Rapido' | 'ONDC';
      type: 'bike' | 'auto' | 'cab' | 'premium';
      fare: number;
      etaMinutes: number;
      driverRating: number;
      distanceKm: number;
      surgeMultiplier?: number;
      deeplinkUrl: string;
    }>
  >([]);

  const initialCenter = useMemo(() => ({ lat: 28.6139, lng: 77.209 }), []);

  const renderRoute = async (p: { lat: number; lng: number }, d: { lat: number; lng: number }) => {
    if (!mapRef.current || !window.google?.maps) return;
    const directionsService = new window.google.maps.DirectionsService();
    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({ map: mapRef.current, suppressMarkers: true });
    }
    const res = await directionsService.route({
      origin: p,
      destination: d,
      travelMode: window.google.maps.TravelMode.DRIVING,
    });
    directionsRendererRef.current.setDirections(res);
  };

  const updateMarker = (
    which: 'pickup' | 'dropoff',
    point: { lat: number; lng: number }
  ) => {
    if (!mapRef.current || !window.google?.maps?.marker?.AdvancedMarkerElement) return;
    const marker = new window.google.maps.marker.AdvancedMarkerElement({
      map: mapRef.current,
      position: point,
      title: which === 'pickup' ? 'Pickup' : 'Dropoff',
    });
    if (which === 'pickup') {
      if (pickupMarkerRef.current) pickupMarkerRef.current.map = null;
      pickupMarkerRef.current = marker;
    } else {
      if (dropMarkerRef.current) dropMarkerRef.current.map = null;
      dropMarkerRef.current = marker;
    }
  };

  const runEstimate = async (p: { lat: number; lng: number }, d: { lat: number; lng: number }) => {
    setIsLoading(true);
    try {
      const resp = await ridesAPI.getFareEstimate(p, d);
      setQuotes(resp.quotes || []);
    } catch {
      setQuotes([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mobile-stage">
      <div className="fit-shell">
        <div className="phone-screen">
          <section className="screen" style={{ paddingTop: 16, paddingBottom: 28 }}>
            <div className="app-topbar">
              <button className="app-icon-circle" type="button" aria-label="Menu" onClick={() => setLocation('/home')}>
                <Menu size={22} strokeWidth={2.2} />
              </button>
              <div className="app-searchbar" role="search">
                <input className="app-searchbar-input" placeholder="Type briefly what you want" />
                <button className="app-icon-ghost" type="button" aria-label="Voice">
                  <Mic size={18} strokeWidth={2.4} />
                </button>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <button className="app-icon-ghost" type="button" aria-label="Notifications" onClick={() => setLocation('/history')}>
                  <Bell size={20} strokeWidth={2.2} />
                </button>
                <button className="app-icon-ghost" type="button" aria-label="Cart" onClick={() => setLocation('/history')}>
                  <ShoppingCart size={20} strokeWidth={2.2} />
                </button>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                className="gap-2 flex-1"
                onClick={() => {
                  navigator.geolocation?.getCurrentPosition(
                    (pos) => {
                      const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                      setPickup(next);
                      updateMarker('pickup', next);
                      mapRef.current?.setCenter(next);
                    },
                    () => {
                      return;
                    }
                  );
                }}
              >
                <Crosshair className="w-4 h-4" />
                Pickup = me
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setPickup(null);
                  setDropoff(null);
                  setQuotes([]);
                  if (pickupMarkerRef.current) pickupMarkerRef.current.map = null;
                  if (dropMarkerRef.current) dropMarkerRef.current.map = null;
                  if (directionsRendererRef.current) directionsRendererRef.current.setMap(null);
                  directionsRendererRef.current = null;
                }}
              >
                Reset
              </Button>
            </div>

            <div className="mt-4">
              <MapView
                initialCenter={initialCenter}
                initialZoom={13}
                className="h-[320px] lg:h-[520px] rounded-2xl overflow-hidden border border-amber-100"
                onMapReady={(map) => {
                  mapRef.current = map;
                  map.addListener('click', async (e: google.maps.MapMouseEvent) => {
                    if (!e.latLng) return;
                    const point = { lat: e.latLng.lat(), lng: e.latLng.lng() };

                    if (!pickup || (pickup && dropoff)) {
                      setPickup(point);
                      setDropoff(null);
                      setQuotes([]);
                      updateMarker('pickup', point);
                      if (dropMarkerRef.current) dropMarkerRef.current.map = null;
                      if (directionsRendererRef.current) directionsRendererRef.current.setMap(null);
                      directionsRendererRef.current = null;
                      return;
                    }

                    setDropoff(point);
                    updateMarker('dropoff', point);
                    await renderRoute(pickup, point);
                    await runEstimate(pickup, point);
                  });
                }}
              />
            </div>

            <div className="mt-6">
              <div className="text-sm text-muted-foreground">Recommended for you</div>
              <div className="mt-3 flex items-center justify-between gap-3">
                {(['bike', 'auto', 'cab', 'premium'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`history-filter-pill ${activeType === t ? 'history-filter-pill-active' : ''}`}
                    onClick={() => setActiveType(t)}
                  >
                    {t === 'premium' ? 'SUV' : t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              {!isLoading && pickup && dropoff && quotes.length === 0 && (
                <div className="py-10 text-center text-muted-foreground">No quotes returned.</div>
              )}

              <div className="mt-4 space-y-3">
                {(quotes.filter((q) => q.type === activeType) as typeof quotes).map((ride) => (
                  <div key={ride.id} className="rounded-2xl border border-amber-100 bg-white/95 p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-foreground truncate">{ride.provider}</div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Star className="w-3.5 h-3.5" /> {ride.driverRating.toFixed(1)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> {ride.etaMinutes} min away
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-lg font-extrabold text-foreground">₹{ride.fare.toLocaleString()}</div>
                        <Button
                          className="rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white"
                          onClick={async () => {
                            try {
                              await ordersAPI.createOrder({
                                domain: 'rides',
                                provider: ride.provider,
                                title: `${ride.provider} ${ride.type.toUpperCase()} ride`,
                                itemUrl: ride.deeplinkUrl,
                                amount: { currency: 'INR', amount: Math.max(1, Math.round(ride.fare)) },
                                metadata: {
                                  quoteId: ride.id,
                                  pickup,
                                  dropoff,
                                  etaMinutes: ride.etaMinutes,
                                  distanceKm: ride.distanceKm,
                                  surgeMultiplier: ride.surgeMultiplier,
                                },
                              });
                              toast.success('Ride saved to orders.');
                            } catch {
                              toast.message('Booking link opened.', { description: 'Log in to save orders.' });
                            } finally {
                              window.open(ride.deeplinkUrl, '_blank');
                            }
                          }}
                        >
                          Select
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <nav className="app-bottom-nav" aria-label="Bottom navigation">
              <div className="app-bottom-nav-inner">
                <button className="app-bottom-nav-item" type="button" onClick={() => setLocation('/home')} aria-label="Home">
                  <span className="app-bottom-nav-bubble">
                    <House size={22} strokeWidth={2.2} />
                  </span>
                </button>
                <button className="app-bottom-nav-item app-bottom-nav-item-active" type="button" aria-label="Rides">
                  <span className="app-bottom-nav-bubble">
                    <CarFront size={22} strokeWidth={2.2} />
                  </span>
                </button>
                <button className="app-bottom-nav-item" type="button" onClick={() => setLocation('/food')} aria-label="Food">
                  <span className="app-bottom-nav-bubble">
                    <Pizza size={22} strokeWidth={2.2} />
                  </span>
                </button>
                <button className="app-bottom-nav-item" type="button" onClick={() => setLocation('/profile')} aria-label="Profile">
                  <span className="app-bottom-nav-bubble">
                    <User size={22} strokeWidth={2.2} />
                  </span>
                </button>
              </div>
            </nav>
          </section>
        </div>
      </div>
    </div>
  );
}
