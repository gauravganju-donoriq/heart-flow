import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await userClient.auth.getUser(token)
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const actorId = claimsData.user.id

    // Only admins can manage users
    const { data: isAdmin } = await userClient.rpc('has_role', { _user_id: actorId, _role: 'admin' })
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const body = await req.json()
    const { action } = body

    // === CREATE USER ===
    if (action === 'create') {
      const { email, password, fullName, role } = body
      if (!email || !password || !fullName || !role) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: email, password, fullName, role' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (!['admin', 'user'].includes(role)) {
        return new Response(
          JSON.stringify({ error: 'Role must be admin or user' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (password.length < 8) {
        return new Response(
          JSON.stringify({ error: 'Password must be at least 8 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email, password, email_confirm: true,
      })
      if (createError) {
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const newUserId = newUser.user.id

      // Create profile
      const { error: profileError } = await adminClient.from('profiles').insert({
        user_id: newUserId, email, full_name: fullName,
      })
      if (profileError) {
        await adminClient.auth.admin.deleteUser(newUserId)
        return new Response(
          JSON.stringify({ error: 'Failed to create profile' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Assign role
      const { error: roleError } = await adminClient.from('user_roles').insert({
        user_id: newUserId, role,
      })
      if (roleError) {
        await adminClient.auth.admin.deleteUser(newUserId)
        return new Response(
          JSON.stringify({ error: 'Failed to assign role' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Log activity
      await adminClient.from('admin_activity_log').insert({
        actor_id: actorId,
        action: 'user_created',
        target_type: 'user',
        target_id: newUserId,
        details: { email, full_name: fullName, role },
      })

      return new Response(
        JSON.stringify({ success: true, user: { id: newUserId, email, fullName, role } }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // === UPDATE ROLE ===
    if (action === 'update_role') {
      const { targetUserId, newRole } = body
      if (!targetUserId || !newRole) {
        return new Response(
          JSON.stringify({ error: 'Missing targetUserId or newRole' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (!['admin', 'user'].includes(newRole)) {
        return new Response(
          JSON.stringify({ error: 'Role must be admin or user' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get current role
      const { data: currentRole } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', targetUserId)
        .in('role', ['admin', 'user'])
        .single()

      const oldRole = currentRole?.role || 'unknown'

      // Update role
      await adminClient.from('user_roles').delete().eq('user_id', targetUserId).in('role', ['admin', 'user'])
      const { error: insertError } = await adminClient.from('user_roles').insert({
        user_id: targetUserId, role: newRole,
      })
      if (insertError) {
        return new Response(
          JSON.stringify({ error: 'Failed to update role' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      await adminClient.from('admin_activity_log').insert({
        actor_id: actorId,
        action: 'role_changed',
        target_type: 'user',
        target_id: targetUserId,
        details: { old_role: oldRole, new_role: newRole },
      })

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // === DEACTIVATE / REACTIVATE USER ===
    if (action === 'deactivate' || action === 'reactivate') {
      const { targetUserId } = body
      if (!targetUserId) {
        return new Response(
          JSON.stringify({ error: 'Missing targetUserId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (targetUserId === actorId) {
        return new Response(
          JSON.stringify({ error: 'Cannot deactivate yourself' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const ban = action === 'deactivate'
      const { error: banError } = await adminClient.auth.admin.updateUserById(targetUserId, {
        ban_duration: ban ? 'none' : undefined,
        ...(ban ? { ban_duration: '87600h' } : { ban_duration: 'none' }),
      })

      if (banError) {
        return new Response(
          JSON.stringify({ error: banError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      await adminClient.from('admin_activity_log').insert({
        actor_id: actorId,
        action: ban ? 'user_deactivated' : 'user_reactivated',
        target_type: 'user',
        target_id: targetUserId,
        details: {},
      })

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use: create, update_role, deactivate, reactivate' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
