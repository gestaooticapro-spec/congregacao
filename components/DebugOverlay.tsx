'use client'

import { useAuth } from '@/contexts/AuthProvider'
import { useEffect, useState } from 'react'

export default function DebugOverlay() {
    const { user, roles, loading, session } = useAuth()
    const [lastEvent, setLastEvent] = useState<string>('none')
    const [isVisible, setIsVisible] = useState(true)

    // Using a hack to hook into the console logs we added to AuthProvider? 
    // No, better to just show state.

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs font-mono z-[9999] max-w-sm pointer-events-none">
            <h3 className="font-bold border-b border-gray-600 mb-2">Auth Debug</h3>
            <div className="space-y-1">
                <p>User ID: {user?.id ? user.id.slice(0, 8) + '...' : 'NULL'}</p>
                <p>Session: {session ? 'Valid' : 'NULL'}</p>
                <p>Roles: {roles.length} ({roles.join(', ')})</p>
                <p>Loading: {loading ? 'TRUE' : 'FALSE'}</p>
                <p>Timestamp: {new Date().toLocaleTimeString()}</p>
            </div>
        </div>
    )
}
