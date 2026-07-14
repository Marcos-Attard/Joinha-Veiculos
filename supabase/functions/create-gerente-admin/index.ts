import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Variáveis de ambiente do Supabase ausentes." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return new Response(JSON.stringify({ error: "Token ausente." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      data: { user: loggedUser },
      error: loggedUserError,
    } = await adminClient.auth.getUser(token);

    if (loggedUserError || !loggedUser) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado." }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: adminProfile, error: adminProfileError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", loggedUser.id)
      .single();

    if (adminProfileError) {
      return new Response(
        JSON.stringify({
          error: "Não foi possível validar o perfil do administrador.",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const allowedRoles = ["lojista", "admin", "adm", "administrador"];
    const role = String(adminProfile?.role || "").trim().toLowerCase();

    if (!allowedRoles.includes(role)) {
      return new Response(JSON.stringify({ error: "Acesso negado." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    const nome = String(body?.nome || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const senhaTemporaria = String(body?.senhaTemporaria || "").trim();
    const ativo = body?.ativo === true;

    if (!nome || nome.length < 3) {
      return new Response(JSON.stringify({ error: "Nome inválido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!email || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "E-mail inválido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!senhaTemporaria || senhaTemporaria.length < 6) {
      return new Response(
        JSON.stringify({
          error: "A senha temporária deve ter ao menos 6 caracteres.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let createdAuthUserId: string | null = null;

    try {
      const { data: createdAuthData, error: createAuthError } =
        await adminClient.auth.admin.createUser({
          email,
          password: senhaTemporaria,
          email_confirm: true,
          user_metadata: {
            nome,
          },
        });

      if (createAuthError || !createdAuthData.user) {
        throw new Error(
          createAuthError?.message ||
            "Não foi possível criar o usuário de autenticação."
        );
      }

      createdAuthUserId = createdAuthData.user.id;

      const { error: profileError } = await adminClient.from("profiles").insert({
        id: createdAuthUserId,
        role: "gerente",
        vendedor_id: null,
        ativo,
        nome,
        precisa_trocar_senha: true,
      });

      if (profileError) {
        throw new Error(
          profileError.message || "Não foi possível criar o profile do gerente."
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          user_id: createdAuthUserId,
          nome,
          email,
          ativo,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (internalError) {
      const message =
        internalError instanceof Error
          ? internalError.message
          : "Erro interno ao cadastrar gerente.";

      if (createdAuthUserId) {
        await adminClient.auth.admin.deleteUser(createdAuthUserId);
      }

      return new Response(
        JSON.stringify({ error: message }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro inesperado.";

    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});