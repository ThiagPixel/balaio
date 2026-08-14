class CompanySettings {
  final String id;
  String name;
  String slug;
  final DateTime createdAt;

  CompanySettings({
    required this.id,
    required this.name,
    required this.slug,
    required this.createdAt,
  });
}

class CompanyMemberSummary {
  final String id;
  final String email;
  final String? fullName;
  final String role;
  final bool active;
  final bool isCurrentUser;

  const CompanyMemberSummary({
    required this.id,
    required this.email,
    this.fullName,
    required this.role,
    required this.active,
    this.isCurrentUser = false,
  });

  bool get isOwner => role == 'owner';

  String get displayName => fullName ?? email;
}
