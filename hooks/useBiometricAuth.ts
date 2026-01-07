import { useState, useEffect } from 'react'
import { BIOMETRIC_KEYS } from '@/lib/auth-utils'
import { supabase } from '@/lib/supabaseClient'

export function useBiometricAuth() {
    const [isSupported, setIsSupported] = useState(false)
    const [isEnrolled, setIsEnrolled] = useState(false)

    useEffect(() => {
        // Check if WebAuthn is supported
        if (typeof window !== 'undefined' && window.PublicKeyCredential) {
            setIsSupported(true)
            const enrolled = localStorage.getItem(BIOMETRIC_KEYS.ENROLLED) === 'true'
            setIsEnrolled(enrolled)
        }

        // Keep the refresh token updated!
        // Supabase rotates tokens automatically. If we don't update our stored copy,
        // it becomes stale and the next biometric login will fail with "Session expired".
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.refresh_token && localStorage.getItem(BIOMETRIC_KEYS.ENROLLED) === 'true') {
                localStorage.setItem(BIOMETRIC_KEYS.REFRESH_TOKEN, session.refresh_token)
            }
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [])

    const updateBiometricToken = (refreshToken: string) => {
        if (refreshToken) {
            localStorage.setItem(BIOMETRIC_KEYS.REFRESH_TOKEN, refreshToken)
        }
    }

    const registerBiometric = async (email: string) => {
        if (!isSupported) throw new Error('Biometria não suportada')

        try {
            // Create a random challenge
            const challenge = new Uint8Array(32)
            window.crypto.getRandomValues(challenge)

            // Create user ID
            const userId = new Uint8Array(16)
            window.crypto.getRandomValues(userId)

            const publicKey: PublicKeyCredentialCreationOptions = {
                challenge,
                rp: {
                    name: 'Congregação Manager',
                    id: window.location.hostname,
                },
                user: {
                    id: userId,
                    name: email,
                    displayName: email,
                },
                pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
                authenticatorSelection: {
                    authenticatorAttachment: 'platform',
                    userVerification: 'required',
                },
                timeout: 60000,
                attestation: 'none',
            }

            const credential = await navigator.credentials.create({ publicKey }) as PublicKeyCredential

            if (credential) {
                localStorage.setItem(BIOMETRIC_KEYS.CREDENTIAL_ID, credential.id)
                localStorage.setItem(BIOMETRIC_KEYS.EMAIL, email)
                localStorage.setItem(BIOMETRIC_KEYS.ENROLLED, 'true')
                setIsEnrolled(true)
                return true
            }
        } catch (error) {
            console.error('Erro ao registrar biometria:', error)
            throw error
        }
    }

    const authenticateBiometric = async () => {
        if (!isSupported || !isEnrolled) throw new Error('Biometria não disponível')

        try {
            const challenge = new Uint8Array(32)
            window.crypto.getRandomValues(challenge)

            // We don't strictly need to filter by credential ID for this client-side gate.
            // We just want to verify the user is the owner of the device.
            // This avoids complex Base64URL decoding issues.

            // Simplified approach for this "Client Gate" model:
            // We just ask for ANY assertion from this RP.
            const publicKey: PublicKeyCredentialRequestOptions = {
                challenge,
                rpId: window.location.hostname,
                userVerification: 'required',
                timeout: 60000,
            }

            const assertion = await navigator.credentials.get({ publicKey })

            if (assertion) {
                // Biometric check passed!
                // Retrieve the stored refresh token
                const refreshToken = localStorage.getItem(BIOMETRIC_KEYS.REFRESH_TOKEN)
                if (!refreshToken) throw new Error('Token não encontrado')

                return { refreshToken }
            }
        } catch (error) {
            console.error('Erro na autenticação biométrica:', error)
            throw error
        }
    }

    return {
        isSupported,
        isEnrolled,
        registerBiometric,
        authenticateBiometric,
        updateBiometricToken
    }
}
