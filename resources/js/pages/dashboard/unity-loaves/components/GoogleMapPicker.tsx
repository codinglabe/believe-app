import React, { useCallback, useState } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const containerStyle = {
    width: '100%',
    height: '400px'
};

// Default center (USA) if no coordinates are provided
const defaultCenter = {
    lat: 39.8283,
    lng: -98.5795
};

interface GoogleMapPickerProps {
    lat?: number;
    lng?: number;
    onChange: (lat: number, lng: number) => void;
}

export default function GoogleMapPicker({ lat, lng, onChange }: GoogleMapPickerProps) {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        // The API key should be provided in the environment variables
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
    });

    const [map, setMap] = useState<google.maps.Map | null>(null);

    const onLoad = useCallback(function callback(map: google.maps.Map) {
        setMap(map);
    }, []);

    const onUnmount = useCallback(function callback(map: google.maps.Map) {
        setMap(null);
    }, []);

    const onClick = (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            const newLat = e.latLng.lat();
            const newLng = e.latLng.lng();
            onChange(newLat, newLng);
        }
    };

    const center = lat && lng ? { lat, lng } : defaultCenter;

    if (!isLoaded) {
        return <div className="h-[400px] w-full flex items-center justify-center bg-muted rounded-md">Loading Map...</div>;
    }

    if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
        return (
            <div className="h-[400px] w-full flex flex-col items-center justify-center bg-muted/50 rounded-md border border-dashed border-muted-foreground/30 text-muted-foreground p-6 text-center">
                <p className="font-semibold mb-2">Google Maps API Key Missing</p>
                <p className="text-sm">Please configure VITE_GOOGLE_MAPS_API_KEY in your .env file to enable the map picker.</p>
                {lat && lng && (
                    <div className="mt-4 text-xs">
                        Selected coordinates: {lat.toFixed(6)}, {lng.toFixed(6)}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="rounded-md overflow-hidden border border-border">
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={center}
                zoom={lat && lng ? 15 : 4}
                onLoad={onLoad}
                onUnmount={onUnmount}
                onClick={onClick}
                options={{
                    streetViewControl: false,
                    mapTypeControl: false,
                }}
            >
                {lat && lng && (
                    <Marker
                        position={{ lat, lng }}
                    />
                )}
            </GoogleMap>
            <div className="bg-muted p-2 text-xs text-muted-foreground text-center border-t border-border">
                Click on the map to select the location coordinates.
            </div>
        </div>
    );
}
