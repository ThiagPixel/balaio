import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../models/member.dart';
import '../../theme/app_colors.dart';
import '../../widgets/ui/app_badge.dart';
import '../../widgets/ui/app_button.dart';
import '../../widgets/ui/app_card.dart';
import '../../widgets/ui/app_input.dart';

class MembersPage extends StatefulWidget {
  final VoidCallback onBackToSettings;

  const MembersPage({
    super.key,
    required this.onBackToSettings,
  });

  @override
  State<MembersPage> createState() => _MembersPageState();
}

class _MembersPageState extends State<MembersPage> {
  static const currentUserId = 'owner-1';

  static const List<PermissionItem> permissions = [
    PermissionItem(
      key: 'dashboard.view',
      module: 'dashboard',
      name: 'Visualizar dashboard',
      description: 'Permite acessar a visão geral da empresa.',
      sortOrder: 10,
    ),
    PermissionItem(
      key: 'dashboard.view_financial',
      module: 'dashboard',
      name: 'Ver resumo financeiro',
      description: 'Exibe informações financeiras no dashboard.',
      sortOrder: 20,
    ),
    PermissionItem(
      key: 'dashboard.view_stock',
      module: 'dashboard',
      name: 'Ver resumo de estoque',
      description: 'Exibe informações de estoque no dashboard.',
      sortOrder: 30,
    ),
    PermissionItem(
      key: 'products.view',
      module: 'products',
      name: 'Visualizar produtos',
      description: 'Permite acessar a lista de produtos.',
      sortOrder: 40,
    ),
    PermissionItem(
      key: 'products.view_cost',
      module: 'products',
      name: 'Ver preço de custo',
      description: 'Permite visualizar custos dos produtos.',
      sortOrder: 50,
    ),
    PermissionItem(
      key: 'products.create',
      module: 'products',
      name: 'Criar produtos',
      description: 'Permite cadastrar novos produtos.',
      sortOrder: 60,
    ),
    PermissionItem(
      key: 'products.update',
      module: 'products',
      name: 'Editar produtos',
      description: 'Permite alterar dados dos produtos.',
      sortOrder: 70,
    ),
    PermissionItem(
      key: 'products.toggle_active',
      module: 'products',
      name: 'Ativar/desativar produtos',
      description: 'Permite alterar o status dos produtos.',
      sortOrder: 80,
    ),
    PermissionItem(
      key: 'products.delete',
      module: 'products',
      name: 'Excluir produtos',
      description: 'Permite remover produtos.',
      sortOrder: 90,
    ),
    PermissionItem(
      key: 'stock.view',
      module: 'stock',
      name: 'Visualizar estoque',
      description: 'Permite acessar as movimentações de estoque.',
      sortOrder: 100,
    ),
    PermissionItem(
      key: 'stock.in',
      module: 'stock',
      name: 'Registrar entrada',
      description: 'Permite registrar entradas de estoque.',
      sortOrder: 110,
    ),
    PermissionItem(
      key: 'stock.out',
      module: 'stock',
      name: 'Registrar saída',
      description: 'Permite registrar saídas de estoque.',
      sortOrder: 120,
    ),
    PermissionItem(
      key: 'stock.adjust',
      module: 'stock',
      name: 'Ajustar estoque',
      description: 'Permite ajustar o estoque por inventário.',
      sortOrder: 130,
    ),
    PermissionItem(
      key: 'finance.view',
      module: 'finance',
      name: 'Visualizar financeiro',
      description: 'Permite acessar contas a pagar e a receber.',
      sortOrder: 140,
    ),
    PermissionItem(
      key: 'finance.create',
      module: 'finance',
      name: 'Criar lançamentos',
      description: 'Permite criar receitas e despesas.',
      sortOrder: 150,
    ),
    PermissionItem(
      key: 'finance.settle',
      module: 'finance',
      name: 'Marcar como pago',
      description: 'Permite liquidar lançamentos financeiros.',
      sortOrder: 160,
    ),
    PermissionItem(
      key: 'finance.reopen',
      module: 'finance',
      name: 'Reabrir lançamentos',
      description: 'Permite voltar um lançamento pago para pendente.',
      sortOrder: 170,
    ),
    PermissionItem(
      key: 'finance.cancel',
      module: 'finance',
      name: 'Cancelar lançamentos',
      description: 'Permite cancelar lançamentos financeiros.',
      sortOrder: 180,
    ),
    PermissionItem(
      key: 'finance.delete',
      module: 'finance',
      name: 'Excluir lançamentos',
      description: 'Permite excluir lançamentos financeiros.',
      sortOrder: 190,
    ),
    PermissionItem(
      key: 'settings.view',
      module: 'settings',
      name: 'Visualizar configurações',
      description: 'Permite acessar as configurações da empresa.',
      sortOrder: 200,
    ),
    PermissionItem(
      key: 'settings.update',
      module: 'settings',
      name: 'Editar configurações',
      description: 'Permite alterar dados da empresa.',
      sortOrder: 210,
    ),
    PermissionItem(
      key: 'members.view',
      module: 'members',
      name: 'Visualizar usuários',
      description: 'Permite acessar usuários e permissões.',
      sortOrder: 220,
    ),
    PermissionItem(
      key: 'members.invite',
      module: 'members',
      name: 'Convidar usuários',
      description: 'Permite gerar convites para novos usuários.',
      sortOrder: 230,
    ),
    PermissionItem(
      key: 'members.permissions',
      module: 'members',
      name: 'Gerenciar permissões',
      description: 'Permite alterar permissões de outros membros.',
      sortOrder: 240,
    ),
    PermissionItem(
      key: 'members.deactivate',
      module: 'members',
      name: 'Ativar/desativar usuários',
      description: 'Permite bloquear ou restaurar o acesso de membros.',
      sortOrder: 250,
    ),
  ];

  late final List<AppMember> members;
  late final List<MemberInvitation> invitations;

  @override
  void initState() {
    super.initState();

    members = [
      AppMember(
        id: currentUserId,
        email: 'admin@empresa.com',
        fullName: 'Administrador',
        role: 'owner',
        active: true,
        createdAt: DateTime.now().subtract(
          const Duration(days: 180),
        ),
        permissions: permissions.map((item) => item.key).toSet(),
      ),
      AppMember(
        id: 'member-2',
        email: 'joao@empresa.com',
        fullName: 'João Silva',
        role: 'member',
        active: true,
        createdAt: DateTime.now().subtract(
          const Duration(days: 70),
        ),
        permissions: {
          'dashboard.view',
          'dashboard.view_stock',
          'products.view',
          'stock.view',
          'stock.in',
          'stock.out',
        },
      ),
      AppMember(
        id: 'member-3',
        email: 'maria@empresa.com',
        fullName: 'Maria Souza',
        role: 'member',
        active: false,
        createdAt: DateTime.now().subtract(
          const Duration(days: 30),
        ),
        permissions: {
          'dashboard.view',
          'products.view',
          'finance.view',
        },
      ),
    ];

    invitations = [
      MemberInvitation(
        id: 'invite-1',
        email: 'novo@empresa.com',
        status: 'PENDING',
        permissionKeys: {
          'dashboard.view',
          'products.view',
          'stock.view',
        },
        createdAt: DateTime.now().subtract(
          const Duration(days: 1),
        ),
        expiresAt: DateTime.now().add(
          const Duration(days: 6),
        ),
        invitePath: '/invite/mock-pending-token',
      ),
      MemberInvitation(
        id: 'invite-2',
        email: 'aceito@empresa.com',
        status: 'ACCEPTED',
        permissionKeys: {
          'dashboard.view',
          'products.view',
        },
        createdAt: DateTime.now().subtract(
          const Duration(days: 15),
        ),
        expiresAt: DateTime.now().subtract(
          const Duration(days: 8),
        ),
        acceptedAt: DateTime.now().subtract(
          const Duration(days: 13),
        ),
        invitePath: '/invite/mock-accepted-token',
      ),
    ];
  }

  String _createInvitation(
    String email,
    Set<String> selectedPermissions,
  ) {
    final now = DateTime.now();
    final token = now.microsecondsSinceEpoch.toString();
    final path = '/invite/$token';

    setState(() {
      invitations.insert(
        0,
        MemberInvitation(
          id: 'invite-$token',
          email: email,
          status: 'PENDING',
          permissionKeys: Set<String>.from(selectedPermissions),
          createdAt: now,
          expiresAt: now.add(
            const Duration(days: 7),
          ),
          invitePath: path,
        ),
      );
    });

    return path;
  }

  Future<void> _revokeInvitation(
    MemberInvitation invitation,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Revogar convite?'),
          content: const Text(
            'O link deixará de funcionar.',
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(context, false);
              },
              child: const Text('Cancelar'),
            ),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.red600,
              ),
              onPressed: () {
                Navigator.pop(context, true);
              },
              child: const Text('Revogar'),
            ),
          ],
        );
      },
    );

    if (confirmed != true) return;

    setState(() {
      invitation.status = 'REVOKED';
      invitation.revokedAt = DateTime.now();
    });

    _message('Convite revogado.');
  }

  Future<void> _toggleMemberActive(
    AppMember member,
  ) async {
    final nextActive = !member.active;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text(
            nextActive
                ? 'Ativar este usuário?'
                : 'Desativar este usuário?',
          ),
          content: Text(
            nextActive
                ? 'O usuário voltará a ter acesso à empresa.'
                : 'O usuário perderá o acesso à empresa.',
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(context, false);
              },
              child: const Text('Cancelar'),
            ),
            FilledButton(
              style: nextActive
                  ? null
                  : FilledButton.styleFrom(
                      backgroundColor: AppColors.red600,
                    ),
              onPressed: () {
                Navigator.pop(context, true);
              },
              child: Text(
                nextActive ? 'Ativar' : 'Desativar',
              ),
            ),
          ],
        );
      },
    );

    if (confirmed != true) return;

    setState(() {
      member.active = nextActive;
    });

    _message(
      nextActive
          ? 'Usuário ativado.'
          : 'Usuário desativado.',
    );
  }

  void _savePermissions(
    AppMember member,
    Set<String> selected,
  ) {
    setState(() {
      member.permissions = Set<String>.from(selected);
    });

    _message('Permissões atualizadas.');
  }

  void _message(String text) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(text),
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: AppColors.slate50,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _PageHeader(
              onBack: widget.onBackToSettings,
            ),
            const SizedBox(height: 24),
            AppCard(
              title: 'Convidar funcionário',
              description:
                  'Gere um link de acesso e escolha as permissões iniciais do usuário',
              child: _InviteMemberForm(
                permissions: permissions,
                onCreate: _createInvitation,
              ),
            ),
            if (invitations.isNotEmpty) ...[
              const SizedBox(height: 24),
              AppCard(
                title: 'Convites',
                description:
                    'Convites recentes gerados para esta empresa',
                child: _InvitationsList(
                  invitations: invitations,
                  onRevoke: _revokeInvitation,
                ),
              ),
            ],
            const SizedBox(height: 24),
            Text(
              'Usuários da empresa',
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: AppColors.slate900,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              '${members.length} usuário(s) vinculado(s)',
              style: const TextStyle(
                fontSize: 14,
                color: AppColors.slate500,
              ),
            ),
            const SizedBox(height: 16),
            if (members.isEmpty)
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: AppColors.slate200,
                  ),
                ),
                child: const Text(
                  'Nenhum usuário encontrado.',
                  style: TextStyle(
                    fontSize: 14,
                    color: AppColors.slate500,
                  ),
                ),
              )
            else
              ...members.map(
                (member) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _MemberAccordion(
                    member: member,
                    currentUserId: currentUserId,
                    permissions: permissions,
                    onToggleActive: () {
                      _toggleMemberActive(member);
                    },
                    onSavePermissions: (selected) {
                      _savePermissions(member, selected);
                    },
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _PageHeader extends StatelessWidget {
  final VoidCallback onBack;

  const _PageHeader({
    required this.onBack,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextButton(
          onPressed: onBack,
          style: TextButton.styleFrom(
            padding: EdgeInsets.zero,
            minimumSize: Size.zero,
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
          child: const Text(
            '← Voltar para configurações',
            style: TextStyle(
              fontSize: 14,
              color: AppColors.slate500,
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Usuários e permissões',
          style: Theme.of(context)
              .textTheme
              .headlineMedium
              ?.copyWith(
                fontWeight: FontWeight.w700,
                color: AppColors.slate900,
              ),
        ),
        const SizedBox(height: 4),
        const Text(
          'Controle quem pode acessar cada área da empresa',
          style: TextStyle(
            fontSize: 14,
            color: AppColors.slate500,
          ),
        ),
      ],
    );
  }
}

typedef CreateInvitationCallback = String Function(
  String email,
  Set<String> permissions,
);

class _InviteMemberForm extends StatefulWidget {
  final List<PermissionItem> permissions;
  final CreateInvitationCallback onCreate;

  const _InviteMemberForm({
    required this.permissions,
    required this.onCreate,
  });

  @override
  State<_InviteMemberForm> createState() =>
      _InviteMemberFormState();
}

class _InviteMemberFormState
    extends State<_InviteMemberForm> {
  final emailController = TextEditingController();

  final Set<String> selectedPermissions = <String>{};

  String? emailError;
  String? invitePath;
  bool copied = false;

  @override
  void dispose() {
    emailController.dispose();
    super.dispose();
  }

  bool _validEmail(String value) {
    final regex = RegExp(
      r'^[^@\s]+@[^@\s]+\.[^@\s]+$',
    );

    return regex.hasMatch(value);
  }

  void _toggleAll() {
    setState(() {
      if (selectedPermissions.length ==
          widget.permissions.length) {
        selectedPermissions.clear();
      } else {
        selectedPermissions
          ..clear()
          ..addAll(
            widget.permissions.map(
              (item) => item.key,
            ),
          );
      }
    });
  }

  void _submit() {
    final email =
        emailController.text.trim().toLowerCase();

    if (!_validEmail(email)) {
      setState(() {
        emailError = 'Informe um e-mail válido';
      });
      return;
    }

    final path = widget.onCreate(
      email,
      Set<String>.from(selectedPermissions),
    );

    setState(() {
      emailError = null;
      invitePath = path;
      copied = false;
    });
  }

  Future<void> _copyLink() async {
    final path = invitePath;
    if (path == null) return;

    await Clipboard.setData(
      ClipboardData(text: path),
    );

    if (!mounted) return;

    setState(() {
      copied = true;
    });

    await Future<void>.delayed(
      const Duration(seconds: 2),
    );

    if (!mounted) return;

    setState(() {
      copied = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (invitePath != null) ...[
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFECFDF5),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(
                color: const Color(0xFFA7F3D0),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Convite criado. Copie o link antes de sair desta página.',
                  style: TextStyle(
                    fontSize: 14,
                    color: Color(0xFF047857),
                  ),
                ),
                const SizedBox(height: 12),
                LayoutBuilder(
                  builder: (context, constraints) {
                    final compact =
                        constraints.maxWidth < 500;

                    final linkBox = Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: const Color(0xFFA7F3D0),
                        ),
                      ),
                      child: SelectableText(
                        invitePath!,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.slate700,
                          fontFamily: 'monospace',
                        ),
                      ),
                    );

                    final copyButton = OutlinedButton(
                      onPressed: _copyLink,
                      child: Text(
                        copied
                            ? 'Link copiado'
                            : 'Copiar link',
                      ),
                    );

                    if (compact) {
                      return Column(
                        crossAxisAlignment:
                            CrossAxisAlignment.stretch,
                        children: [
                          linkBox,
                          const SizedBox(height: 8),
                          copyButton,
                        ],
                      );
                    }

                    return Row(
                      children: [
                        Expanded(child: linkBox),
                        const SizedBox(width: 8),
                        copyButton,
                      ],
                    );
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
        ],
        AppInput(
          label: 'E-mail do funcionário *',
          placeholder: 'funcionario@empresa.com',
          controller: emailController,
          keyboardType: TextInputType.emailAddress,
          error: emailError,
        ),
        const SizedBox(height: 20),
        const Text(
          'Permissões iniciais',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AppColors.slate900,
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'Estas permissões serão aplicadas quando o funcionário aceitar o convite.',
          style: TextStyle(
            fontSize: 12,
            color: AppColors.slate500,
          ),
        ),
        const SizedBox(height: 16),
        Align(
          alignment: Alignment.centerRight,
          child: OutlinedButton(
            onPressed: _toggleAll,
            child: Text(
              selectedPermissions.length ==
                      widget.permissions.length
                  ? 'Desmarcar todas'
                  : 'Marcar todas',
            ),
          ),
        ),
        const SizedBox(height: 16),
        _PermissionsGrid(
          permissions: widget.permissions,
          selected: selectedPermissions,
          enabled: true,
          onToggle: (key, checked) {
            setState(() {
              if (checked) {
                selectedPermissions.add(key);
              } else {
                selectedPermissions.remove(key);
              }
            });
          },
        ),
        const SizedBox(height: 20),
        Align(
          alignment: Alignment.centerRight,
          child: AppButton(
            text: 'Gerar link de convite',
            onPressed: _submit,
          ),
        ),
      ],
    );
  }
}

class _InvitationsList extends StatelessWidget {
  final List<MemberInvitation> invitations;
  final ValueChanged<MemberInvitation> onRevoke;

  const _InvitationsList({
    required this.invitations,
    required this.onRevoke,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: invitations.map((invitation) {
        return Container(
          padding: const EdgeInsets.symmetric(
            vertical: 12,
          ),
          decoration: const BoxDecoration(
            border: Border(
              bottom: BorderSide(
                color: AppColors.slate100,
              ),
            ),
          ),
          child: LayoutBuilder(
            builder: (context, constraints) {
              final info = Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    invitation.email,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: AppColors.slate900,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Criado em ${_formatDateTime(invitation.createdAt)}',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.slate500,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Expira em ${_formatDateTime(invitation.expiresAt)}',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.slate500,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${invitation.permissionKeys.length} permissão(ões) selecionada(s)',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.slate500,
                    ),
                  ),
                ],
              );

              final actions = Wrap(
                spacing: 12,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  _InvitationBadge(
                    status: invitation.status,
                  ),
                  if (invitation.isPending)
                    TextButton(
                      onPressed: () {
                        onRevoke(invitation);
                      },
                      child: const Text(
                        'Revogar',
                        style: TextStyle(
                          color: AppColors.red600,
                        ),
                      ),
                    ),
                ],
              );

              if (constraints.maxWidth < 550) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    info,
                    const SizedBox(height: 12),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: actions,
                    ),
                  ],
                );
              }

              return Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(child: info),
                  const SizedBox(width: 16),
                  actions,
                ],
              );
            },
          ),
        );
      }).toList(),
    );
  }
}

class _InvitationBadge extends StatelessWidget {
  final String status;

  const _InvitationBadge({
    required this.status,
  });

  @override
  Widget build(BuildContext context) {
    switch (status) {
      case 'PENDING':
        return const AppBadge(
          text: 'Pendente',
          variant: AppBadgeVariant.warning,
        );
      case 'ACCEPTED':
        return const AppBadge(
          text: 'Aceito',
          variant: AppBadgeVariant.success,
        );
      case 'EXPIRED':
        return const AppBadge(
          text: 'Expirado',
        );
      case 'REVOKED':
      default:
        return const AppBadge(
          text: 'Revogado',
        );
    }
  }
}

class _MemberAccordion extends StatelessWidget {
  final AppMember member;
  final String currentUserId;
  final List<PermissionItem> permissions;
  final VoidCallback onToggleActive;
  final ValueChanged<Set<String>> onSavePermissions;

  const _MemberAccordion({
    required this.member,
    required this.currentUserId,
    required this.permissions,
    required this.onToggleActive,
    required this.onSavePermissions,
  });

  @override
  Widget build(BuildContext context) {
    final displayName =
        member.fullName ?? member.email;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: AppColors.slate200,
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0D000000),
            offset: Offset(0, 1),
            blurRadius: 2,
          ),
        ],
      ),
      child: ExpansionTile(
        key: PageStorageKey<String>(
          'member-${member.id}',
        ),
        maintainState: true,
        tilePadding: const EdgeInsets.symmetric(
          horizontal: 20,
          vertical: 4,
        ),
        childrenPadding: const EdgeInsets.fromLTRB(
          20,
          0,
          20,
          20,
        ),
        collapsedBackgroundColor: Colors.white,
        backgroundColor: Colors.white,
        collapsedShape: const Border(),
        shape: const Border(),
        title: Wrap(
          spacing: 8,
          runSpacing: 6,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            Text(
              displayName,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: AppColors.slate900,
              ),
            ),
            if (member.id == currentUserId)
              const Text(
                '(você)',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w400,
                  color: AppColors.slate500,
                ),
              ),
            AppBadge(
              text: member.isOwner
                  ? 'Proprietário'
                  : 'Membro',
              variant: member.isOwner
                  ? AppBadgeVariant.info
                  : AppBadgeVariant.normal,
            ),
            AppBadge(
              text: member.active
                  ? 'Ativo'
                  : 'Inativo',
              variant: member.active
                  ? AppBadgeVariant.success
                  : AppBadgeVariant.normal,
            ),
          ],
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Text(
            member.email,
            style: const TextStyle(
              fontSize: 14,
              color: AppColors.slate500,
            ),
          ),
        ),
        children: [
          const Divider(height: 24),
          if (member.isOwner)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.slate50,
                borderRadius: BorderRadius.circular(6),
              ),
              child: const Text(
                'O proprietário possui acesso total e suas permissões não podem ser removidas.',
                style: TextStyle(
                  fontSize: 14,
                  color: AppColors.slate600,
                ),
              ),
            )
          else ...[
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: onToggleActive,
                child: Text(
                  member.active
                      ? 'Desativar usuário'
                      : 'Ativar usuário',
                  style: TextStyle(
                    color: member.active
                        ? AppColors.red600
                        : const Color(0xFF059669),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            _MemberPermissionsEditor(
              key: ValueKey<String>(
                'permissions-${member.id}',
              ),
              member: member,
              permissions: permissions,
              onSave: onSavePermissions,
            ),
          ],
        ],
      ),
    );
  }
}

class _MemberPermissionsEditor extends StatefulWidget {
  final AppMember member;
  final List<PermissionItem> permissions;
  final ValueChanged<Set<String>> onSave;

  const _MemberPermissionsEditor({
    super.key,
    required this.member,
    required this.permissions,
    required this.onSave,
  });

  @override
  State<_MemberPermissionsEditor> createState() =>
      _MemberPermissionsEditorState();
}

class _MemberPermissionsEditorState
    extends State<_MemberPermissionsEditor> {
  late Set<String> selected;

  @override
  void initState() {
    super.initState();
    selected = Set<String>.from(
      widget.member.permissions,
    );
  }

  void _toggleAll() {
    setState(() {
      if (selected.length ==
          widget.permissions.length) {
        selected.clear();
      } else {
        selected
          ..clear()
          ..addAll(
            widget.permissions.map(
              (item) => item.key,
            ),
          );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Align(
          alignment: Alignment.centerRight,
          child: OutlinedButton(
            onPressed: _toggleAll,
            child: Text(
              selected.length ==
                      widget.permissions.length
                  ? 'Desmarcar todas'
                  : 'Marcar todas',
            ),
          ),
        ),
        const SizedBox(height: 16),
        _PermissionsGrid(
          permissions: widget.permissions,
          selected: selected,
          enabled: true,
          onToggle: (key, checked) {
            setState(() {
              if (checked) {
                selected.add(key);
              } else {
                selected.remove(key);
              }
            });
          },
        ),
        const SizedBox(height: 20),
        Align(
          alignment: Alignment.centerRight,
          child: AppButton(
            text: 'Salvar permissões',
            onPressed: () {
              widget.onSave(
                Set<String>.from(selected),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _PermissionsGrid extends StatelessWidget {
  final List<PermissionItem> permissions;
  final Set<String> selected;
  final bool enabled;
  final void Function(
    String key,
    bool checked,
  ) onToggle;

  const _PermissionsGrid({
    required this.permissions,
    required this.selected,
    required this.enabled,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    final grouped =
        <String, List<PermissionItem>>{};

    for (final permission in permissions) {
      grouped
          .putIfAbsent(
            permission.module,
            () => <PermissionItem>[],
          )
          .add(permission);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final entry in grouped.entries) ...[
          Text(
            _moduleLabel(entry.key),
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppColors.slate900,
            ),
          ),
          const SizedBox(height: 10),
          LayoutBuilder(
            builder: (context, constraints) {
              final columns =
                  constraints.maxWidth >= 600 ? 2 : 1;

              const gap = 12.0;

              final width =
                  (constraints.maxWidth -
                          gap * (columns - 1)) /
                      columns;

              return Wrap(
                spacing: gap,
                runSpacing: gap,
                children: entry.value.map((permission) {
                  return SizedBox(
                    width: width,
                    child: _PermissionTile(
                      permission: permission,
                      selected: selected.contains(
                        permission.key,
                      ),
                      enabled: enabled,
                      onChanged: (checked) {
                        onToggle(
                          permission.key,
                          checked,
                        );
                      },
                    ),
                  );
                }).toList(),
              );
            },
          ),
          const SizedBox(height: 20),
        ],
      ],
    );
  }
}

class _PermissionTile extends StatelessWidget {
  final PermissionItem permission;
  final bool selected;
  final bool enabled;
  final ValueChanged<bool> onChanged;

  const _PermissionTile({
    required this.permission,
    required this.selected,
    required this.enabled,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(6),
      child: InkWell(
        onTap: enabled
            ? () {
                onChanged(!selected);
              }
            : null,
        borderRadius: BorderRadius.circular(6),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(6),
            border: Border.all(
              color: AppColors.slate200,
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: 22,
                height: 22,
                child: Checkbox(
                  value: selected,
                  onChanged: enabled
                      ? (value) {
                          onChanged(value ?? false);
                        }
                      : null,
                  visualDensity: VisualDensity.compact,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment:
                      CrossAxisAlignment.start,
                  children: [
                    Text(
                      permission.name,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: AppColors.slate900,
                      ),
                    ),
                    if (permission.description != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        permission.description!,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.slate500,
                        ),
                      ),
                    ],
                    const SizedBox(height: 4),
                    Text(
                      permission.key,
                      style: const TextStyle(
                        fontSize: 10,
                        color: AppColors.slate400,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

String _moduleLabel(String module) {
  switch (module) {
    case 'dashboard':
      return 'Dashboard';
    case 'products':
      return 'Produtos';
    case 'stock':
      return 'Estoque';
    case 'finance':
      return 'Financeiro';
    case 'settings':
      return 'Configurações';
    case 'members':
      return 'Usuários';
    default:
      return module;
  }
}

String _formatDateTime(DateTime value) {
  String two(int number) {
    return number.toString().padLeft(2, '0');
  }

  return '${two(value.day)}/${two(value.month)}/${value.year} '
      '${two(value.hour)}:${two(value.minute)}';
}
