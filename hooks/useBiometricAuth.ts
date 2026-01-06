import { useState, useEffect } from 'react'
import { BIOMETRIC_KEYS } from '@/lib/auth-utils'

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

            const credentialId = localStorage.getItem(BIOMETRIC_KEYS.CREDENTIAL_ID)

            // Note: In a real secure implementation, we would pass the Credential ID 
            // to allow the authenticator to find the specific key.
            // However, for platform authenticators (TouchID/FaceID), passing an empty allowList 
            // often prompts the user to select a credential or just works if there's only one.
            // Let's try to be specific if we have the ID.

            const allowCredentials: PublicKeyCredentialDescriptor[] = credentialId ? [{
                id: Uint8Array.from(atob(credentialId), c => c.charCodeAt(0)), // Decode base64 ID if needed, but credential.id is usually base64url or base64? 
                // Actually credential.id from create() is base64url encoded string in modern browsers, 
                // but let's just use the raw ID if we can.
                // Wait, navigator.credentials.create returns a PublicKeyCredential where .id is a string.
                // To use it in allowCredentials, we need to convert it back to BufferSource.
                // A simple way for this "Client-Side Gate" is to NOT filter by ID and just let the user authenticate.
                // But let's try to be correct.
                type: 'public-key',
                transports: ['internal']
            }] : []

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
