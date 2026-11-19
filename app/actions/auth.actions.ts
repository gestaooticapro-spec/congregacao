'use server'

import { createAdminClient } from '@/lib/supabaseServer'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createUserForMember(membroId: string, email: string, password: string) {
    try {
        const supabase = await createClient()
        const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
        if (authError || !currentUser) return { success: false, error: 'Acesso não autorizado' }

        const { data: member, error: memberError } = await supabase
            .from('membros')
            .select('id, membro_perfis(perfil)')
            .eq('user_id', currentUser.id)
            .maybeSingle()
        if (memberError || !member?.membro_perfis?.some(({ perfil }) => perfil === 'ADMIN' || perfil === 'COORDENADOR')) {
            return { success: false, error: 'Apenas administradores podem criar logins' }
        }

        const supabaseAdmin = createAdminClient()
        const { data: target, error: targetError } = await supabaseAdmin
            .from('membros')
            .select('id, user_id')
            .eq('id', membroId)
            .maybeSingle()
        if (targetError) throw targetError
        if (!target || target.user_id) return { success: false, error: 'Membro não encontrado ou já possui login' }

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
        const { data: linked, error: updateError } = await supabaseAdmin
            .from('membros')
            .update({ user_id: user.user.id })
            .eq('id', membroId)
            .is('user_id', null)
            .select('id')
            .maybeSingle()

        if (updateError || !linked) {
            // Rollback: delete user if linking fails
            await supabaseAdmin.auth.admin.deleteUser(user.user.id)
            throw updateError || new Error('Não foi possível vincular o membro ao login')
        }

        revalidatePath('/admin/membros')
        return { success: true }
    } catch (error: unknown) {
        console.error('Error creating user:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Erro ao criar usuário' }
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
    } catch (error: unknown) {
        console.error('Error changing password:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Erro ao alterar senha' }
    }
}
