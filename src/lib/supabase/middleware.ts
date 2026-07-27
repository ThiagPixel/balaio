import {
  createServerClient,
  type CookieOptions,
} from "@supabase/ssr";

import {
  NextResponse,
  type NextRequest,
} from "next/server";

type AccountStatus = {
  user_id: string;
  tenant_id: string;
  active: boolean;
  role: "owner" | "member";
};

function copyCookies(
  source: NextResponse,
  target: NextResponse,
) {
  for (
    const cookie
    of source.cookies.getAll()
  ) {
    target.cookies.set(
      cookie.name,
      cookie.value,
      cookie,
    );
  }

  return target;
}

function redirectResponse(
  request: NextRequest,
  currentResponse: NextResponse,
  pathname: string,
) {
  const url =
    request.nextUrl.clone();

  url.pathname = pathname;

  const redirect =
    NextResponse.redirect(url);

  return copyCookies(
    currentResponse,
    redirect,
  );
}

export async function updateSession(
  request: NextRequest,
) {
  let response =
    NextResponse.next({
      request: {
        headers:
          request.headers,
      },
    });

  const supabase =
    createServerClient(
      process.env
        .NEXT_PUBLIC_SUPABASE_URL!,
      process.env
        .NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(
            cookiesToSet: Array<{
              name: string;
              value: string;
              options: CookieOptions;
            }>,
          ) {
            cookiesToSet.forEach(
              ({
                name,
                value,
              }) => {
                request.cookies.set(
                  name,
                  value,
                );
              },
            );

            response =
              NextResponse.next({
                request: {
                  headers:
                    request.headers,
                },
              });

            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                response.cookies.set(
                  name,
                  value,
                  options,
                );
              },
            );
          },
        },
      },
    );

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  const pathname =
    request.nextUrl.pathname;

  const isApiRoute =
    pathname.startsWith("/api");

  const isAccountDisabledRoute =
    pathname ===
      "/account-disabled" ||
    pathname.startsWith(
      "/account-disabled/",
    );

  const isAuthenticationRoute =
    pathname.startsWith(
      "/login",
    ) ||
    pathname.startsWith(
      "/signup",
    ) ||
    pathname.startsWith(
      "/register",
    ) ||
    pathname.startsWith(
      "/forgot-password",
    ) ||
    pathname.startsWith(
      "/reset-password",
    ) ||
    pathname.startsWith(
      "/invite",
    );

  const isPublicRoute =
    isAuthenticationRoute ||
    isAccountDisabledRoute ||
    pathname.startsWith(
      "/auth",
    );

  if (
    !user &&
    !isPublicRoute &&
    !isApiRoute
  ) {
    const url =
      request.nextUrl.clone();

    url.pathname = "/login";

    url.searchParams.set(
      "redirect",
      pathname,
    );

    return copyCookies(
      response,
      NextResponse.redirect(url),
    );
  }

  if (!user) {
    return response;
  }

  const {
    data: accountRows,
    error: accountError,
  } = await supabase.rpc(
    "get_my_account_status",
  );

  const account =
    accountRows?.[0] as
      | AccountStatus
      | undefined;

  /*
   * Usuário autenticado, mas sem vínculo
   * válido na aplicação.
   */
  if (
    accountError ||
    !account
  ) {
    console.error(
      "Conta autenticada sem contexto válido:",
      {
        userId: user.id,
        code:
          accountError?.code,
        message:
          accountError?.message,
      },
    );

    if (isApiRoute) {
      return NextResponse.json(
        {
          error:
            "Conta sem vínculo empresarial válido.",
        },
        {
          status: 403,
        },
      );
    }

    if (
      !isAccountDisabledRoute
    ) {
      return redirectResponse(
        request,
        response,
        "/account-disabled",
      );
    }

    return response;
  }

  /*
   * Uma sessão antiga não continua
   * acessando o sistema depois que o
   * administrador desativa o usuário.
   */
  if (!account.active) {
    if (isApiRoute) {
      return NextResponse.json(
        {
          error:
            "Conta desativada.",
        },
        {
          status: 403,
        },
      );
    }

    if (
      !isAccountDisabledRoute
    ) {
      return redirectResponse(
        request,
        response,
        "/account-disabled",
      );
    }

    return response;
  }

  /*
   * Usuário reativado não precisa ficar
   * preso na tela de conta desativada.
   */
  if (
    isAccountDisabledRoute
  ) {
    return redirectResponse(
      request,
      response,
      "/",
    );
  }

  /*
   * Usuário autenticado não abre novamente
   * login, cadastro ou convite.
   */
  if (
    isAuthenticationRoute
  ) {
    return redirectResponse(
      request,
      response,
      "/",
    );
  }

  return response;
}