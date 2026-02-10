import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function verifyAdmin(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Missing authorization header', status: 401 }
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
    return { error: 'Invalid token', status: 401 }
  }

  const actorId = claimsData.user.id
  const { data: isAdmin } = await userClient.rpc('has_role', { _user_id: actorId, _role: 'admin' })
  if (!isAdmin) {
    return { error: 'Unauthorized - admin access required', status: 403 }
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  return { actorId, adminClient, userClient }
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// === Action handlers ===

async function handleCreate(body: any, actorId: string, adminClient: any) {
  const { email, password, fullName, role } = body
  if (!email || !password || !fullName || !role) {
    return jsonResponse({ error: 'Missing required fields: email, password, fullName, role' }, 400)
  }
  if (!['admin', 'user'].includes(role)) {
    return jsonResponse({ error: 'Role must be admin or user' }, 400)
  }
  if (password.length < 8) {
    return jsonResponse({ error: 'Password must be at least 8 characters' }, 400)
  }

  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email, password, email_confirm: true,
  })
  if (createError) return jsonResponse({ error: createError.message }, 400)

  const newUserId = newUser.user.id

  const { error: profileError } = await adminClient.from('profiles').insert({
    user_id: newUserId, email, full_name: fullName,
  })
  if (profileError) {
    await adminClient.auth.admin.deleteUser(newUserId)
    return jsonResponse({ error: 'Failed to create profile' }, 500)
  }

  const { error: roleError } = await adminClient.from('user_roles').insert({
    user_id: newUserId, role,
  })
  if (roleError) {
    await adminClient.auth.admin.deleteUser(newUserId)
    return jsonResponse({ error: 'Failed to assign role' }, 500)
  }

  await adminClient.from('admin_activity_log').insert({
    actor_id: actorId, action: 'user_created', target_type: 'user',
    target_id: newUserId, details: { email, full_name: fullName, role },
  })

  return jsonResponse({ success: true, user: { id: newUserId, email, fullName, role } })
}

async function handleUpdateRole(body: any, actorId: string, adminClient: any) {
  const { targetUserId, newRole } = body
  if (!targetUserId || !newRole) return jsonResponse({ error: 'Missing targetUserId or newRole' }, 400)
  if (!['admin', 'user'].includes(newRole)) return jsonResponse({ error: 'Role must be admin or user' }, 400)

  const { data: currentRole } = await adminClient
    .from('user_roles').select('role').eq('user_id', targetUserId).in('role', ['admin', 'user']).single()

  const oldRole = currentRole?.role || 'unknown'
  await adminClient.from('user_roles').delete().eq('user_id', targetUserId).in('role', ['admin', 'user'])
  const { error: insertError } = await adminClient.from('user_roles').insert({ user_id: targetUserId, role: newRole })
  if (insertError) return jsonResponse({ error: 'Failed to update role' }, 500)

  await adminClient.from('admin_activity_log').insert({
    actor_id: actorId, action: 'role_changed', target_type: 'user',
    target_id: targetUserId, details: { old_role: oldRole, new_role: newRole },
  })

  return jsonResponse({ success: true })
}

async function handleToggleBan(body: any, actorId: string, adminClient: any, ban: boolean) {
  const { targetUserId } = body
  if (!targetUserId) return jsonResponse({ error: 'Missing targetUserId' }, 400)
  if (targetUserId === actorId) return jsonResponse({ error: 'Cannot deactivate yourself' }, 400)

  const { error: banError } = await adminClient.auth.admin.updateUserById(targetUserId, {
    ban_duration: ban ? '87600h' : 'none',
  })
  if (banError) return jsonResponse({ error: banError.message }, 500)

  await adminClient.from('admin_activity_log').insert({
    actor_id: actorId, action: ban ? 'user_deactivated' : 'user_reactivated',
    target_type: 'user', target_id: targetUserId, details: {},
  })

  return jsonResponse({ success: true })
}

async function handleResetPassword(body: any, actorId: string, adminClient: any) {
  const { targetUserId, newPassword } = body
  if (!targetUserId || !newPassword) return jsonResponse({ error: 'Missing targetUserId or newPassword' }, 400)
  if (newPassword.length < 8) return jsonResponse({ error: 'Password must be at least 8 characters' }, 400)

  const { error } = await adminClient.auth.admin.updateUserById(targetUserId, { password: newPassword })
  if (error) return jsonResponse({ error: error.message }, 500)

  await adminClient.from('admin_activity_log').insert({
    actor_id: actorId, action: 'password_reset', target_type: 'user',
    target_id: targetUserId, details: {},
  })

  return jsonResponse({ success: true })
}

async function handleListUsers(body: any, adminClient: any) {
  const { userIds } = body
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return jsonResponse({ error: 'userIds must be a non-empty array' }, 400)
  }

  const results: Record<string, { is_banned: boolean }> = {}
  for (const uid of userIds) {
    const { data, error } = await adminClient.auth.admin.getUserById(uid)
    if (error || !data?.user) {
      results[uid] = { is_banned: false }
    } else {
      const banned = data.user.banned_until
        ? new Date(data.user.banned_until) > new Date()
        : false
      results[uid] = { is_banned: banned }
    }
  }

  return jsonResponse({ success: true, users: results })
}

// === Main handler ===

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const auth = await verifyAdmin(req)
    if ('error' in auth) return jsonResponse({ error: auth.error }, auth.status)

    const { actorId, adminClient } = auth
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'create': return await handleCreate(body, actorId, adminClient)
      case 'update_role': return await handleUpdateRole(body, actorId, adminClient)
      case 'deactivate': return await handleToggleBan(body, actorId, adminClient, true)
      case 'reactivate': return await handleToggleBan(body, actorId, adminClient, false)
      case 'reset_password': return await handleResetPassword(body, actorId, adminClient)
      case 'list_users': return await handleListUsers(body, adminClient)
      default:
        return jsonResponse({ error: 'Invalid action. Use: create, update_role, deactivate, reactivate, reset_password, list_users' }, 400)
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
})
