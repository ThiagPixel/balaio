import 'package:flutter/material.dart';

import '../../models/company_settings.dart';
import '../../theme/app_colors.dart';
import '../../widgets/ui/app_badge.dart';
import '../../widgets/ui/app_button.dart';
import '../../widgets/ui/app_card.dart';
import '../../widgets/ui/app_input.dart';

class SettingsPage extends StatefulWidget {
  final VoidCallback onOpenMembers;

  const SettingsPage({
    super.key,
    required this.onOpenMembers,
  });

  @override
  State<SettingsPage> createState() =>
      _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  final CompanySettings company = CompanySettings(
    id: 'company-1',
    name: 'Minha empresa',
    slug: 'minha-empresa',
    createdAt: DateTime.now().subtract(
      const Duration(days: 180),
    ),
  );

  final List<CompanyMemberSummary> members = const [
    CompanyMemberSummary(
      id: 'owner-1',
      email: 'admin@empresa.com',
      fullName: 'Administrador',
      role: 'owner',
      active: true,
      isCurrentUser: true,
    ),
    CompanyMemberSummary(
      id: 'member-2',
      email: 'joao@empresa.com',
      fullName: 'João Silva',
      role: 'member',
      active: true,
    ),
    CompanyMemberSummary(
      id: 'member-3',
      email: 'maria@empresa.com',
      fullName: 'Maria Souza',
      role: 'member',
      active: false,
    ),
  ];

  // Mock temporário. Depois vem de SETTINGS_UPDATE.
  final bool canUpdate = true;

  // Mock temporário. Depois vem de MEMBERS_VIEW.
  final bool canViewMembers = true;

  void _saveCompany({
    required String name,
    required String slug,
  }) {
    setState(() {
      company.name = name;
      company.slug = slug;
    });
  }

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: AppColors.slate50,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment:
              CrossAxisAlignment.stretch,
          children: [
            Text(
              'Configurações',
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
              'Dados da empresa e usuários',
              style: TextStyle(
                fontSize: 14,
                color: AppColors.slate500,
              ),
            ),
            const SizedBox(height: 24),
            _TenantForm(
              company: company,
              canUpdate: canUpdate,
              onSave: _saveCompany,
            ),
            if (canViewMembers) ...[
              const SizedBox(height: 24),
              AppCard(
                title: 'Usuários',
                description:
                    '${members.length} usuário(s) vinculado(s) a esta empresa',
                child: Column(
                  crossAxisAlignment:
                      CrossAxisAlignment.stretch,
                  children: [
                    if (members.isEmpty)
                      const Text(
                        'Nenhum usuário encontrado.',
                        style: TextStyle(
                          fontSize: 14,
                          color: AppColors.slate500,
                        ),
                      )
                    else
                      ...members.map(
                        (member) => _MemberRow(
                          member: member,
                        ),
                      ),
                    const SizedBox(height: 16),
                    const Text(
                      'O gerenciamento completo de usuários e convites fica na tela de Usuários e permissões.',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.slate500,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Align(
                alignment: Alignment.centerLeft,
                child: OutlinedButton(
                  onPressed: widget.onOpenMembers,
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(0, 40),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                    ),
                    foregroundColor: AppColors.slate700,
                    side: const BorderSide(
                      color: AppColors.slate300,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(6),
                    ),
                  ),
                  child: const Text(
                    'Gerenciar usuários e permissões',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

typedef SaveCompanyCallback = void Function({
  required String name,
  required String slug,
});

class _TenantForm extends StatefulWidget {
  final CompanySettings company;
  final bool canUpdate;
  final SaveCompanyCallback onSave;

  const _TenantForm({
    required this.company,
    required this.canUpdate,
    required this.onSave,
  });

  @override
  State<_TenantForm> createState() =>
      _TenantFormState();
}

class _TenantFormState extends State<_TenantForm> {
  late final TextEditingController nameController;
  late final TextEditingController slugController;

  bool slugDirty = false;
  bool saved = false;

  String? nameError;
  String? slugError;

  @override
  void initState() {
    super.initState();

    nameController = TextEditingController(
      text: widget.company.name,
    );

    slugController = TextEditingController(
      text: widget.company.slug,
    );
  }

  @override
  void dispose() {
    nameController.dispose();
    slugController.dispose();
    super.dispose();
  }

  void _handleNameChanged(String value) {
    if (!widget.canUpdate) return;

    setState(() {
      saved = false;
      nameError = null;

      if (!slugDirty) {
        slugController.text = _slugify(value);
        slugError = null;
      }
    });
  }

  void _handleSlugChanged(String value) {
    if (!widget.canUpdate) return;

    setState(() {
      saved = false;
      slugDirty = true;
      slugError = null;
    });
  }

  void _save() {
    if (!widget.canUpdate) return;

    final name = nameController.text.trim();

    final slug = slugController.text
        .trim()
        .toLowerCase();

    String? nextNameError;
    String? nextSlugError;

    if (name.length < 2) {
      nextNameError =
          'O nome deve possuir pelo menos 2 caracteres';
    } else if (name.length > 120) {
      nextNameError =
          'O nome deve possuir no máximo 120 caracteres';
    }

    if (slug.length < 2) {
      nextSlugError =
          'O identificador deve possuir pelo menos 2 caracteres';
    } else if (slug.length > 63) {
      nextSlugError =
          'O identificador deve possuir no máximo 63 caracteres';
    } else if (!RegExp(
      r'^[a-z0-9]+(?:-[a-z0-9]+)*$',
    ).hasMatch(slug)) {
      nextSlugError =
          'Use apenas letras minúsculas, números e hífens';
    }

    setState(() {
      nameError = nextNameError;
      slugError = nextSlugError;
      saved = false;
    });

    if (nextNameError != null ||
        nextSlugError != null) {
      return;
    }

    widget.onSave(
      name: name,
      slug: slug,
    );

    setState(() {
      saved = true;
      slugController.text = slug;
    });
  }

  @override
  Widget build(BuildContext context) {
    return AppCard(
      title: 'Dados da empresa',
      description:
          'Como sua empresa aparece no sistema',
      child: Column(
        crossAxisAlignment:
            CrossAxisAlignment.stretch,
        children: [
          if (saved) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFECFDF5),
                borderRadius: BorderRadius.circular(6),
              ),
              child: const Text(
                'Dados da empresa atualizados.',
                style: TextStyle(
                  fontSize: 14,
                  color: Color(0xFF047857),
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],
          if (!widget.canUpdate) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.slate50,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(
                  color: AppColors.slate200,
                ),
              ),
              child: const Text(
                'Você pode visualizar os dados, mas não possui permissão para alterá-los.',
                style: TextStyle(
                  fontSize: 14,
                  color: AppColors.slate600,
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],
          AppInput(
            label: 'Nome da empresa *',
            controller: nameController,
            enabled: widget.canUpdate,
            error: nameError,
            onChanged: _handleNameChanged,
          ),
          const SizedBox(height: 16),
          AppInput(
            label: 'Identificador (slug)',
            controller: slugController,
            enabled: widget.canUpdate,
            error: slugError,
            onChanged: _handleSlugChanged,
            hint:
                'Usado em URLs e identificadores. Apenas letras minúsculas, números e hífens.',
          ),
          if (widget.canUpdate) ...[
            const SizedBox(height: 20),
            Align(
              alignment: Alignment.centerRight,
              child: AppButton(
                text: 'Salvar alterações',
                onPressed: _save,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _MemberRow extends StatelessWidget {
  final CompanyMemberSummary member;

  const _MemberRow({
    required this.member,
  });

  @override
  Widget build(BuildContext context) {
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
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment:
                  CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 6,
                  crossAxisAlignment:
                      WrapCrossAlignment.center,
                  children: [
                    Text(
                      member.displayName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: AppColors.slate900,
                      ),
                    ),
                    if (member.isCurrentUser)
                      const Text(
                        '(você)',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.slate500,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 3),
                Text(
                  member.email,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.slate500,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Wrap(
            spacing: 8,
            runSpacing: 6,
            crossAxisAlignment:
                WrapCrossAlignment.center,
            children: [
              AppBadge(
                text: member.isOwner
                    ? 'Proprietário'
                    : 'Membro',
                variant: member.isOwner
                    ? AppBadgeVariant.info
                    : AppBadgeVariant.normal,
              ),
              if (!member.active)
                const AppBadge(
                  text: 'Inativo',
                ),
            ],
          ),
        ],
      ),
    );
  }
}

String _slugify(String text) {
  var value = text.toLowerCase().trim();

  const replacements = <String, String>{
    'á': 'a',
    'à': 'a',
    'ã': 'a',
    'â': 'a',
    'ä': 'a',
    'é': 'e',
    'è': 'e',
    'ê': 'e',
    'ë': 'e',
    'í': 'i',
    'ì': 'i',
    'î': 'i',
    'ï': 'i',
    'ó': 'o',
    'ò': 'o',
    'õ': 'o',
    'ô': 'o',
    'ö': 'o',
    'ú': 'u',
    'ù': 'u',
    'û': 'u',
    'ü': 'u',
    'ç': 'c',
    'ñ': 'n',
  };

  for (final entry in replacements.entries) {
    value = value.replaceAll(
      entry.key,
      entry.value,
    );
  }

  value = value
      .replaceAll(
        RegExp(r'[^a-z0-9\s-]'),
        '',
      )
      .replaceAll(
        RegExp(r'\s+'),
        '-',
      )
      .replaceAll(
        RegExp(r'-+'),
        '-',
      )
      .replaceAll(
        RegExp(r'^-+|-+$'),
        '',
      );

  return value;
}
