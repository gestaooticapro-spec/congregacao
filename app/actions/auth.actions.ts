'use server'

import { createAdminClient } from '@/lib/supabaseServer'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createUserForMember(membroId: string, email: string, password: string) {
    const supabaseAdmin = createAdminClient()

    try {
        // 1. Create user in Supabase Auth
        const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { membro_id: membroId }
        })

        if (createError) throw createError

        if (!user.user) throw new Error('Erro ao criar usuário')

        // 2. Link user to member in database
        const { error: updateError } = await supabaseAdmin
            .from('membros')
            .update({ user_id: user.user.id })
            .eq('id', membroId)

        if (updateError) {
            // Rollback: delete user if linking fails
            await supabaseAdmin.auth.admin.deleteUser(user.user.id)
            throw updateError
        }

        revalidatePath('/admin/membros')
        return { success: true }
    } catch (error: any) {
        console.error('Error creating user:', error)
        return { success: false, error: error.message }
    }
}

export async function changePassword(password: string) {
    const supabase = await createClient()

    try {
        const { error } = await supabase.auth.updateUser({
            password: password
        })

        if (error) throw error

        return { success: true }
    } catch (error: any) {
        console.error('Error changing password:', error)
        return { success: false, error: error.message }
    }
}
