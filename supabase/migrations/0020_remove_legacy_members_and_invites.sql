begin;

-- Função antiga de criação de empresa.
-- O cadastro atual utiliza handle_new_company_user().
drop function if exists
  public.create_tenant_with_admin(
    text,
    text,
    uuid,
    text,
    text
  );

-- Funções antigas de administração de membros.
drop function if exists
  public.set_user_permissions(
    uuid,
    text[]
  );

drop function if exists
  public.set_member_active(
    uuid,
    boolean
  );

-- Estrutura antiga de convites.
-- O fluxo atual utiliza private.member_invitations.
drop table if exists
  private.invitation_permissions;

drop table if exists
  private.tenant_invitations;

commit;