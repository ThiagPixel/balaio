class PermissionItem {
  final String key;
  final String module;
  final String name;
  final String? description;
  final int sortOrder;

  const PermissionItem({
    required this.key,
    required this.module,
    required this.name,
    this.description,
    required this.sortOrder,
  });
}

class AppMember {
  final String id;
  final String email;
  final String? fullName;
  final String role;
  bool active;
  final DateTime createdAt;
  Set<String> permissions;

  AppMember({
    required this.id,
    required this.email,
    this.fullName,
    required this.role,
    required this.active,
    required this.createdAt,
    Set<String>? permissions,
  }) : permissions = permissions ?? <String>{};

  bool get isOwner => role == 'owner';
}

class MemberInvitation {
  final String id;
  final String email;
  String status;
  final Set<String> permissionKeys;
  final DateTime expiresAt;
  final DateTime? acceptedAt;
  DateTime? revokedAt;
  final DateTime createdAt;
  final String invitePath;

  MemberInvitation({
    required this.id,
    required this.email,
    required this.status,
    required this.permissionKeys,
    required this.expiresAt,
    this.acceptedAt,
    this.revokedAt,
    required this.createdAt,
    required this.invitePath,
  });

  bool get isPending => status == 'PENDING';
}
